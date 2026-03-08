import * as fs from "fs";

/**
 * A heap-allocated node (e.g., a linked list node or tree node).
 */
export interface HeapNode {
    id: string;
    label: string; // e.g. "data=10"
    fields: { key: string; value: string }[];
    next: string | null; // id of pointed node (via "next" pointer)
    left: string | null; // for trees
    right: string | null; // for trees
}

/**
 * A stack-allocated variable (especially pointer variables).
 */
export interface StackVar {
    name: string;
    value: string;
    pointsTo: string | null; // id of a HeapNode
    isPointer: boolean;
}

/**
 * A complete memory snapshot at a given line.
 */
export interface Snapshot {
    step: number;
    line: number;
    description: string;
    stack: StackVar[];
    heap: HeapNode[];
}

/**
 * CTraceEngine: reads a C source file and generates a sequence of
 * memory snapshots by statically analyzing DSA operations (malloc,
 * pointer assignments, struct field updates).
 */
export class CTraceEngine {
    private heap: Map<string, HeapNode> = new Map();
    private stack: Map<string, StackVar> = new Map();
    private snapshots: Snapshot[] = [];
    private nodeCounter = 0;

    public generateSnapshots(filePath: string): Snapshot[] {
        this.heap.clear();
        this.stack.clear();
        this.snapshots = [];
        this.nodeCounter = 0;

        if (!fs.existsSync(filePath)) {
            return [];
        }

        const source = fs.readFileSync(filePath, "utf-8");
        const lines = source.split("\n");

        for (let i = 0; i < lines.length; i++) {
            const lineNum = i + 1;
            const line = lines[i].trim();

            this.processLine(line, lineNum);
        }

        return this.snapshots;
    }

    private processLine(line: string, lineNum: number) {
        // Skip blank lines and comments
        if (!line || line.startsWith("//") || line.startsWith("*") || line.startsWith("/*")) {
            return;
        }

        // ── MALLOC: Node creation ──
        // Pattern: struct Node* newNode = (struct Node*)malloc(...)
        // Pattern: Node* x = malloc(...)
        const mallocMatch = line.match(/(\w+)\s*=\s*(?:\([^)]+\))?\s*malloc\s*\(/);
        if (mallocMatch) {
            const varName = mallocMatch[1];
            const nodeId = `node_${++this.nodeCounter}`;

            const newNode: HeapNode = {
                id: nodeId,
                label: `{${varName}}`,
                fields: [{ key: "data", value: "?" }, { key: "next", value: "NULL" }],
                next: null,
                left: null,
                right: null,
            };

            this.heap.set(nodeId, newNode);

            // Create/update the stack variable
            this.stack.set(varName, {
                name: varName,
                value: `0x${(this.nodeCounter * 0x10).toString(16).padStart(4, "0")}`,
                pointsTo: nodeId,
                isPointer: true,
            });

            this.captureSnapshot(lineNum, `malloc() — created new node (${varName})`);
            return;
        }

        // ── FIELD ASSIGNMENT: newNode->data = val ──
        const fieldAssignMatch = line.match(/(\w+)\s*->\s*(\w+)\s*=\s*([^;]+)/);
        if (fieldAssignMatch && !line.includes("->next") && !line.includes("->left") && !line.includes("->right")) {
            const varName = fieldAssignMatch[1];
            const field = fieldAssignMatch[2];
            let value = fieldAssignMatch[3].trim().replace(/['"]/g, "");

            const sv = this.stack.get(varName);
            if (sv?.pointsTo) {
                const node = this.heap.get(sv.pointsTo);
                if (node) {
                    const existingField = node.fields.find((f) => f.key === field);
                    if (existingField) {
                        existingField.value = value;
                    } else {
                        node.fields.push({ key: field, value });
                    }
                    node.label = this.buildLabel(node);
                    this.captureSnapshot(lineNum, `${varName}->${field} = ${value}`);
                }
            }
            return;
        }

        // ── POINTER LINK: x->next/left/right = y ──
        const ptrFieldMatch = line.match(/(\w+)\s*->\s*(next|left|right)\s*=\s*(\w+)/);
        if (ptrFieldMatch) {
            const srcVar = ptrFieldMatch[1];
            const field = ptrFieldMatch[2] as 'next' | 'left' | 'right';
            const dstVar = ptrFieldMatch[3];

            const srcSV = this.stack.get(srcVar);
            if (srcSV?.pointsTo) {
                const srcNode = this.heap.get(srcSV.pointsTo);
                if (srcNode) {
                    if (dstVar === "NULL" || dstVar === "null") {
                        srcNode[field] = null;
                        srcNode.fields = srcNode.fields.filter((f) => f.key !== field);
                        srcNode.fields.push({ key: field, value: "NULL" });
                    } else {
                        // Could be a variable OR a function call like newNode(...)
                        const dstSV = this.stack.get(dstVar);
                        if (dstSV?.pointsTo) {
                            srcNode[field] = dstSV.pointsTo;
                            srcNode.fields = srcNode.fields.filter((f) => f.key !== field);
                            srcNode.fields.push({ key: field, value: `[Ref]` });
                        }
                    }
                    this.captureSnapshot(lineNum, `${srcVar}->${field} = ${dstVar}`);
                }
            }
            return;
        }

        // ── POINTER ASSIGNMENT: head = newNode / curr = curr->next ──
        const ptrAssignMatch = line.match(/^(\w+)\s*=\s*(\w+)(?:->next)?;/);
        if (ptrAssignMatch) {
            const lhs = ptrAssignMatch[1];
            const rhs = ptrAssignMatch[2];

            const rhsSV = this.stack.get(rhs);
            if (rhsSV?.isPointer) {
                // Traverse: curr = curr->next
                if (line.includes("->next")) {
                    const curSV = this.stack.get(lhs);
                    if (curSV?.pointsTo) {
                        const curNode = this.heap.get(curSV.pointsTo);
                        if (curNode?.next) {
                            curSV.pointsTo = curNode.next;
                            this.captureSnapshot(lineNum, `${lhs} = ${rhs}->next (traversing)`);
                        }
                    } else {
                        this.stack.set(lhs, {
                            name: lhs,
                            value: rhsSV.value,
                            pointsTo: rhsSV.pointsTo,
                            isPointer: true,
                        });
                        this.captureSnapshot(lineNum, `${lhs} = ${rhs}->next`);
                    }
                } else {
                    // head = newNode
                    this.stack.set(lhs, {
                        name: lhs,
                        value: rhsSV.value,
                        pointsTo: rhsSV.pointsTo,
                        isPointer: true,
                    });
                    this.captureSnapshot(lineNum, `${lhs} = ${rhs}`);
                }
            } else if (rhs === "NULL" || rhs === "null") {
                const existing = this.stack.get(lhs);
                if (existing) {
                    existing.pointsTo = null;
                    existing.value = "NULL";
                    this.captureSnapshot(lineNum, `${lhs} = NULL`);
                }
            }
        }
    }

    private buildLabel(node: HeapNode): string {
        const pairs = node.fields.map((f) => `${f.key}: ${f.value}`).join(", ");
        return `{${pairs}}`;
    }

    private captureSnapshot(line: number, description: string) {
        const snapshot: Snapshot = {
            step: this.snapshots.length + 1,
            line,
            description,
            // Deep copy stack
            stack: Array.from(this.stack.values()).map((v) => ({ ...v })),
            // Deep copy heap
            heap: Array.from(this.heap.values()).map((n) => ({
                ...n,
                fields: n.fields.map((f) => ({ ...f })),
            })),
        };

        this.snapshots.push(snapshot);
    }
}
