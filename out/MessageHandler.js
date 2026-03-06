"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageHandler = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const CLiveServer_1 = require("./CLiveServer");
const CLiveRunner_1 = require("./CLiveRunner");
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
class MessageHandler {
    webview;
    liveServer = null;
    liveRunner = null;
    // In-memory graph state (rebuilt from events)
    heapNodes = new Map();
    stackVars = new Map();
    stepCount = 0;
    currentLine = 0;
    constructor(webview) {
        this.webview = webview;
    }
    async handleMessage(message) {
        switch (message.command) {
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
    async startLiveTrace(filePath) {
        // Stop previous session
        this.stop();
        // Resolve file path
        let targetPath = filePath;
        if (!targetPath) {
            const editor = vscode.window.activeTextEditor;
            if (editor?.document.languageId === 'c') {
                targetPath = editor.document.uri.fsPath;
            }
            else {
                const found = await vscode.workspace.findFiles('**/*.c', '**/node_modules/**', 1);
                if (found.length > 0)
                    targetPath = found[0].fsPath;
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
        });
        // 1. Start TCP server
        this.liveServer = new CLiveServer_1.CLiveServer((event) => this.onEvent(event));
        const port = await this.liveServer.start();
        // 2. Compile + spawn the instrumented C program in VS Code terminal
        this.liveRunner = new CLiveRunner_1.CLiveRunner(port);
        this.liveRunner.start(targetPath);
    }
    /**
     * Called for every JSON event streamed from the running C program.
     * Updates in-memory graph state and posts the full state to the webview.
     */
    onEvent(event) {
        this.stepCount++;
        this.currentLine = event.lineNumber ?? this.currentLine;
        if (event.type === 'heap_create' && event.heapId !== undefined) {
            this.heapNodes.set(event.heapId, {
                id: `node_${event.heapId}`,
                heapId: event.heapId,
                varName: event.varName || '',
                addr: event.addr || 0,
                fields: [{ key: 'data', value: '?' }, { key: 'next', value: 'NULL' }],
                next: null,
                left: null,
                right: null,
            });
        }
        if (event.type === 'heap_update' && event.heapId !== undefined) {
            const node = this.heapNodes.get(event.heapId);
            if (node) {
                const field = event.property || '';
                const existing = node.fields.find((f) => f.key === field);
                const displayVal = String(event.value ?? '');
                if (existing)
                    existing.value = displayVal;
                else
                    node.fields.push({ key: field, value: displayVal });
            }
        }
        if (event.type === 'ptr_link') {
            const srcId = event.heapId;
            const dstId = event.value;
            const field = event.property || 'next';
            const node = this.heapNodes.get(srcId);
            if (node) {
                node[field] = dstId !== 0 ? `node_${dstId}` : null;
                const fld = node.fields.find((f) => f.key === field);
                if (fld)
                    fld.value = dstId !== 0 ? '[Ref]' : 'NULL';
                else
                    node.fields.push({ key: field, value: dstId !== 0 ? '[Ref]' : 'NULL' });
            }
        }
        if (event.type === 'heap_free' && event.heapId !== undefined) {
            // Node was free()'d — remove it from the graph
            this.heapNodes.delete(event.heapId);
            // Update stack vars that pointed to this node to NULL
            for (const [key, sv] of this.stackVars) {
                if (sv.pointsTo === `node_${event.heapId}`) {
                    this.stackVars.set(key, { ...sv, pointsTo: null, value: 'NULL', isPointer: true });
                }
            }
            // Also clear any next/left/right pointers FROM other nodes to this freed node
            for (const [, hn] of this.heapNodes) {
                for (const field of ['next', 'left', 'right', 'prev']) {
                    if (hn[field] === `node_${event.heapId}`) {
                        hn[field] = null;
                        const fld = hn.fields.find((f) => f.key === field);
                        if (fld)
                            fld.value = 'NULL';
                    }
                }
            }
        }
        if (event.type === 'assignment') {
            const isNull = event.heapId === undefined || event.heapId === 0;
            this.stackVars.set(event.variableName, {
                name: event.variableName,
                value: isNull ? 'NULL' : `0x${(((event.heapId ?? 0) * 64) + 0x5500).toString(16).toUpperCase()}`,
                pointsTo: isNull ? null : `node_${event.heapId}`,
                isPointer: true,
            });
        }
        // Post the full graph state to webview
        this.webview.postMessage({
            type: 'live_event',
            step: this.stepCount,
            line: this.currentLine,
            description: this.describeEvent(event),
            heap: Array.from(this.heapNodes.values()),
            stack: Array.from(this.stackVars.values()),
        });
    }
    describeEvent(e) {
        if (e.type === 'heap_create')
            return `malloc() — created node (${e.varName}) @ 0x${(e.addr || 0).toString(16).toUpperCase()}`;
        if (e.type === 'heap_update')
            return `${e.varName}->${e.property} = ${e.value} (line ${e.lineNumber})`;
        if (e.type === 'ptr_link')
            return `${e.varName}->${e.property} → node_${e.value} (line ${e.lineNumber})`;
        if (e.type === 'assignment')
            return `${e.variableName} = node_${e.heapId} (line ${e.lineNumber})`;
        return JSON.stringify(e);
    }
    stop() {
        this.liveRunner?.stop();
        this.liveServer?.stop();
        this.liveRunner = null;
        this.liveServer = null;
    }
    dispose() { this.stop(); }
}
exports.MessageHandler = MessageHandler;
//# sourceMappingURL=MessageHandler.js.map