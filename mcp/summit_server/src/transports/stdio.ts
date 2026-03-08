import type { Readable, Writable } from 'stream';
import { McpServer, type McpRequest } from '../server.js';

export class StdioTransport {
  private server: McpServer;
  private input: Readable;
  private output: Writable;
  private buffer = '';

  constructor(
    server: McpServer,
    input: Readable = process.stdin,
    output: Writable = process.stdout,
  ) {
    this.server = server;
    this.input = input;
    this.output = output;
  }

  start(): void {
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

  private async handleLine(line: string): Promise<void> {
    try {
      const request = JSON.parse(line) as McpRequest;
      const response = await this.server.handle(request);
      this.output.write(`${JSON.stringify(response)}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.output.write(
        `${JSON.stringify({ ok: false, error: message })}\n`,
      );
    }
  }
}
