import { ClientTransportSession, TransportMetadata } from './session';
import { McpTransportRequest, McpTransportResponse } from './types';

export class HttpJsonRpcSession
  implements ClientTransportSession<McpTransportRequest, McpTransportResponse>
{
  private metadata: TransportMetadata = {};
  private deadlineMs = 15000;
  private readonly queue: McpTransportResponse[] = [];
  private readonly pending: Array<(value: McpTransportResponse) => void> = [];

  constructor(private readonly baseUrl: string) {}

  async connect(): Promise<void> {
    return undefined;
  }

  setMetadata(metadata: TransportMetadata): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  setDeadline(timeoutMs: number): void {
    this.deadlineMs = timeoutMs;
  }

  async send(request: McpTransportRequest): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.deadlineMs);
    try {
      const res = await fetch(`${this.baseUrl}/jsonrpc`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.metadata,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: request.id ?? Date.now(),
          method: request.method,
          params: request.params ?? {},
        }),
        signal: controller.signal,
      });
      const json = (await res.json()) as {
        id?: string;
        result?: unknown;
        error?: { code: number; message: string; details?: string };
      };
      const response: McpTransportResponse = {
        id: json.id,
        result: json.result,
        error: json.error,
        metadata: {
          policy_receipt: res.headers.get('x-ig-policy-receipt') ?? '',
          transcript_hash: res.headers.get('x-ig-transcript-hash') ?? '',
        },
      };
      this.enqueue(response);
    } finally {
      clearTimeout(timeout);
    }
  }

  async recv(): Promise<McpTransportResponse> {
    if (this.queue.length) {
      return this.queue.shift() as McpTransportResponse;
    }
    return new Promise((resolve) => this.pending.push(resolve));
  }

  async close(): Promise<void> {
    this.queue.length = 0;
    this.pending.length = 0;
  }

  private enqueue(response: McpTransportResponse) {
    const resolver = this.pending.shift();
    if (resolver) {
      resolver(response);
      return;
    }
    this.queue.push(response);
  }
}
