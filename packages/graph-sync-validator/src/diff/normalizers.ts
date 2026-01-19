import crypto from 'node:crypto';

export type NormNode = {
  type: string;
  id: string;
  labels: string[];
  propsHash: string;
  props: Record<string, unknown>;
};

export type NormEdge = {
  fromType: string;
  fromId: string;
  rel: string;
  toType: string;
  toId: string;
  propsHash: string;
};

export function stableStringify(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return String(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(',')}]`;
  }
  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  const entries = Object.keys(obj)
    .sort()
    .map((key) => {
      const value = (obj as Record<string, unknown>)[key];
      return `${JSON.stringify(key)}:${stableStringify(value)}`;
    });
  return `{${entries.join(',')}}`;
}

export function hashProps(props: Record<string, unknown>): string {
  const serialized = stableStringify(props);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

export function normalizeLabels(labels: string[] | undefined): string[] {
  return Array.from(new Set((labels ?? []).map(String))).sort();
}

export function nodeKey(n: Pick<NormNode, 'type' | 'id'>): string {
  return `${n.type}:${n.id}`;
}

export function edgeKey(e: Omit<NormEdge, 'propsHash'>): string {
  return `${e.fromType}:${e.fromId}-[${e.rel}]->${e.toType}:${e.toId}`;
}
