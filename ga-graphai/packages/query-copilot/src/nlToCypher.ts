import { randomUUID } from 'node:crypto';
import type {
  CostEstimate,
  GraphNode,
  GraphRelationship,
  NLToCypherOptions,
  NLToCypherResult,
} from './types.js';

const COUNT_PATTERNS = [/\bhow many\b/, /\bcount\b/];
const RELATION_PATTERNS: Array<{
  pattern: RegExp;
  direction: 'out' | 'in' | 'any';
}> = [
  { pattern: /connected to|linked to|associated with/, direction: 'any' },
  { pattern: /worked with|works with|collaborated with/, direction: 'any' },
  { pattern: /from|originating in|born in/, direction: 'out' },
];

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'list',
  'show',
  'all',
  'of',
  'for',
  'that',
  'who',
  'which',
  'are',
  'is',
  'with',
  'related',
  'to',
  'in',
  'by',
  'on',
  'at',
]);

function normalise(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
}

function tokenize(input: string): string[] {
  return normalise(input)
    .split(/\s+/)
    .filter((token) => token && !STOPWORDS.has(token));
}

function scoreNode(promptTokens: string[], node: GraphNode): number {
  const labels = [node.label, ...(node.synonyms ?? [])].map((label) =>
    label.toLowerCase(),
  );
  const labelTokens = labels.flatMap((label) => label.split(/\s+/));
  let score = 0;
  for (const token of promptTokens) {
    if (labelTokens.includes(token)) {
      score += 2;
    }
  }
  for (const property of node.properties) {
    if (promptTokens.includes(property.toLowerCase())) {
      score += 1;
    }
  }
  return score;
}

function pickNode(
  promptTokens: string[],
  schema: NLToCypherOptions['schema'],
): GraphNode | null {
  let best: GraphNode | null = null;
  let bestScore = 0;
  for (const node of schema.nodes) {
    const score = scoreNode(promptTokens, node);
    if (score > bestScore) {
      best = node;
      bestScore = score;
    }
  }
  return best;
}

function pickRelationship(
  prompt: string,
  primary: GraphNode | null,
  schema: NLToCypherOptions['schema'],
): GraphRelationship | null {
  if (!primary) {
    return null;
  }
  const lowered = prompt.toLowerCase();
  for (const { pattern, direction } of RELATION_PATTERNS) {
    if (pattern.test(lowered)) {
      const candidate = schema.relationships.find((rel) => {
        const synonyms = [rel.type, ...(rel.synonyms ?? [])].map((name) =>
          name.toLowerCase(),
        );
        const matchesPrimary =
          rel.from.toLowerCase() === primary.label.toLowerCase() ||
          rel.to.toLowerCase() === primary.label.toLowerCase();
        return (
          matchesPrimary && synonyms.some((name) => lowered.includes(name))
        );
      });
      if (candidate) {
        return {
          ...candidate,
          direction:
            direction === 'any' ? (candidate.direction ?? 'out') : direction,
        };
      }
    }
  }
  return null;
}

function buildCostEstimate(
  limit: number | undefined,
  relationship: GraphRelationship | null,
): CostEstimate {
  const baseRows = relationship ? 200 : 75;
  const anticipatedRows = Math.min(limit ?? baseRows, baseRows);
  const estimatedLatencyMs = relationship ? 320 : 180;
  const estimatedRru = Math.max(
    1,
    Math.round((anticipatedRows / 50) * (relationship ? 1.6 : 1.1)),
  );
  return { anticipatedRows, estimatedLatencyMs, estimatedRru };
}

function buildWhereClause(
  prompt: string,
  node: GraphNode | null,
  alias: string,
): string | null {
  if (!node) {
    return null;
  }
  const lowered = prompt.toLowerCase();
  for (const property of node.properties) {
    const pattern = new RegExp(
      `${property.toLowerCase()}\\s+(?:is|equals|matching|named)\\s+([^,]+)`,
    );
    const match = lowered.match(pattern);
    if (match) {
      const value = match[1].trim().replace(/[^a-z0-9\s]/gi, '');
      if (value) {
        return `WHERE toLower(${alias}.${property}) CONTAINS toLower('${value}')`;
      }
    }
  }
  const quoted = prompt.match(/"([^"]+)"|'([^']+)'/);
  if (quoted?.[1] || quoted?.[2]) {
    const literal = quoted[1] ?? quoted[2];
    return `WHERE toLower(${alias}.${node.properties[0]}) CONTAINS toLower('${literal}')`;
  }
  return null;
}

function buildReturnClause(
  isCount: boolean,
  alias: string,
  relationshipAlias: string | null,
): string {
  if (isCount) {
    return `RETURN count(${alias}) AS total`;
  }
  const base = relationshipAlias ? `${alias}, ${relationshipAlias}` : alias;
  return `RETURN ${base} LIMIT 50`;
}

export function nlToCypher(
  prompt: string,
  options: NLToCypherOptions,
): NLToCypherResult {
  if (!prompt.trim()) {
    throw new Error('Prompt must be provided');
  }
  const tokens = tokenize(prompt);
  const selectedNode = pickNode(tokens, options.schema);
  const relationship = pickRelationship(prompt, selectedNode, options.schema);
  const alias = selectedNode
    ? (selectedNode.label.at(0)?.toLowerCase() ?? 'n')
    : 'n';
  const relationAlias = relationship
    ? `${relationship.type.at(0)?.toLowerCase() ?? 'r'}${randomUUID().slice(0, 4)}`
    : null;
  const neighborAlias = relationship
    ? `${
        (relationship.from === (selectedNode?.label ?? '')
          ? relationship.to
          : relationship.from
        )
          .at(0)
          ?.toLowerCase() ?? 'm'
      }${randomUUID().slice(0, 4)}`
    : null;
  const targetLabel = selectedNode
    ? selectedNode.label
    : (options.schema.nodes[0]?.label ?? 'Entity');
  const matchParts = [`MATCH (${alias}:${targetLabel})`];
  if (relationship) {
    const direction = relationship.direction ?? 'out';
    const relSegment = `[${relationAlias}:${relationship.type}]`;
    const otherLabel =
      relationship.from === targetLabel ? relationship.to : relationship.from;
    if (direction === 'in') {
      matchParts.push(
        `MATCH (${alias})<-${relSegment}-(${neighborAlias}:${otherLabel})`,
      );
    } else {
      matchParts.push(
        `MATCH (${alias})-${relSegment}->(${neighborAlias}:${otherLabel})`,
      );
    }
  }

  const whereClause = buildWhereClause(prompt, selectedNode, alias);
  const count = COUNT_PATTERNS.some((pattern) =>
    pattern.test(prompt.toLowerCase()),
  );
  const clauses = [...matchParts];
  if (whereClause) {
    clauses.push(whereClause);
  }
  const returnClause = buildReturnClause(count, alias, neighborAlias);
  clauses.push(returnClause);

  const reasoning: string[] = [];
  if (selectedNode) {
    reasoning.push(
      `Selected node label \`${selectedNode.label}\` based on prompt tokens.`,
    );
  } else {
    reasoning.push(
      'Fell back to default node label because no direct match was detected.',
    );
  }
  if (relationship) {
    reasoning.push(
      `Linked relationship \`${relationship.type}\` inferred from relational phrasing.`,
    );
  }
  if (whereClause) {
    reasoning.push(
      'Applied textual filter derived from quoted or property specific prompt fragment.',
    );
  }

  const costEstimate = buildCostEstimate(options.limit, relationship);
  const warnings: string[] = [];
  if (!selectedNode) {
    warnings.push(
      'Prompt did not map cleanly to a schema label; using default.',
    );
  }

  return {
    cypher: clauses.join('\n'),
    costEstimate,
    reasoning,
    citations: relationship ? ['schema.relationships'] : ['schema.nodes'],
    warnings,
  };
}
