/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(__webpack_require__(1));
const CPulsePanel_1 = __webpack_require__(2);
function activate(context) {
    console.log('[C-Pulse] Extension activated!');
    // ── 1. Register command ──────────────────────────────────────────────────
    const disposable = vscode.commands.registerCommand('c-pulse.start', () => {
        CPulsePanel_1.CPulsePanel.render(context.extensionUri);
    });
    context.subscriptions.push(disposable);
    // ── 2. Status Bar Button (shows on any C file) ───────────────────────────
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'c-pulse.start';
    statusBarItem.text = '$(play-circle) C-Pulse';
    statusBarItem.tooltip = 'Launch C-Pulse Visualizer';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    context.subscriptions.push(statusBarItem);
    // Show/hide the button based on the active editor language
    function updateStatusBar(editor) {
        if (editor && editor.document.languageId === 'c') {
            statusBarItem.show();
        }
        else {
            statusBarItem.hide();
        }
    }
    // Trigger on editor switch
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBar));
    // Check immediately on activation
    updateStatusBar(vscode.window.activeTextEditor);
    // ── 3. Auto-retrace on C file save ──────────────────────────────────────
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((doc) => {
        // Only trigger if it's a C file AND the visualizer is already open
        if (doc.languageId === 'c' && CPulsePanel_1.CPulsePanel.currentPanel) {
            // Post a 'reload' command to the existing panel's message handler
            CPulsePanel_1.CPulsePanel.currentPanel.retrace(doc.uri.fsPath);
        }
    }));
}
function deactivate() { }


/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CPulsePanel = void 0;
const vscode_1 = __webpack_require__(1);
const MessageHandler_1 = __webpack_require__(3);
const path = __importStar(__webpack_require__(4));
/**
 * This class manages the state and behavior of C-Pulse webview panels.
 */
class CPulsePanel {
    static currentPanel;
    static viewType = "cPulse";
    _panel;
    _extensionUri;
    _disposables = [];
    _messageHandler;
    static render(extensionUri) {
        if (CPulsePanel.currentPanel) {
            // If the webview panel already exists reveal it
            CPulsePanel.currentPanel._panel.reveal(vscode_1.ViewColumn.Beside);
        }
        else {
            // If a webview panel does not already exist create and show a new one
            const panel = vscode_1.window.createWebviewPanel(CPulsePanel.viewType, "C-Pulse Visualizer", vscode_1.ViewColumn.Beside, {
                enableScripts: true,
                localResourceRoots: [vscode_1.Uri.joinPath(extensionUri, "out")],
                retainContextWhenHidden: true,
            });
            CPulsePanel.currentPanel = new CPulsePanel(panel, extensionUri);
        }
    }
    /**
     * Triggers a live re-trace on the given file path, forwarding it to the MessageHandler.
     */
    retrace(filePath) {
        this._messageHandler.handleMessage({ command: 'load_file_path', filePath });
    }
    constructor(panel, extensionUri) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        // Set an event listener to listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Set the HTML content for the webview panel
        this._panel.webview.html = this._getWebviewContent(this._panel.webview);
        // Set an event listener to listen for messages passed from the webview context
        this._messageHandler = new MessageHandler_1.MessageHandler(this._panel.webview);
        this._setWebviewMessageListener(this._panel.webview);
        // ── Watch for webview build output changes (live UI reload) ──────────
        this._watchWebviewBuild(extensionUri);
    }
    /**
     * Watches the compiled webview bundle and refreshes the HTML whenever it's rebuilt.
     * This enables live reloading of the React UI without restarting the extension.
     */
    _watchWebviewBuild(extensionUri) {
        const jsOutPath = vscode_1.Uri.joinPath(extensionUri, "out", "webview", "assets", "index.js").fsPath;
        // Use VS Code's built-in file watcher
        const watcher = vscode_1.workspace.createFileSystemWatcher(`**${path.sep}out${path.sep}webview${path.sep}assets${path.sep}*.js`);
        const reload = () => {
            if (CPulsePanel.currentPanel) {
                console.log('[C-Pulse] Webview bundle changed — reloading...');
                CPulsePanel.currentPanel._panel.webview.html =
                    CPulsePanel.currentPanel._getWebviewContent(CPulsePanel.currentPanel._panel.webview);
            }
        };
        watcher.onDidChange(reload, null, this._disposables);
        watcher.onDidCreate(reload, null, this._disposables);
        this._disposables.push(watcher);
        // Keep reference just for logging
        void jsOutPath;
    }
    dispose() {
        CPulsePanel.currentPanel = undefined;
        this._panel.dispose();
        this._messageHandler.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
    _getWebviewContent(webview) {
        // The CSS file from the React build output
        const stylesUri = webview.asWebviewUri(vscode_1.Uri.joinPath(this._extensionUri, "out", "webview", "assets", "index.css"));
        // The JS file from the React build output
        const scriptUri = webview.asWebviewUri(vscode_1.Uri.joinPath(this._extensionUri, "out", "webview", "assets", "index.js"));
        const nonce = getNonce();
        // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
        return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
          <meta name="theme-color" content="#000000">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>C-Pulse</title>
        </head>
        <body>
          <noscript>You need to enable JavaScript to run this app.</noscript>
          <div id="root"></div>
          <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
    }
    /**
     * Sets up an event listener to listen for messages passed from the webview context.
     *
     * @param webview A reference to the extension webview
     */
    _setWebviewMessageListener(webview) {
        // Ensure gdb engine stops when panel closes
        this._disposables.push({ dispose: () => this._messageHandler.dispose() });
        webview.onDidReceiveMessage((message) => {
            this._messageHandler.handleMessage(message);
        }, undefined, this._disposables);
    }
}
exports.CPulsePanel = CPulsePanel;
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}


/***/ }),
/* 3 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.MessageHandler = void 0;
const vscode = __importStar(__webpack_require__(1));
const path = __importStar(__webpack_require__(4));
const CLiveServer_1 = __webpack_require__(5);
const CLiveRunner_1 = __webpack_require__(7);
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
            code: (__webpack_require__(8).readFileSync)(targetPath, 'utf8')
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
        let warnings = [];
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
            else if (!event.heapId || event.heapId === 0) {
                warnings.push(`⚠ NULL DEREFERENCE: Attempted to dereference a NULL pointer`);
                const varName = event.varName || event.variableName;
                if (varName && this.stackVars.has(varName)) {
                    const sv = this.stackVars.get(varName);
                    this.stackVars.set(varName, { ...sv, isDereferencingNull: true });
                }
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
            else if (!srcId || srcId === 0) {
                warnings.push(`⚠ NULL DEREFERENCE: Attempted to dereference a NULL pointer`);
                const varName = event.varName || event.variableName;
                if (varName && this.stackVars.has(varName)) {
                    const sv = this.stackVars.get(varName);
                    this.stackVars.set(varName, { ...sv, isDereferencingNull: true });
                }
            }
        }
        if (event.type === 'heap_free' && event.heapId !== undefined) {
            const node = this.heapNodes.get(event.heapId);
            if (!node) {
                warnings.push(`⚠ INVALID FREE: Attempted to free memory that was never allocated`);
            }
            else if (node.isFreed) {
                node.isDoubleFree = true;
                warnings.push(`Double free detected on address 0x${((event.heapId * 64) + 0x55a0).toString(16).toUpperCase()}`);
            }
            else {
                node.isFreed = true;
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
        (__webpack_require__(8).appendFileSync)('/tmp/cpulse_log.json', JSON.stringify(msg) + '\n');
        this.webview.postMessage(msg);
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


/***/ }),
/* 4 */
/***/ ((module) => {

module.exports = require("path");

/***/ }),
/* 5 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CLiveServer = void 0;
const net = __importStar(__webpack_require__(6));
/**
 * CLiveServer: A TCP server that receives newline-delimited JSON events
 * from an instrumented C program running in the VS Code terminal.
 *
 * This mirrors JS-Pulse's LiveServer.ts exactly — same protocol, same JSON format.
 */
class CLiveServer {
    onEvent;
    server = null;
    activeSocket = null;
    port = 0;
    buffer = '';
    constructor(onEvent) {
        this.onEvent = onEvent;
    }
    start() {
        return new Promise((resolve, reject) => {
            this.server = net.createServer((socket) => {
                this.activeSocket = socket;
                socket.on('data', (data) => {
                    this.buffer += data.toString();
                    this.processBuffer();
                });
                socket.on('end', () => {
                    this.processBuffer();
                    this.onEvent({ type: 'execution_end', timestamp: Date.now() });
                    this.activeSocket = null;
                });
                socket.on('error', (err) => {
                    console.error('[C-Pulse] Socket error:', err.message);
                    this.activeSocket = null;
                });
            });
            this.server.on('error', reject);
            this.server.listen(0, '127.0.0.1', () => {
                const addr = this.server.address();
                this.port = addr.port;
                console.log(`[C-Pulse] LiveServer on 127.0.0.1:${this.port}`);
                resolve(this.port);
            });
        });
    }
    processBuffer() {
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            try {
                const event = JSON.parse(trimmed);
                this.onEvent(event);
            }
            catch {
                // Not valid JSON — ignore
            }
        }
    }
    getPort() { return this.port; }
    stop() {
        this.activeSocket?.destroy();
        this.activeSocket = null;
        this.server?.close();
        this.server = null;
        this.buffer = '';
        this.port = 0;
    }
}
exports.CLiveServer = CLiveServer;


/***/ }),
/* 6 */
/***/ ((module) => {

module.exports = require("net");

/***/ }),
/* 7 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CLiveRunner = void 0;
const vscode = __importStar(__webpack_require__(1));
const fs = __importStar(__webpack_require__(8));
const path = __importStar(__webpack_require__(4));
const CInstrumenter_1 = __webpack_require__(9);
/**
 * CLiveRunner
 *
 * Instruments the C source file and spawns it in a VS Code integrated
 * terminal — the EXACT same pattern as JS-Pulse's LiveRunner.ts.
 *
 * Flow:
 *   1. CInstrumenter writes a temp .c file with cpulse_record() calls + preamble
 *   2. We compile it with gcc
 *   3. We run the binary in a named "C-Pulse Live" VS Code terminal
 *   4. The binary streams JSON events to CLiveServer over TCP
 */
class CLiveRunner {
    port;
    terminal = null;
    instrumenter = new CInstrumenter_1.CInstrumenter();
    tmpC = null;
    tmpBin = null;
    constructor(port) {
        this.port = port;
    }
    start(sourceFilePath) {
        // 1. Instrument and write temp C file
        const tmpC = this.instrumenter.instrument(sourceFilePath, this.port);
        const tmpBin = tmpC.replace('.c', '');
        this.tmpC = tmpC;
        this.tmpBin = tmpBin;
        const workspaceDir = path.dirname(sourceFilePath);
        // 2. Create terminal
        if (this.terminal) {
            this.terminal.dispose();
        }
        this.terminal = vscode.window.createTerminal({
            name: 'C-Pulse Live',
            cwd: workspaceDir,
        });
        this.terminal.show(true); // show but keep focus on editor
        // 3. Compile and run — same as JS-Pulse's `node ".dsa-live.js"`
        this.terminal.sendText(`gcc -g "${tmpC}" -o "${tmpBin}" && echo "✅ Compiled OK — Starting..." && "${tmpBin}"`);
    }
    stop() {
        this.terminal?.sendText('exit');
        this.terminal?.dispose();
        this.terminal = null;
        // Clean up temp files
        if (this.tmpC && fs.existsSync(this.tmpC)) {
            try {
                fs.unlinkSync(this.tmpC);
            }
            catch { }
        }
        if (this.tmpBin && fs.existsSync(this.tmpBin)) {
            try {
                fs.unlinkSync(this.tmpBin);
            }
            catch { }
        }
        this.tmpC = null;
        this.tmpBin = null;
    }
}
exports.CLiveRunner = CLiveRunner;


/***/ }),
/* 8 */
/***/ ((module) => {

module.exports = require("fs");

/***/ }),
/* 9 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


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
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.CInstrumenter = void 0;
const fs = __importStar(__webpack_require__(8));
const path = __importStar(__webpack_require__(4));
const os = __importStar(__webpack_require__(10));
class CInstrumenter {
    instrument(sourceFilePath, tcpPort) {
        const userCode = fs.readFileSync(sourceFilePath, 'utf-8');
        const instrumented = this.injectCalls(userCode);
        const preamble = this.buildPreamble(tcpPort);
        const full = `${preamble}\n/* ── User code: ${path.basename(sourceFilePath)} ── */\n${instrumented}`;
        const tmpPath = path.join(os.tmpdir(), '.cpulse_instrumented.c');
        fs.writeFileSync(tmpPath, full, 'utf-8');
        return tmpPath;
    }
    injectCalls(source) {
        const lines = source.split('\n');
        const out = [];
        const SKIP = ['if', 'while', 'for', 'return', 'else', 'sizeof', 'NULL', '0'];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const t = line.trim();
            const indent = line.match(/^(\s*)/)?.[1] ?? '';
            const ln = i + 1;
            out.push(line);
            if (!t || t.startsWith('//') || t.startsWith('#') || t.startsWith('*') || t.startsWith('/*'))
                continue;
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
                }
                else {
                    out.push(`${indent}cpulse_ptr_link((void*)(${sv}), "${sv}", "${field}", (void*)(${dv}), "${dv}", ${ln});`);
                }
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
        }
        return out.join('\n');
    }
    buildPreamble(port) {
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
exports.CInstrumenter = CInstrumenter;


/***/ }),
/* 10 */
/***/ ((module) => {

module.exports = require("os");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map