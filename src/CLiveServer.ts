import * as net from 'net';

export interface ExecutionEvent {
    type: 'heap_create' | 'heap_update' | 'heap_free' | 'assignment' | 'execution_end';
    heapId?: number;
    value?: any;
    property?: string;
    variableName?: string;
    lineNumber?: number;
    timestamp: number;
}

/**
 * CLiveServer: A TCP server that receives newline-delimited JSON events
 * from an instrumented C program running in the VS Code terminal.
 *
 * This mirrors JS-Pulse's LiveServer.ts exactly — same protocol, same JSON format.
 */
export class CLiveServer {
    private server: net.Server | null = null;
    private activeSocket: net.Socket | null = null;
    private port = 0;
    private buffer = '';

    constructor(private onEvent: (event: ExecutionEvent) => void) { }

    public start(): Promise<number> {
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
                const addr = this.server!.address() as net.AddressInfo;
                this.port = addr.port;
                console.log(`[C-Pulse] LiveServer on 127.0.0.1:${this.port}`);
                resolve(this.port);
            });
        });
    }

    private processBuffer() {
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
                const event: ExecutionEvent = JSON.parse(trimmed);
                this.onEvent(event);
            } catch {
                // Not valid JSON — ignore
            }
        }
    }

    public getPort(): number { return this.port; }

    public stop() {
        this.activeSocket?.destroy();
        this.activeSocket = null;
        this.server?.close();
        this.server = null;
        this.buffer = '';
        this.port = 0;
    }
}
