import * as vscode from 'vscode';
import { CPulsePanel } from './CPulsePanel';

export function activate(context: vscode.ExtensionContext) {
	console.log('[C-Pulse] Extension activated!');

	// ── 1. Register command ──────────────────────────────────────────────────
	const disposable = vscode.commands.registerCommand('c-pulse.start', () => {
		CPulsePanel.render(context.extensionUri);
	});
	context.subscriptions.push(disposable);

	// ── 2. Status Bar Button (shows on any C file) ───────────────────────────
	const statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100
	);
	statusBarItem.command = 'c-pulse.start';
	statusBarItem.text = '$(play-circle) C-Pulse';
	statusBarItem.tooltip = 'Launch C-Pulse Visualizer';
	statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
	context.subscriptions.push(statusBarItem);

	// Show/hide the button based on the active editor language
	function updateStatusBar(editor?: vscode.TextEditor) {
		if (editor && editor.document.languageId === 'c') {
			statusBarItem.show();
		} else {
			statusBarItem.hide();
		}
	}

	// Trigger on editor switch
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(updateStatusBar)
	);
	// Check immediately on activation
	updateStatusBar(vscode.window.activeTextEditor);

	// ── 3. Auto-retrace on C file save ──────────────────────────────────────
	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument((doc) => {
			// Only trigger if it's a C file AND the visualizer is already open
			if (doc.languageId === 'c' && CPulsePanel.currentPanel) {
				// Post a 'reload' command to the existing panel's message handler
				CPulsePanel.currentPanel.retrace(doc.uri.fsPath);
			}
		})
	);
}

export function deactivate() { }
