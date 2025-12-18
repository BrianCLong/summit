import { randomUUID } from 'crypto';

type ContextLayer = 'local' | 'task' | 'world' | 'agent';

export type ContextAffordance =
  | 'describable'
  | 'runnable'
  | 'editable'
  | 'inspectable'
  | 'requires-auth'
  | 'requires-human-review'
  | 'mutation-allowed'
  | 'mutation-forbidden';

export interface ContextNode {
  id: string;
  layer: ContextLayer;
  kind: string;
  title?: string;
  tags?: string[];
  data: Record<string, unknown>;
  invariants?: string[];
  affordances: ContextAffordance[];
  supersedes?: string[];
  supersededBy?: string | null;
  provenance: {
    source: string;
    author?: string;
    timestamp: string;
  };
}

export interface ContextDelta {
  id: string;
  kind: 'add' | 'modify' | 'supersede' | 'retract' | 'decision';
  summary: string;
  timestamp: string;
  author?: string;
  linkedNodeIds: string[];
  payload?: Record<string, unknown>;
}

export interface ContextContract {
  requiredKinds?: string[];
  forbiddenKinds?: string[];
  requiredTags?: string[];
  forbiddenTags?: string[];
  layerAllowlist?: ContextLayer[];
  maxNodes?: number;
}

export interface ContextAssemblyRequest {
  goal: string;
  includeLayers?: ContextLayer[];
  includeKinds?: string[];
  excludeKinds?: string[];
  requiredAffordances?: ContextAffordance[];
  strict?: boolean;
  contract?: ContextContract;
}

export interface ContextPacket {
  goal: string;
  assembledAt: string;
  nodes: ContextNode[];
  deltas: ContextDelta[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

class ContextLedger {
  private readonly deltas: ContextDelta[] = [];

  record(delta: ContextDelta): ContextDelta {
    this.deltas.push(delta);
    return delta;
  }

  all(): ContextDelta[] {
    return [...this.deltas];
  }
}

class ContextGraph {
  private readonly nodes = new Map<string, ContextNode>();

  upsert(node: ContextNode): ContextNode {
    const supersedes = node.supersedes ?? [];
    for (const id of supersedes) {
      const superseded = this.nodes.get(id);
      if (superseded) {
        this.nodes.set(id, { ...superseded, supersededBy: node.id });
      }
    }
    const normalized: ContextNode = {
      ...node,
      supersedes: unique(supersedes),
      supersededBy: node.supersededBy ?? null,
    };
    this.nodes.set(node.id, normalized);
    return normalized;
  }

  supersede(targetId: string, replacement: ContextNode): ContextNode {
    const superseded = this.nodes.get(targetId);
    if (superseded) {
      this.nodes.set(targetId, { ...superseded, supersededBy: replacement.id });
    }
    return this.upsert(replacement);
  }

  activeNodes(): ContextNode[] {
    return [...this.nodes.values()].filter((node) => !node.supersededBy);
  }
}

export class MetaContextOrchestrator {
  private readonly graph = new ContextGraph();
  private readonly ledger = new ContextLedger();

  registerNode(node: Omit<ContextNode, 'id' | 'provenance'> & {
    id?: string;
    provenance?: ContextNode['provenance'];
  }): ContextNode {
    const id = node.id ?? randomUUID();
    const provenance = node.provenance ?? {
      source: 'unknown',
      timestamp: nowIso(),
    };
    const normalized: ContextNode = {
      ...node,
      id,
      provenance,
      affordances: node.affordances ?? [],
      supersedes: node.supersedes ?? [],
      supersededBy: node.supersededBy ?? null,
    };
    const stored = this.graph.upsert(normalized);
    this.ledger.record({
      id: randomUUID(),
      kind: normalized.supersedes?.length ? 'supersede' : 'add',
      summary: normalized.title ?? normalized.kind,
      timestamp: nowIso(),
      author: provenance.author,
      linkedNodeIds: [stored.id, ...(normalized.supersedes ?? [])],
      payload: { layer: normalized.layer, tags: normalized.tags ?? [] },
    });
    return stored;
  }

  recordDelta(delta: Omit<ContextDelta, 'id' | 'timestamp'> & { id?: string }): ContextDelta {
    const normalized: ContextDelta = {
      ...delta,
      id: delta.id ?? randomUUID(),
      timestamp: delta.timestamp ?? nowIso(),
      linkedNodeIds: delta.linkedNodeIds ?? [],
    };
    this.ledger.record(normalized);
    return normalized;
  }

  assemble(request: ContextAssemblyRequest): ContextPacket {
    const includeLayers = request.includeLayers ?? ['local', 'task', 'world', 'agent'];
    const includeKinds = request.includeKinds ?? [];
    const excludeKinds = new Set(request.excludeKinds ?? []);
    const requiredAffordances = request.requiredAffordances ?? [];
    const activeNodes = this.graph
      .activeNodes()
      .filter((node) => includeLayers.includes(node.layer))
      .filter((node) => (includeKinds.length === 0 ? true : includeKinds.includes(node.kind)))
      .filter((node) => !excludeKinds.has(node.kind))
      .filter((node) =>
        requiredAffordances.every((affordance) => node.affordances.includes(affordance)),
      );

    this.enforceContract(activeNodes, request.contract, request.strict ?? false);

    return {
      goal: request.goal,
      assembledAt: nowIso(),
      nodes: activeNodes,
      deltas: this.ledger.all(),
    };
  }

  private enforceContract(
    nodes: ContextNode[],
    contract?: ContextContract,
    strict = false,
  ): void {
    if (!contract) {
      return;
    }

    if (contract.layerAllowlist) {
      const invalid = nodes.filter((node) => !contract.layerAllowlist?.includes(node.layer));
      if (invalid.length > 0) {
        throw new Error(`Contract violation: disallowed layers ${invalid.map((node) => node.layer).join(',')}`);
      }
    }

    if (contract.forbiddenKinds) {
      const forbidden = nodes.filter((node) => contract.forbiddenKinds?.includes(node.kind));
      if (forbidden.length > 0) {
        throw new Error(`Contract violation: forbidden kinds ${forbidden.map((node) => node.kind).join(',')}`);
      }
    }

    if (contract.forbiddenTags && contract.forbiddenTags.length > 0) {
      const forbiddenNodes = nodes.filter((node) =>
        (node.tags ?? []).some((tag) => contract.forbiddenTags?.includes(tag)),
      );
      if (forbiddenNodes.length > 0) {
        throw new Error(
          `Contract violation: forbidden tags present on ${forbiddenNodes.map((node) => node.id).join(',')}`,
        );
      }
    }

    if (contract.requiredKinds && strict) {
      for (const required of contract.requiredKinds) {
        if (!nodes.some((node) => node.kind === required)) {
          throw new Error(`Contract violation: missing required kind ${required}`);
        }
      }
    }

    if (contract.requiredTags && strict) {
      for (const tag of contract.requiredTags) {
        if (!nodes.some((node) => (node.tags ?? []).includes(tag))) {
          throw new Error(`Contract violation: missing required tag ${tag}`);
        }
      }
    }

    if (contract.maxNodes && nodes.length > contract.maxNodes) {
      throw new Error(
        `Contract violation: assembled context exceeds maximum nodes (${nodes.length}/${contract.maxNodes})`,
      );
    }
  }
}

export type { ContextLayer };
