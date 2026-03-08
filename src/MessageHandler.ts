import * as vscode from 'vscode';
import * as path from 'path';
import { CLiveServer, ExecutionEvent } from './CLiveServer';
import { CLiveRunner } from './CLiveRunner';

/**
 * MessageHandler
 * 
 * Orchestrates the full C-Pulse live pipeline — identical in structure to
 * the JS-Pulse extension.ts handlers:
 *   1. CLiveServer starts a TCP server (gets port)
 *   2. CLiveRunner instruments the .c file, compiles it, runs it in terminal
 *   3. C program connects back and streams JSON events
 *   4. Each event is forwarded to the React webview via postMessage()
 *   5. Webview renders live graph updates on each received event
 */
export class MessageHandler {
    private liveServer: CLiveServer | null = null;
    private liveRunner: CLiveRunner | null = null;

    // In-memory graph state (rebuilt from events)
    private heapNodes: Map<number, any> = new Map();
    private stackVars: Map<string, any> = new Map();
    private stepCount = 0;
    private currentLine = 0;

    constructor(private webview: vscode.Webview) { }

    public async handleMessage(message: any) {
        switch (message.command || message.type) {
            case 'ready': {
                await this.startLiveTrace();
                break;
            }
            case 'load_file': {
                const uris = await vscode.window.showOpenDialog({
                    canSelectMany: false,
                    filters: { 'C Files': ['c'] },
                    title: 'Select a C file to visualize',
                });
                if (uris?.[0]) {
                    await this.startLiveTrace(uris[0].fsPath);
                }
                break;
            }
            case 'load_file_path': {
                // Direct path retrace — triggered by auto-save in extension.ts
                if (message.filePath) {
                    await this.startLiveTrace(message.filePath);
                }
                break;
            }
            case 'stop': {
                this.stop();
                break;
            }
        }
    }


    private async startLiveTrace(filePath?: string) {
        // Stop previous session
        this.stop();

        // Resolve file path
        let targetPath = filePath;
        if (!targetPath) {
            const editor = vscode.window.activeTextEditor;
            if (editor?.document.languageId === 'c') {
                targetPath = editor.document.uri.fsPath;
            } else {
                const found = await vscode.workspace.findFiles('**/*.c', '**/node_modules/**', 1);
                if (found.length > 0) targetPath = found[0].fsPath;
            }
        }

        if (!targetPath) {
            this.webview.postMessage({ type: 'error', message: 'No C file found. Open a .c file and try again.' });
            return;
        }

        // Reset state
        this.heapNodes.clear();
        this.stackVars.clear();
        this.stepCount = 0;
        this.currentLine = 0;

        // Send initial "loading" state to webview
        this.webview.postMessage({
            type: 'live_start',
            fileName: path.basename(targetPath),
            code: require('fs').readFileSync(targetPath, 'utf8')
        });

        // 1. Start TCP server
        this.liveServer = new CLiveServer((event) => this.onEvent(event));
        const port = await this.liveServer.start();

        // 2. Compile + spawn the instrumented C program in VS Code terminal
        this.liveRunner = new CLiveRunner(port);
        this.liveRunner.start(targetPath);
    }

    /**
     * Called for every JSON event streamed from the running C program.
     * Updates in-memory graph state and posts the full state to the webview.
     */
    private onEvent(event: ExecutionEvent) {
        this.stepCount++;
        this.currentLine = event.lineNumber ?? this.currentLine;
        let warnings: string[] = [];

        if (event.type === 'heap_create' && event.heapId !== undefined) {
            this.heapNodes.set(event.heapId, {
                id: `node_${event.heapId}`,
                heapId: event.heapId,
                varName: (event as any).varName || '',
                addr: (event as any).addr || 0,
                fields: [
                    { key: 'data', value: '?' },
                    { key: 'next', value: 'NULL' },
                    { key: 'left', value: 'NULL' },
                    { key: 'right', value: 'NULL' }
                ],
                next: null,
                left: null,
                right: null,
            });
        }

        if (event.type === 'heap_update' && event.heapId !== undefined) {
            const node = this.heapNodes.get(event.heapId);
            if (node) {
                const field = event.property || '';
                const existing = node.fields.find((f: any) => f.key === field);
                const displayVal = String(event.value ?? '');
                if (existing) existing.value = displayVal;
                else node.fields.push({ key: field, value: displayVal });
            } else if (!event.heapId || event.heapId === 0) {
                warnings.push(`⚠ NULL DEREFERENCE: Attempted to dereference a NULL pointer`);
                const varName = (event as any).varName || event.variableName;
                if (varName && this.stackVars.has(varName)) {
                    const sv = this.stackVars.get(varName)!;
                    this.stackVars.set(varName, { ...sv, isDereferencingNull: true });
                }
            }
        }

        if ((event.type as any) === 'ptr_link') {
            const srcId = (event as any).heapId;
            const dstId = (event as any).value;
            const field = event.property || 'next';
            const node = this.heapNodes.get(srcId);
            if (node) {
                node[field] = dstId !== 0 ? `node_${dstId}` : null;
                const fld = node.fields.find((f: any) => f.key === field);
                if (fld) fld.value = dstId !== 0 ? '[Ref]' : 'NULL';
                else node.fields.push({ key: field, value: dstId !== 0 ? '[Ref]' : 'NULL' });
            } else if (!srcId || srcId === 0) {
                warnings.push(`⚠ NULL DEREFERENCE: Attempted to dereference a NULL pointer`);
                const varName = (event as any).varName || event.variableName;
                if (varName && this.stackVars.has(varName)) {
                    const sv = this.stackVars.get(varName)!;
                    this.stackVars.set(varName, { ...sv, isDereferencingNull: true });
                }
            }
        }

        if ((event.type as any) === 'heap_free' && event.heapId !== undefined) {
            const node = this.heapNodes.get(event.heapId);
            if (!node) {
                warnings.push(`⚠ INVALID FREE: Attempted to free memory that was never allocated`);
            } else if (node.isFreed) {
                node.isDoubleFree = true;
                warnings.push(`Double free detected on address 0x${((event.heapId * 64) + 0x55a0).toString(16).toUpperCase()}`);
            } else {
                node.isFreed = true;
            }
        }

        if (event.type === 'assignment') {
            const isNull = event.heapId === undefined || event.heapId === 0;
            this.stackVars.set(event.variableName!, {
                name: event.variableName!,
                value: isNull ? 'NULL' : `0x${(((event.heapId ?? 0) * 64) + 0x5500).toString(16).toUpperCase()}`,
                pointsTo: isNull ? null : `node_${event.heapId}`,
                isPointer: true,
            });
        }

        let hasLeak = false;
        let description = this.describeEvent(event);

        if (event.type === 'execution_end') {
            let leakedCount = 0;
            for (const [, node] of this.heapNodes) {
                if (!node.isFreed) {
                    node.isLeaked = true;
                    leakedCount++;
                }
            }
            hasLeak = leakedCount > 0;
            description = hasLeak
                ? `Program terminated. ⚠ WARNING: ${leakedCount} memory leak(s) detected!`
                : `Program terminated successfully. No memory leaks.`;
        }

        // Post the full graph state to webview
        const msg = {
            type: 'live_event',
            step: this.stepCount,
            line: this.currentLine,
            description,
            heap: Array.from(this.heapNodes.values()),
            stack: Array.from(this.stackVars.values()),
            hasLeak,
            warnings
        };
        require('fs').appendFileSync('/tmp/cpulse_log.json', JSON.stringify(msg) + '\n');
        this.webview.postMessage(msg);
    }

    private describeEvent(e: ExecutionEvent): string {
        if (e.type === 'heap_create') return `malloc() — created node (${(e as any).varName}) @ 0x${((e as any).addr || 0).toString(16).toUpperCase()}`;
        if (e.type === 'heap_update') return `${(e as any).varName}->${e.property} = ${e.value} (line ${e.lineNumber})`;
        if ((e.type as any) === 'ptr_link') return `${(e as any).varName}->${e.property} → node_${e.value} (line ${e.lineNumber})`;
        if (e.type === 'assignment') return `${e.variableName} = node_${e.heapId} (line ${e.lineNumber})`;
        return JSON.stringify(e);
    }

    public stop() {
        this.liveRunner?.stop();
        this.liveServer?.stop();
        this.liveRunner = null;
        this.liveServer = null;
    }

    public dispose() { this.stop(); }
}
