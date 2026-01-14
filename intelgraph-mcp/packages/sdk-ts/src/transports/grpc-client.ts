import fs from 'node:fs';
import {
  ChannelCredentials,
  credentials,
  Metadata,
  ServiceError,
} from '@grpc/grpc-js';
import { loadMcpProto } from './grpc-proto';
import {
  InvokeArgs,
  PromptDescriptor,
  ResourceDescriptor,
  Session,
  ToolDescriptor,
} from '../types';
import { TransportClient } from './types';

export type GrpcTransportClientOptions = {
  deadlineMs?: number;
  tls?: {
    enabled: boolean;
    caPath?: string;
    certPath?: string;
    keyPath?: string;
  };
};

export class GrpcTransportClient implements TransportClient {
  readonly type = 'grpc' as const;
  private client: any;

  constructor(
    private readonly address: string,
    private readonly token: string,
    private readonly options: GrpcTransportClientOptions = {},
  ) {
    const definition = loadMcpProto() as any;
    const transport = definition.intelgraph.mcp.transport.v1.McpTransport;
    this.client = new transport(this.address, this.buildCredentials());
  }

  async connect(toolClass: string, caps: string[] = []): Promise<Session> {
    const response = await this.unaryCall('Allocate', {
      tool_class: toolClass,
      capability_scopes: caps,
    });
    return { id: response.session_id };
  }

  async invoke(session: Session, input: InvokeArgs) {
    const response = await this.unaryCall('Invoke', {
      id: input.fn,
      tool_name: input.fn,
      args: input.args ?? {},
      session_id: session.id,
      keep_alive: true,
    });
    return response.result ?? {};
  }

  async release(session: Session) {
    await this.unaryCall('Release', { session_id: session.id });
  }

  async listTools(): Promise<ToolDescriptor[]> {
    const response = await this.unaryCall('ListTools', {});
    return response.tools ?? [];
  }

  async listResources(): Promise<ResourceDescriptor[]> {
    const response = await this.unaryCall('ListResources', {});
    return response.resources ?? [];
  }

  async listPrompts(): Promise<PromptDescriptor[]> {
    const response = await this.unaryCall('ListPrompts', {});
    return response.prompts ?? [];
  }

  async ping(timeoutMs?: number): Promise<boolean> {
    const response = await this.unaryCall('Ping', { id: 'probe' }, timeoutMs);
    return Boolean(response.ok);
  }

  async *stream(session: Session) {
    const metadata = this.metadata();
    const stream = this.client.Connect(metadata, this.deadlineOption());
    const queue: any[] = [];
    let done = false;
    stream.on('data', (data: any) => {
      queue.push(data);
    });
    stream.on('end', () => {
      done = true;
    });
    stream.write({
      id: `init-${session.id}`,
      method: 'mcp.ping',
      session: { session_id: session.id },
    });

    while (!done || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        continue;
      }
      const next = queue.shift();
      yield {
        id: next.id,
        event: next.metadata?.event ?? 'message',
        data: JSON.stringify(next.result ?? next),
      };
    }
  }

  private async unaryCall(
    method: string,
    request: Record<string, unknown>,
    timeoutMs?: number,
  ) {
    return new Promise<any>((resolve, reject) => {
      this.client[method](
        request,
        this.metadata(),
        this.deadlineOption(timeoutMs),
        (err: ServiceError | null, response: any) => {
          if (err) {
            reject(new Error(`grpc ${method} failed: ${err.message}`));
            return;
          }
          resolve(response ?? {});
        },
      );
    });
  }

  private metadata() {
    const metadata = new Metadata();
    metadata.set('authorization', `Bearer ${this.token}`);
    return metadata;
  }

  private deadlineOption(timeoutMs?: number) {
    const deadlineMs = timeoutMs ?? this.options.deadlineMs;
    if (!deadlineMs) return undefined;
    return { deadline: new Date(Date.now() + deadlineMs) };
  }

  private buildCredentials(): ChannelCredentials {
    if (!this.options.tls?.enabled) {
      return credentials.createInsecure();
    }
    const ca = this.options.tls.caPath
      ? fs.readFileSync(this.options.tls.caPath)
      : undefined;
    const cert = this.options.tls.certPath
      ? fs.readFileSync(this.options.tls.certPath)
      : undefined;
    const key = this.options.tls.keyPath
      ? fs.readFileSync(this.options.tls.keyPath)
      : undefined;
    return credentials.createSsl(ca, key, cert);
  }
}
