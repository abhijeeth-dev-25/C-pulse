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
exports.CPulsePanel = void 0;
const vscode_1 = require("vscode");
const MessageHandler_1 = require("./MessageHandler");
const path = __importStar(require("path"));
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
//# sourceMappingURL=CPulsePanel.js.map