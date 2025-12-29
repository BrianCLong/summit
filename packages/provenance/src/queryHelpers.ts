export interface ProvenanceRecord {
  receiptId: string;
  correlationId?: string;
  decisionId?: string;
  parentDecisionId?: string | null;
  createdAt?: string;
  [key: string]: unknown;
}

export interface ProvenanceQueryAdapter<T extends ProvenanceRecord = ProvenanceRecord> {
  findMany: (filter: Partial<ProvenanceRecord>) => Promise<T[]>;
  findOne: (filter: Partial<ProvenanceRecord>) => Promise<T | null>;
}

const MAX_LINEAGE_DEPTH = 25;

function ensureId(value: string, field: string): void {
  if (!value || value.trim().length === 0) {
    throw new Error(`${field} is required to query provenance records`);
  }
}

function sortByCreatedAt<T extends ProvenanceRecord>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
    return aTime - bTime;
  });
}

export async function fetchByCorrelationId<T extends ProvenanceRecord>(
  adapter: ProvenanceQueryAdapter<T>,
  correlationId: string,
): Promise<T[]> {
  ensureId(correlationId, 'correlationId');
  const results = await adapter.findMany({ correlationId });
  return sortByCreatedAt(results);
}

export async function fetchByReceiptId<T extends ProvenanceRecord>(
  adapter: ProvenanceQueryAdapter<T>,
  receiptId: string,
): Promise<T | null> {
  ensureId(receiptId, 'receiptId');
  const record = await adapter.findOne({ receiptId });
  return record;
}

export interface DecisionLineageOptions {
  /**
   * Optional depth limit to protect against unexpected cycles.
   * Defaults to a conservative guard value.
   */
  maxDepth?: number;
}

export async function fetchDecisionLineage<T extends ProvenanceRecord>(
  adapter: ProvenanceQueryAdapter<T>,
  decisionId: string,
  options: DecisionLineageOptions = {},
): Promise<T[]> {
  ensureId(decisionId, 'decisionId');
  const { maxDepth = MAX_LINEAGE_DEPTH } = options;
  const lineage: T[] = [];
  const visited = new Set<string>();
  let currentId: string | null = decisionId;
  let depth = 0;

  while (currentId && depth < maxDepth) {
    if (visited.has(currentId)) {
      break;
    }

    const node = await adapter.findOne({ decisionId: currentId });
    if (!node) {
      break;
    }

    lineage.push(node);
    visited.add(currentId);
    currentId = node.parentDecisionId ?? null;
    depth += 1;
  }

  return sortByCreatedAt(lineage);
}
