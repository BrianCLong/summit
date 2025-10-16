import {
  Session,
  InvokeArgs,
  ToolDescriptor,
  ResourceDescriptor,
  PromptDescriptor,
} from './types';
import { sse, SseMessage } from './sse';

export class McpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async connect(toolClass: string): Promise<Session> {
    const res = await fetch(`${this.baseUrl}/v1/session`, {
      method: 'POST',
      headers: this.jsonHeaders(),
      body: JSON.stringify({ toolClass }),
    });
    if (!res.ok) throw new Error(`connect failed: ${res.status}`);
    return res.json();
  }

  async invoke(session: Session, input: InvokeArgs) {
    const res = await fetch(`${this.baseUrl}/v1/session/${session.id}/invoke`, {
      method: 'POST',
      headers: this.jsonHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`invoke failed: ${res.status}`);
    return res.json();
  }

  async release(session: Session) {
    const res = await fetch(`${this.baseUrl}/v1/session/${session.id}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
    });
    if (!res.ok && res.status !== 404)
      throw new Error(`release failed: ${res.status}`);
  }

  listTools(): Promise<ToolDescriptor[]> {
    return this.getTyped('/.well-known/mcp-tools');
  }

  listResources(): Promise<ResourceDescriptor[]> {
    return this.getTyped('/.well-known/mcp-resources');
  }

  listPrompts(): Promise<PromptDescriptor[]> {
    return this.getTyped('/.well-known/mcp-prompts');
  }

  stream(session: Session): AsyncGenerator<SseMessage> {
    return sse(`${this.baseUrl}/v1/stream/${session.id}`, this.authHeaders());
  }

  private async getTyped<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: this.authHeaders(),
    });
    if (!res.ok) throw new Error(`fetch ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  }

  private authHeaders() {
    return {
      authorization: `Bearer ${this.token}`,
    };
  }

  private jsonHeaders() {
    return {
      'content-type': 'application/json',
      ...this.authHeaders(),
    };
  }
}
