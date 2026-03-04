import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CInstrumenter } from './CInstrumenter';

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
export class CLiveRunner {
    private terminal: vscode.Terminal | null = null;
    private instrumenter = new CInstrumenter();
    private tmpC: string | null = null;
    private tmpBin: string | null = null;

    constructor(private port: number) { }

    public start(sourceFilePath: string) {
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
        this.terminal.sendText(
            `gcc -g "${tmpC}" -o "${tmpBin}" && echo "✅ Compiled OK — Starting..." && "${tmpBin}"`
        );
    }

    public stop() {
        this.terminal?.sendText('exit');
        this.terminal?.dispose();
        this.terminal = null;

        // Clean up temp files
        if (this.tmpC && fs.existsSync(this.tmpC)) {
            try { fs.unlinkSync(this.tmpC); } catch { }
        }
        if (this.tmpBin && fs.existsSync(this.tmpBin)) {
            try { fs.unlinkSync(this.tmpBin); } catch { }
        }
        this.tmpC = null;
        this.tmpBin = null;
    }
}
