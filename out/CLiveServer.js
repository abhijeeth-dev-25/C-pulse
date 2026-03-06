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
exports.CLiveServer = void 0;
const net = __importStar(require("net"));
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
//# sourceMappingURL=CLiveServer.js.map