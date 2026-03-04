// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { CPulsePanel } from './CPulsePanel';

export function activate(context: vscode.ExtensionContext) {
	console.log('[C-Pulse] Extension activated!');

	const disposable = vscode.commands.registerCommand('c-pulse.start', () => {
		CPulsePanel.render(context.extensionUri);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() { }
