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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const CPulsePanel_1 = require("./CPulsePanel");
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
//# sourceMappingURL=extension.js.map