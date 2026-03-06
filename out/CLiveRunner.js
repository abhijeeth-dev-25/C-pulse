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
exports.CLiveRunner = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const CInstrumenter_1 = require("./CInstrumenter");
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
//# sourceMappingURL=CLiveRunner.js.map