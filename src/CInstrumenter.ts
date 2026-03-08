import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class CInstrumenter {

    public instrument(sourceFilePath: string, tcpPort: number): string {
        const userCode = fs.readFileSync(sourceFilePath, 'utf-8');
        const instrumented = this.injectCalls(userCode);
        const preamble = this.buildPreamble(tcpPort);
        const full = `${preamble}\n/* ── User code: ${path.basename(sourceFilePath)} ── */\n${instrumented}`;
        const tmpPath = path.join(os.tmpdir(), '.cpulse_instrumented.c');
        fs.writeFileSync(tmpPath, full, 'utf-8');
        return tmpPath;
    }

    private injectCalls(source: string): string {
        const lines = source.split('\n');
        const out: string[] = [];
        const SKIP = ['if', 'while', 'for', 'return', 'else', 'sizeof', 'NULL', '0'];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const t = line.trim();
            const indent = line.match(/^(\s*)/)?.[1] ?? '';
            const ln = i + 1;

            out.push(line);

            if (!t || t.startsWith('//') || t.startsWith('#') || t.startsWith('*') || t.startsWith('/*')) continue;

            // ── free(var) → heap_free event ──────────────────────────────
            const freeMatch = t.match(/^free\s*\(\s*(\w+)\s*\)\s*;$/);
            if (freeMatch) {
                const v = freeMatch[1];
                out.push(`${indent}cpulse_heap_free((void*)(${v}), "${v}", ${ln});`);
                continue;
            }

            // ── malloc → heap_create event ────────────────────────────────
            // Matches: newNode = malloc(...) OR struct Node* newNode = (cast)malloc(...)
            const mallocMatch = t.match(/(\w+)\s*=\s*(?:\([^)]*\)\s*)?malloc\s*\(/);
            if (mallocMatch) {
                const v = mallocMatch[1];
                if (!SKIP.includes(v)) {
                    out.push(`${indent}if (${v}) cpulse_heap_create((void*)(${v}), "${v}", ${ln});`);
                    continue;
                }
            }

            // ── ptr->field = scalar (data, val, etc.) → field update ─────
            const fieldMatch = t.match(/^(\w+)\s*->\s*((?!next\b|left\b|right\b|prev\b)\w+)\s*=\s*([^;]+);$/);
            if (fieldMatch) {
                const [, pv, field, value] = fieldMatch;
                if (!SKIP.includes(pv)) {
                    out.push(`${indent}cpulse_field_str((void*)(${pv}), "${pv}", "${field}", (long long)(${value}), ${ln});`);
                    continue;
                }
            }

            // ── ptr->next = ptr2->next  (pointer relink via another pointer's field) ─
            // e.g. curr->next = temp->next  →  read lhs->field after assignment
            const relinkMatch = t.match(/^(\w+)\s*->\s*(next|left|right|prev)\s*=\s*(\w+)\s*->\s*(next|left|right|prev)\s*;$/);
            if (relinkMatch) {
                const [, dstVar, dstField] = relinkMatch;
                // After the C line executes, dstVar->dstField == the new target (already set)
                out.push(`${indent}cpulse_ptr_link((void*)(${dstVar}), "${dstVar}", "${dstField}", (void*)(${dstVar}->${dstField}), "${dstVar}->${dstField}", ${ln});`);
                continue;
            }

            // ── ptr->next = other  (pointer link) ─────────────────────────
            const nexMatch = t.match(/^(\w+)\s*->\s*(next|left|right|prev)\s*=\s*(\w+)\s*;$/);
            if (nexMatch) {
                const [, sv, field, dv] = nexMatch;
                if (dv === 'NULL') {
                    out.push(`${indent}cpulse_ptr_link((void*)(${sv}), "${sv}", "${field}", NULL, "NULL", ${ln});`);
                } else {
                    out.push(`${indent}cpulse_ptr_link((void*)(${sv}), "${sv}", "${field}", (void*)(${dv}), "${dv}", ${ln});`);
                }
                continue;
            }

            // ── ptr->field = functionCall(...)  (pointer link via return value) ──
            // e.g. parent->left = createNode(newValue);
            const fnCallLinkMatch = t.match(/^(\w+)\s*->\s*(next|left|right|prev)\s*=\s*(\w+)\s*\(([^)]*)\)\s*;$/);
            if (fnCallLinkMatch) {
                const [, sv, field] = fnCallLinkMatch;
                // After the C line executes, sv->field holds the new pointer
                // We just read sv->field to emit the link event
                out.push(`${indent}cpulse_ptr_link((void*)(${sv}), "${sv}", "${field}", (void*)(${sv}->${field}), "${sv}->${field}", ${ln});`);
                continue;
            }

            // ── ptr = other / ptr = ptr->next / ptr = NULL ──────────────
            const ptrAsgn = t.match(/^(\w+)\s*=\s*(\w+)(?:->(?:next|left|right|prev))?\s*;$/);
            if (ptrAsgn) {
                const [, lhs, rhs] = ptrAsgn;
                const isNumeric = /^\d+$/.test(rhs);
                const isReserved = ['if', 'while', 'for', 'return', 'else', 'sizeof'].includes(rhs);
                if (!isNumeric && !isReserved && !SKIP.includes(lhs)) {
                    out.push(`${indent}cpulse_assignment("${lhs}", (void*)(${lhs}), ${ln});`);
                }
                continue;
            }

            // ── var = functionCall(...)  (pointer assignment from return value) ──
            // e.g. root = createNode(rootValue);  OR  result = search(root, key);
            const fnCallAsgn = t.match(/^(\w+)\s*=\s*(\w+)\s*\(([^)]*)\)\s*;$/);
            if (fnCallAsgn) {
                const [, lhs] = fnCallAsgn;
                const isReserved = ['if', 'while', 'for', 'return', 'else', 'sizeof'].includes(lhs);
                if (!isReserved && !SKIP.includes(lhs)) {
                    // After the function returns and the assignment is done, emit the assignment event
                    out.push(`${indent}if (${lhs}) cpulse_assignment("${lhs}", (void*)(${lhs}), ${ln});`);
                }
                continue;
            }
        }

        return out.join('\n');
    }

    private buildPreamble(port: number): string {
        return `/* === C-Pulse Live Preamble === */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <unistd.h>

#define CPULSE_MAX 1024
typedef struct { void* ptr; int id; } CpEntry;
static CpEntry __cp_reg[CPULSE_MAX];
static int     __cp_count   = 0;
static int     __cp_next_id = 1;
static int     __cp_ts      = 0;
static int     __cp_sock    = -1;

static int __cp_get(void* p) {
    for (int i = 0; i < __cp_count; i++)
        if (__cp_reg[i].ptr == p) return __cp_reg[i].id;
    return 0;
}
static int __cp_reg_ptr(void* p) {
    if (!p) return 0;
    int x = __cp_get(p); if (x) return x;
    int id = __cp_next_id++;
    if (__cp_count < CPULSE_MAX) { __cp_reg[__cp_count].ptr = p; __cp_reg[__cp_count].id = id; __cp_count++; }
    return id;
}
static void __cp_remove(void* p) {
    for (int i = 0; i < __cp_count; i++) {
        if (__cp_reg[i].ptr == p) { __cp_reg[i] = __cp_reg[--__cp_count]; return; }
    }
}
static void __cp_send(const char* j) {
    if (__cp_sock < 0) return;
    char buf[2048]; int n = snprintf(buf, sizeof(buf), "%s\\n", j);
    send(__cp_sock, buf, (size_t)n, MSG_NOSIGNAL);
}

static void __attribute__((constructor)) cpulse_init() {
    struct sockaddr_in s; memset(&s,0,sizeof(s));
    s.sin_family = AF_INET; s.sin_port = htons(${port});
    inet_pton(AF_INET, "127.0.0.1", &s.sin_addr);
    for (int i = 0; i < 10; i++) {
        __cp_sock = socket(AF_INET, SOCK_STREAM, 0);
        if (__cp_sock >= 0 && connect(__cp_sock, (struct sockaddr*)&s, sizeof(s)) == 0) return;
        if (__cp_sock >= 0) { close(__cp_sock); __cp_sock = -1; }
        usleep(150000);
    }
    fprintf(stderr, "[C-Pulse] Could not connect on port ${port}\\n");
}
static void __attribute__((destructor)) cpulse_exit() {
    if (__cp_sock >= 0) { shutdown(__cp_sock, SHUT_RDWR); close(__cp_sock); __cp_sock = -1; }
}

void cpulse_heap_create(void* ptr, const char* var, int line) {
    int id = __cp_reg_ptr(ptr);
    char j[512];
    snprintf(j, sizeof(j),
        "{\\"type\\":\\"heap_create\\",\\"timestamp\\":%d,\\"heapId\\":%d,\\"varName\\":\\"%s\\",\\"addr\\":%lu,\\"lineNumber\\":%d}",
        __cp_ts++, id, var, (unsigned long)ptr, line);
    __cp_send(j);
}
void cpulse_heap_free(void* ptr, const char* var, int line) {
    int id = __cp_get(ptr);
    if (!id) return;
    char j[256];
    snprintf(j, sizeof(j),
        "{\\"type\\":\\"heap_free\\",\\"timestamp\\":%d,\\"heapId\\":%d,\\"varName\\":\\"%s\\",\\"lineNumber\\":%d}",
        __cp_ts++, id, var, line);
    __cp_send(j);
    __cp_remove(ptr);
}
void cpulse_field_str(void* ptr, const char* var, const char* field, long long val, int line) {
    int id = __cp_get(ptr); if (!id) return;
    char j[512];
    snprintf(j, sizeof(j),
        "{\\"type\\":\\"heap_update\\",\\"timestamp\\":%d,\\"heapId\\":%d,\\"varName\\":\\"%s\\",\\"property\\":\\"%s\\",\\"value\\":%lld,\\"lineNumber\\":%d}",
        __cp_ts++, id, var, field, val, line);
    __cp_send(j);
}
void cpulse_ptr_link(void* src, const char* sv, const char* field, void* dst, const char* dv, int line) {
    int si = __cp_get(src); if (!si) return;
    int di = dst ? __cp_reg_ptr(dst) : 0;
    char j[512];
    snprintf(j, sizeof(j),
        "{\\"type\\":\\"ptr_link\\",\\"timestamp\\":%d,\\"heapId\\":%d,\\"varName\\":\\"%s\\",\\"property\\":\\"%s\\",\\"value\\":%d,\\"targetVar\\":\\"%s\\",\\"lineNumber\\":%d}",
        __cp_ts++, si, sv, field, di, dv, line);
    __cp_send(j);
}
void cpulse_assignment(const char* var, void* ptr, int line) {
    int id = __cp_get(ptr);
    char j[256];
    snprintf(j, sizeof(j),
        "{\\"type\\":\\"assignment\\",\\"timestamp\\":%d,\\"variableName\\":\\"%s\\",\\"heapId\\":%d,\\"addr\\":%lu,\\"lineNumber\\":%d}",
        __cp_ts++, var, id, (unsigned long)ptr, line);
    __cp_send(j);
}

void cpulse_heap_create(void*, const char*, int);
void cpulse_heap_free(void*, const char*, int);
void cpulse_field_str(void*, const char*, const char*, long long, int);
void cpulse_ptr_link(void*, const char*, const char*, void*, const char*, int);
void cpulse_assignment(const char*, void*, int);
/* === End Preamble === */
`;
    }
}
