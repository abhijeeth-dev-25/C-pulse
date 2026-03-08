import { Disposable, Webview, WebviewPanel, window, Uri, ViewColumn, workspace } from "vscode";
import { MessageHandler } from "./MessageHandler";
import * as path from "path";

/**
 * This class manages the state and behavior of C-Pulse webview panels.
 */
export class CPulsePanel {
    public static currentPanel: CPulsePanel | undefined;

    public static readonly viewType = "cPulse";

    private readonly _panel: WebviewPanel;
    private readonly _extensionUri: Uri;
    private _disposables: Disposable[] = [];
    private _messageHandler: MessageHandler;

    public static render(extensionUri: Uri) {
        if (CPulsePanel.currentPanel) {
            // If the webview panel already exists reveal it
            CPulsePanel.currentPanel._panel.reveal(ViewColumn.Beside);
        } else {
            // If a webview panel does not already exist create and show a new one
            const panel = window.createWebviewPanel(
                CPulsePanel.viewType,
                "C-Pulse Visualizer",
                ViewColumn.Beside,
                {
                    enableScripts: true,
                    localResourceRoots: [Uri.joinPath(extensionUri, "dist")],
                    retainContextWhenHidden: true,
                }
            );

            CPulsePanel.currentPanel = new CPulsePanel(panel, extensionUri);
        }
    }

    /**
     * Triggers a live re-trace on the given file path, forwarding it to the MessageHandler.
     */
    public retrace(filePath: string) {
        this._messageHandler.handleMessage({ command: 'load_file_path', filePath });
    }

    private constructor(panel: WebviewPanel, extensionUri: Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set an event listener to listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Set the HTML content for the webview panel
        this._panel.webview.html = this._getWebviewContent(this._panel.webview);

        // Set an event listener to listen for messages passed from the webview context
        this._messageHandler = new MessageHandler(this._panel.webview);
        this._setWebviewMessageListener(this._panel.webview);

        // ── Watch for webview build output changes (live UI reload) ──────────
        this._watchWebviewBuild(extensionUri);
    }

    /**
     * Watches the compiled webview bundle and refreshes the HTML whenever it's rebuilt.
     * This enables live reloading of the React UI without restarting the extension.
     */
    private _watchWebviewBuild(extensionUri: Uri) {
        const jsOutPath = Uri.joinPath(extensionUri, "dist", "webview", "assets", "index.js").fsPath;

        // Use VS Code's built-in file watcher
        const watcher = workspace.createFileSystemWatcher(
            `**${path.sep}dist${path.sep}webview${path.sep}assets${path.sep}*.js`
        );

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

    public dispose() {
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

    private _getWebviewContent(webview: Webview) {
        // The CSS file from the React build output
        const stylesUri = webview.asWebviewUri(
            Uri.joinPath(this._extensionUri, "dist", "webview", "assets", "index.css")
        );
        // The JS file from the React build output
        const scriptUri = webview.asWebviewUri(
            Uri.joinPath(this._extensionUri, "dist", "webview", "assets", "index.js")
        );

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
    private _setWebviewMessageListener(webview: Webview) {
        // Ensure gdb engine stops when panel closes
        this._disposables.push({ dispose: () => this._messageHandler.dispose() });

        webview.onDidReceiveMessage(
            (message: any) => {
                this._messageHandler.handleMessage(message);
            },
            undefined,
            this._disposables
        );
    }
}

function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
