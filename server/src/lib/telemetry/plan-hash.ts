import * as crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';

const CANON_KEYS = new Set(['operatorType', 'planner', 'arguments', 'details', 'identifiers']);
const IGNORED_KEYS = new Set(['rows', 'dbHits', 'pageCacheHits', 'pageCacheMisses', 'time', 'rowsIn', 'rowsOut']);

// Helper to strip dynamic execution stats from a plan to create a canonical shape.
function _stripDynamic(node: any): any {
  if (node === null || typeof node !== 'object') {
    return node;
  }

  // Handle arrays (e.g. children list) by mapping
  if (Array.isArray(node)) {
    return node.map((item: any) => _stripDynamic(item));
  }

  // Handle objects (plan nodes OR property objects like arguments)
  const kept: { [key: string]: any } = {};

  // Heuristic: A plan node has 'operatorType'.
  // If it's a plan node, we apply strict filtering (allowlist CANON_KEYS + structure).
  // If it's just a value object (like arguments), we keep all keys (but still strip IGNORED_KEYS).
  const isPlanNode = 'operatorType' in node;

  for (const [key, value] of Object.entries(node)) {
    if (IGNORED_KEYS.has(key)) continue;

    let shouldKeep = true;
    if (isPlanNode) {
        const isCanon = CANON_KEYS.has(key);
        const isStructure = typeof value === 'object' && value !== null;
        shouldKeep = isCanon || isStructure;
    }

    if (shouldKeep) {
      kept[key] = _stripDynamic(value);
    }
  }

  // Deterministic child ordering based on operatorType and arguments
  // Only applies if 'children' exists and is an array (Plan Node property)
  if (Array.isArray(kept.children)) {
    kept.children.sort((a: any, b: any) => {
      const opA = a.operatorType || '';
      const opB = b.operatorType || '';
      if (opA < opB) return -1;
      if (opA > opB) return 1;

      // Secondary sort: canonical json string of arguments
      const argsA = stringify(a.arguments || {});
      const argsB = stringify(b.arguments || {});
      if (argsA < argsB) return -1;
      if (argsA > argsB) return 1;
      return 0;
    });
  }

  return kept;
}

/**
 * Returns a canonical JSON string for a plan, stripping runtime stats.
 */
export function canonicalJson(planJson: any): string {
  const canon = _stripDynamic(planJson);
  // stringify sorts object keys deterministically
  return stringify(canon);
}

/**
 * Returns a SHA256 fingerprint of the canonical plan.
 */
export function planFingerprint(planJson: any): string {
  const cj = canonicalJson(planJson);
  return crypto.createHash('sha256').update(cj).digest('hex');
}
