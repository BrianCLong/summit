export type Selector = {
  table: string;
  label: string;
  pk: { column: string; asId: string; type?: 'string' | 'number' };
  properties: Array<{ column: string; prop: string; type: 'string' | 'number' | 'boolean' | 'date' }>;
  rels?: Array<{
    fromPk: string;
    to: { table: string; label: string; pk: string };
    type: string;
    direction: 'OUT' | 'IN';
  }>;
};

export type DriftFinding =
  | { kind: 'MISSING_NODE'; id: string; label: string; severity: number; data?: any }
  | { kind: 'MISSING_REL'; fromId: string; toId: string; type: string; severity: number }
  | { kind: 'PROP_MISMATCH'; id: string; label: string; prop: string; expected: any; actual: any; severity: number }
  | { kind: 'ORPHAN_NODE'; id: string; label: string; severity: number }
  | { kind: 'ORPHAN_REL'; fromId: string; toId: string; type: string; severity: number };

export type DriftReport = {
  runId: string;
  selectorsVersion: string;
  startedAt: string;
  finishedAt: string;
  totals: Record<string, number>;
  findings: DriftFinding[];
  autofixPlan: { cypher: string[]; sql: string[] };
  metrics: { scannedRows: number; scannedNodes: number; scannedRels: number; durationMs: number };
  deterministicHash: string;
};
