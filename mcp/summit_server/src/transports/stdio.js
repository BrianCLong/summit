"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StdioTransport = void 0;
class StdioTransport {
    server;
    input;
    output;
    buffer = '';
    constructor(server, input = process.stdin, output = process.stdout) {
        this.server = server;
        this.input = input;
        this.output = output;
    }
    start() {
        this.input.on('data', (chunk) => {
            this.buffer += chunk.toString('utf-8');
            let index = this.buffer.indexOf('\n');
            while (index >= 0) {
                const line = this.buffer.slice(0, index).trim();
                this.buffer = this.buffer.slice(index + 1);
                if (line.length > 0) {
                    void this.handleLine(line);
                }
                index = this.buffer.indexOf('\n');
            }
        });
    }
    async handleLine(line) {
        try {
            const request = JSON.parse(line);
            const response = await this.server.handle(request);
            this.output.write(`${JSON.stringify(response)}\n`);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.output.write(`${JSON.stringify({ ok: false, error: message })}\n`);
        }
    }
}
exports.StdioTransport = StdioTransport;
