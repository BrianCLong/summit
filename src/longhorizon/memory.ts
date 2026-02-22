import { MemoryNode } from './types';
import { defaultClock, redactValue, sha256, stableStringify } from './utils';

export interface MemoryStoreOptions {
  tenantId: string;
  runId: string;
}

export class MemoryStore {
  private readonly nodes = new Map<string, MemoryNode>();
  private readonly tenantId: string;
  private readonly runId: string;

  constructor(options: MemoryStoreOptions) {
    this.tenantId = options.tenantId;
    this.runId = options.runId;
  }

  addNode(
    scope: MemoryNode['scope'],
    payload: Record<string, unknown>,
  ): MemoryNode {
    const redactedPayload = redactValue(payload) as Record<string, unknown>;
    const serialized = stableStringify(redactedPayload);
    const id = sha256(`${scope}:${this.runId}:${serialized}`);
    const createdAt = defaultClock().toISOString();
    const node: MemoryNode = {
      id,
      scope,
      tenantId: this.tenantId,
      runId: this.runId,
      payload: redactedPayload,
      createdAt,
      redacted: JSON.stringify(payload) !== JSON.stringify(redactedPayload),
    };
    this.nodes.set(id, node);
    return node;
  }

  list(scope?: MemoryNode['scope']): MemoryNode[] {
    const values = Array.from(this.nodes.values());
    if (!scope) {
      return values;
    }
    return values.filter((node) => node.scope === scope);
  }

  get(id: string): MemoryNode | undefined {
    return this.nodes.get(id);
  }
}
