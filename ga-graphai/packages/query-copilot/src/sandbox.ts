import type {
  SandboxDataset,
  SandboxExecuteInput,
  SandboxResult,
  SandboxRow,
} from './types.js';

const WRITE_PATTERN = /\b(create|merge|delete|drop|set)\b/i;

const DEFAULT_DATASET: SandboxDataset = {
  nodes: [
    {
      id: 'person-1',
      label: 'Person',
      properties: { name: 'Alice Carter', risk: 'medium', location: 'Berlin' },
    },
    {
      id: 'person-2',
      label: 'Person',
      properties: { name: 'Brian Lewis', risk: 'low', location: 'Paris' },
    },
    {
      id: 'org-1',
      label: 'Organization',
      properties: { name: 'Helios Analytics', sector: 'Energy' },
    },
    {
      id: 'org-2',
      label: 'Organization',
      properties: { name: 'Northwind Intelligence', sector: 'Security' },
    },
    {
      id: 'case-1',
      label: 'Case',
      properties: { title: 'Orion Breach', severity: 'high' },
    },
  ],
  relationships: [
    {
      id: 'r-1',
      type: 'EMPLOYED_BY',
      from: 'person-1',
      to: 'org-1',
      properties: { role: 'Analyst' },
    },
    {
      id: 'r-2',
      type: 'EMPLOYED_BY',
      from: 'person-2',
      to: 'org-2',
      properties: { role: 'Consultant' },
    },
    {
      id: 'r-3',
      type: 'INVOLVED_IN',
      from: 'person-1',
      to: 'case-1',
      properties: { role: 'suspect' },
    },
  ],
};

function ensureReadOnly(cypher: string): void {
  if (WRITE_PATTERN.test(cypher)) {
    throw new Error(
      'Sandbox execution only supports read-only Cypher statements',
    );
  }
}

function extractPrimaryMatch(
  cypher: string,
): { alias: string; label: string } | null {
  const match = cypher.match(/MATCH\s*\((\w+):([^)]+)\)/i);
  if (!match) {
    return null;
  }
  return { alias: match[1], label: match[2] };
}

function extractRelationshipMatch(
  cypher: string,
): {
  alias: string;
  type: string;
  neighborAlias: string;
  neighborLabel: string;
} | null {
  const relationMatch = cypher.match(
    /MATCH\s*\((\w+)\)[-<]*\[([^:\]]+):([A-Z0-9_]+)\][-*>]*\((\w+):([^)]+)\)/i,
  );
  if (!relationMatch) {
    return null;
  }
  return {
    alias: relationMatch[1],
    type: relationMatch[3],
    neighborAlias: relationMatch[4],
    neighborLabel: relationMatch[5],
  };
}

function extractWhereClause(
  cypher: string,
): { alias: string; property: string; value: string; operator: string } | null {
  const whereMatch = cypher.match(
    /WHERE\s+(\w+)\.(\w+)\s+(CONTAINS|=)\s+toLower\('([^']+)'\)|WHERE\s+(\w+)\.(\w+)\s+(CONTAINS|=)\s+'([^']+)'/i,
  );
  if (!whereMatch) {
    return null;
  }
  if (whereMatch[1]) {
    return {
      alias: whereMatch[1],
      property: whereMatch[2],
      operator: whereMatch[3],
      value: whereMatch[4],
    };
  }
  return {
    alias: whereMatch[5],
    property: whereMatch[6],
    operator: whereMatch[7],
    value: whereMatch[8],
  };
}

function selectNodes(
  dataset: SandboxDataset,
  label: string,
): SandboxDataset['nodes'] {
  return dataset.nodes.filter((node) => node.label === label);
}

function matchesFilter(
  node: SandboxDataset['nodes'][number],
  filter: ReturnType<typeof extractWhereClause>,
): boolean {
  if (!filter) {
    return true;
  }
  if (filter.alias && filter.property in node.properties) {
    const rawValue = node.properties[filter.property];
    if (typeof rawValue !== 'string') {
      return false;
    }
    const compare = rawValue.toLowerCase();
    if (filter.operator.toUpperCase() === 'CONTAINS') {
      return compare.includes(filter.value.toLowerCase());
    }
    return compare === filter.value.toLowerCase();
  }
  return true;
}

function buildRow(
  alias: string,
  node: SandboxDataset['nodes'][number],
  relationship: { type: string; neighborAlias: string } | null,
  neighbor: SandboxDataset['nodes'][number] | null,
): SandboxRow {
  const columns = [alias];
  const values: Record<string, unknown> = { [alias]: node.properties };
  if (relationship && neighbor) {
    columns.push(relationship.neighborAlias);
    values[relationship.neighborAlias] = neighbor.properties;
  }
  return { columns, values };
}

function evaluatePolicy(tenantId: string, purpose: string): string[] {
  const warnings: string[] = [];
  if (purpose === 'exploration' && tenantId.startsWith('prod')) {
    warnings.push(
      'Exploration mode in production tenant triggers manual review.',
    );
  }
  return warnings;
}

function buildPlan(
  primaryLabel: string,
  relationship: { type: string; neighborLabel: string } | null,
): string[] {
  const plan = [`NodeByLabelScan(${primaryLabel})`];
  if (relationship) {
    plan.push(`Expand(${relationship.type} -> ${relationship.neighborLabel})`);
  }
  plan.push('Projection(columns)');
  return plan;
}

function lookupNeighbor(
  dataset: SandboxDataset,
  relationship: { type: string; neighborAlias: string; neighborLabel: string },
  nodeId: string,
) {
  const edges = dataset.relationships.filter(
    (rel) => rel.type === relationship.type && rel.from === nodeId,
  );
  if (edges.length === 0) {
    return null;
  }
  const neighborNodeId = edges[0].to;
  return (
    dataset.nodes.find(
      (node) =>
        node.id === neighborNodeId && node.label === relationship.neighborLabel,
    ) ?? null
  );
}

export function sandboxExecute(input: SandboxExecuteInput): SandboxResult {
  const cypher = input.cypher.trim();
  ensureReadOnly(cypher);
  const dataset = input.dataset ?? DEFAULT_DATASET;
  const primary = extractPrimaryMatch(cypher);
  if (!primary) {
    throw new Error('Unable to parse MATCH clause from Cypher statement');
  }
  const relationship = extractRelationshipMatch(cypher);
  const filter = extractWhereClause(cypher);
  const candidates = selectNodes(dataset, primary.label).filter((node) =>
    matchesFilter(node, filter),
  );
  const rows: SandboxRow[] = [];
  for (const node of candidates) {
    const neighbor = relationship
      ? lookupNeighbor(dataset, relationship, node.id)
      : null;
    rows.push(
      buildRow(
        primary.alias,
        node,
        relationship
          ? {
              type: relationship.type,
              neighborAlias: relationship.neighborAlias,
            }
          : null,
        neighbor,
      ),
    );
  }
  const latencyMs = Math.min(
    input.timeoutMs ?? 800,
    60 + rows.length * 8 + (relationship ? 45 : 25),
  );
  const policyWarnings = evaluatePolicy(input.tenantId, input.policy.purpose);
  const plan = buildPlan(
    primary.label,
    relationship
      ? { type: relationship.type, neighborLabel: relationship.neighborLabel }
      : null,
  );

  return {
    rows,
    columns: rows[0]?.columns ?? [primary.alias],
    latencyMs,
    truncated: rows.length > 50,
    plan,
    policyWarnings,
  };
}
