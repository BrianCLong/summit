import { createHash } from "node:crypto";

/**
 * Normalize SQL for stable hashing:
 * - Strip block and line comments
 * - Normalize whitespace
 * - Lowercase keywords-ish (entire string lowercased for determinism)
 * - Remove trailing semicolons
 */
export function normalizeSql(sql: string): string {
  const noBlock = sql.replace(/\/\*[\s\S]*?\*\//g, " ");
  const noLine = noBlock.replace(/--[^\n\r]*/g, " ");
  const squashed = noLine
    .replace(/\s+/g, " ")
    .replace(/\s*;+\s*$/g, "")
    .trim();
  return squashed.toLowerCase();
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Deterministic JSON stringify with stable key ordering.
 * - Objects: keys sorted by codepoint
 * - Arrays: preserve order (caller must sort arrays deterministically)
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(stableNormalize(value));
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableNormalize);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = stableNormalize(obj[k]);
    return out;
  }
  return value;
}
