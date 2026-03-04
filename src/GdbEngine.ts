import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as vscode from "vscode";

export class GdbEngine {
    private gdbProcess: ChildProcessWithoutNullStreams | null = null;
    private onMessageCallback: ((message: any) => void) | null = null;

    constructor() { }

    /**
     * Registers a callback to receive parsed memory states from GDB.
     */
    public onMessage(callback: (message: any) => void) {
        this.onMessageCallback = callback;
    }

    /**
     * Starts the GDB process with the given executable path.
     */
    public async start(executablePath: string) {
        if (this.gdbProcess) {
            await this.stop();
        }

        // Launch GDB using the Machine Interface (MI)
        this.gdbProcess = spawn("gdb", ["--interpreter=mi", executablePath]);

        this.gdbProcess.stdout.on("data", (data) => this.handleStdout(data.toString()));
        this.gdbProcess.stderr.on("data", (data) => console.error(`GDB Error: ${data.toString()}`));

        // Initialize execution
        this.sendCommand("-exec-run");
    }

    /**
     * Sends a command to the GDB process.
     */
    public sendCommand(cmd: string) {
        if (!this.gdbProcess) return;
        this.gdbProcess.stdin.write(cmd + "\\n");
    }

    /**
     * Stops the GDB process.
     */
    public async stop() {
        if (this.gdbProcess) {
            this.gdbProcess.kill();
            this.gdbProcess = null;
        }
    }

    /**
     * Advances the program execution by one line (step over).
     */
    public stepNext() {
        this.sendCommand("-exec-next");
        // After stepping, we should request the stack state
        setTimeout(() => {
            this.sendCommand("-stack-list-variables --all-values");
        }, 50);
    }

    /**
     * Parses the GDB/MI standard output.
     */
    private handleStdout(data: string) {
        console.log(`[GDB MI] ${data}`);

        // Check if the program hit a breakpoint or stepped successfully
        if (data.includes("*stopped")) {
            // Program has stopped at a new instruction.
            // We could extract the line number here.
        }

        // Check if we got variable data back
        if (data.includes("^done,variables=")) {
            const state = this.parseVariablesOutput(data);
            if (this.onMessageCallback) {
                this.onMessageCallback({ type: "memory_update", state });
            }
        }
    }

    /**
     * Quick heuristic to pull out variables using regex.
     * Proper implementation would use a full GDB/MI parser.
     */
    private parseVariablesOutput(data: string): any {
        const memoryState: any = { stack: [], heap: [] };

        // Example regex extraction: name="val",value="10"
        const regex = /name="([^"]+)",value="([^"]+)"/g;
        let match;

        while ((match = regex.exec(data)) !== null) {
            memoryState.stack.push({
                name: match[1],
                value: match[2]
            });
        }

        return memoryState;
    }
}
