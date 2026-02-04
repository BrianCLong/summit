import { Metadata, credentials } from '@grpc/grpc-js';
import { ClientTransportSession, TransportMetadata } from './session';
import { McpTransportRequest, McpTransportResponse } from './types';
import { loadMcpProto } from './grpc-proto';

export class GrpcStreamSession
  implements ClientTransportSession<McpTransportRequest, McpTransportResponse>
{
  private metadata: TransportMetadata = {};
  private deadlineMs = 15000;
  private stream: any;
  private readonly queue: McpTransportResponse[] = [];
  private readonly pending: Array<(value: McpTransportResponse) => void> = [];

  constructor(
    private readonly address: string,
    private readonly token: string,
  ) {}

  async connect(): Promise<void> {
    const definition = loadMcpProto() as any;
    const transport = definition.intelgraph.mcp.transport.v1.McpTransport;
    const client = new transport(this.address, credentials.createInsecure());
    const metadata = new Metadata();
    metadata.set('authorization', `Bearer ${this.token}`);
    for (const [key, value] of Object.entries(this.metadata)) {
      metadata.set(key, value);
    }
    this.stream = client.Connect(metadata, this.deadlineOption());
    this.stream.on('data', (data: any) => this.enqueue(data));
  }

  setMetadata(metadata: TransportMetadata): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  setDeadline(timeoutMs: number): void {
    this.deadlineMs = timeoutMs;
  }

  async send(request: McpTransportRequest): Promise<void> {
    if (!this.stream) {
      throw new Error('grpc stream not connected');
    }
    this.stream.write(request);
  }

  async recv(): Promise<McpTransportResponse> {
    if (this.queue.length) {
      return this.queue.shift() as McpTransportResponse;
    }
    return new Promise((resolve) => this.pending.push(resolve));
  }

  async close(): Promise<void> {
    if (this.stream) {
      this.stream.end();
    }
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

  private deadlineOption() {
    return { deadline: new Date(Date.now() + this.deadlineMs) };
  }
}
