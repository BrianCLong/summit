import { randomUUID } from 'crypto';
import type {
  AssistantMessage,
  JSONRecord,
  RichOutputPayload,
} from './types.js';
import { provenanceLedger } from './provenance-ledger.js';

export interface AssistantAdapter {
  readonly key: string;
  readonly name: string;
  init(): Promise<void>;
  capabilities(): string[];
  startThread(sessionId: string, agentId: string): Promise<void>;
  sendMessage(options: {
    sessionId: string;
    agentId: string;
    content: string;
    attachments?: string[];
  }): Promise<AssistantMessage>;
  attach(options: {
    sessionId: string;
    agentId: string;
    type: 'text' | 'image' | 'file';
    uri: string;
  }): Promise<string>;
  streamTokens?(options: {
    sessionId: string;
    agentId: string;
    content: string;
  }): AsyncGenerator<string, void, unknown>;
  stop(sessionId: string, agentId: string): Promise<void>;
  summarizeThread(
    sessionId: string,
    agentId: string,
  ): Promise<RichOutputPayload>;
}

abstract class BaseAdapter implements AssistantAdapter {
  abstract readonly key: string;
  abstract readonly name: string;

  async init(): Promise<void> {
    // no-op for in-memory adapters
  }

  capabilities(): string[] {
    return ['code-edit', 'diff', 'run-script', 'attachments'];
  }

  async startThread(sessionId: string, agentId: string): Promise<void> {
    provenanceLedger.record(this.key, 'start-thread', { sessionId, agentId });
  }

  async sendMessage(options: {
    sessionId: string;
    agentId: string;
    content: string;
    attachments?: string[];
  }): Promise<AssistantMessage> {
    const response: AssistantMessage = {
      id: randomUUID(),
      agentId: options.agentId,
      role: 'assistant',
      content: this.generateResponse(options.content),
      createdAt: new Date().toISOString(),
      attachmentIds: options.attachments,
      richOutput: this.maybeGenerateRichOutput(options.content),
    };
    provenanceLedger.record(
      this.key,
      'assistant-message',
      response as unknown as JSONRecord,
    );
    return response;
  }

  async attach(options: {
    sessionId: string;
    agentId: string;
    type: 'text' | 'image' | 'file';
    uri: string;
  }): Promise<string> {
    const id = randomUUID();
    provenanceLedger.record(this.key, 'attach', { ...options, id });
    return id;
  }

  async stop(sessionId: string, agentId: string): Promise<void> {
    provenanceLedger.record(this.key, 'stop', { sessionId, agentId });
  }

  async summarizeThread(
    sessionId: string,
    agentId: string,
  ): Promise<RichOutputPayload> {
    const payload: RichOutputPayload = {
      kind: 'markdown',
      title: `Summary for ${agentId}`,
      data: `Session ${sessionId} summary generated at ${new Date().toISOString()}`,
    };
    provenanceLedger.record(this.key, 'summarize-thread', {
      sessionId,
      agentId,
    });
    return payload;
  }

  protected generateResponse(content: string): string {
    return `Acknowledged: ${content}`;
  }

  protected maybeGenerateRichOutput(
    content: string,
  ): RichOutputPayload | undefined {
    if (content.includes('table:')) {
      return {
        kind: 'table',
        data: {
          headers: ['Column', 'Value'],
          rows: content
            .split('table:')[1]
            .split(',')
            .map((entry) => {
              const [column, value] = entry
                .split('=')
                .map((part) => part.trim());
              return { column, value };
            }),
        },
      };
    }
    if (content.includes('diagram:')) {
      return {
        kind: 'diagram',
        data: {
          mermaid: content.split('diagram:')[1].trim(),
        },
      };
    }
    return undefined;
  }
}

class ClaudeCodeAdapter extends BaseAdapter {
  readonly key = 'claude-code';
  readonly name = 'Claude Code';

  override capabilities(): string[] {
    return [...super.capabilities(), 'semantic-diff', 'lsp-integration'];
  }

  protected override generateResponse(content: string): string {
    return `Claude synthesized a plan for: ${content}`;
  }
}

class CodexAdapter extends BaseAdapter {
  readonly key = 'codex';
  readonly name = 'OpenAI Codex';

  override capabilities(): string[] {
    return [...super.capabilities(), 'quick-fix', 'tests'];
  }

  protected override generateResponse(content: string): string {
    return `Codex proposed implementation for: ${content}`;
  }
}

export class AdapterRegistry {
  private adapters = new Map<string, AssistantAdapter>();

  constructor(initialAdapters: AssistantAdapter[] = []) {
    initialAdapters.forEach((adapter) => this.register(adapter));
  }

  register(adapter: AssistantAdapter): void {
    this.adapters.set(adapter.key, adapter);
  }

  get(key: string): AssistantAdapter {
    const adapter = this.adapters.get(key);
    if (!adapter) {
      throw new Error(`Unknown adapter ${key}`);
    }
    return adapter;
  }

  list(): AssistantAdapter[] {
    return Array.from(this.adapters.values());
  }
}

export const adapterRegistry = new AdapterRegistry([
  new ClaudeCodeAdapter(),
  new CodexAdapter(),
]);
