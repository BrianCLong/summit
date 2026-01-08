import type { CostEstimate, CypherPlanEstimate } from "./types.js";

const RELATION_PATTERN = /-?\[[^\]]*\]-?>|<-\[[^\]]*\]-?|-->|<--/g;
const LIMIT_PATTERN = /LIMIT\s+(\d+)/i;
const WRITE_PATTERN = /\b(create|merge|delete|drop|set|detach|remove)\b/i;

function extractLimit(cypher: string): number | null {
  const match = cypher.match(LIMIT_PATTERN);
  if (!match) {
    return null;
  }
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function estimateDepth(cypher: string): number {
  const segments = cypher.match(RELATION_PATTERN) ?? [];
  let depth = 0;
  for (const segment of segments) {
    const variableRange = segment.match(/\*(\d+)/);
    if (variableRange?.[1]) {
      depth += Number.parseInt(variableRange[1], 10);
      continue;
    }
    depth += 1;
  }
  if (depth === 0 && /MATCH\s*\(/i.test(cypher)) {
    return 1;
  }
  return depth;
}

export function estimateRows(cypher: string, costEstimate?: CostEstimate): number {
  const limit = extractLimit(cypher);
  const base = costEstimate?.anticipatedRows ?? 50;
  if (limit !== null) {
    return Math.max(1, Math.min(limit, base));
  }
  const filteredMatch = cypher.match(/WHERE\s+/i);
  if (filteredMatch) {
    return Math.max(1, Math.round(base * 0.6));
  }
  return base;
}

export function buildCostScore(rows: number, depth: number): number {
  const normalizedRows = Math.min(rows, 1000);
  const score = normalizedRows / 10 + depth * 12;
  return Math.min(100, Math.max(1, Math.round(score)));
}

export function hasWriteIntent(text: string): boolean {
  const normalized = text.toLowerCase();
  return WRITE_PATTERN.test(normalized) || normalized.includes("delete");
}

export function analyzeCypherPlan(
  cypher: string,
  options: {
    maxDepth?: number;
    approved?: boolean;
    costEstimate?: CostEstimate;
    prompt?: string;
  } = {}
): { estimate: CypherPlanEstimate; warnings: string[] } {
  const depth = estimateDepth(cypher);
  const rows = estimateRows(cypher, options.costEstimate);
  const costScore = buildCostScore(rows, depth);
  const warnings: string[] = [];
  const containsWrite =
    hasWriteIntent(cypher) || (options.prompt ? hasWriteIntent(options.prompt) : false);
  const maxDepth = options.maxDepth ?? 3;
  if (depth > maxDepth && !options.approved) {
    warnings.push(
      `Expansion depth ${depth} exceeds sandbox cap of ${maxDepth}. Approved execution is required.`
    );
  }
  if (containsWrite) {
    warnings.push("write operations are blocked in sandbox mode.");
  }
  return {
    estimate: { rows, depth, costScore, containsWrite },
    warnings,
  };
}
