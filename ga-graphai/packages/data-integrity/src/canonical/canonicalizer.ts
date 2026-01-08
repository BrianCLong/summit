import { createHash } from "node:crypto";

export interface CanonicalizationOptions {
  normalizeTimezone?: boolean;
}

function normalizeNumber(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  return Number.parseFloat(value.toFixed(12));
}

function normalizeDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString();
}

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === "number") {
    return normalizeNumber(value);
  }
  if (typeof value === "string") {
    return normalizeWhitespace(value).normalize("NFC");
  }
  if (value instanceof Date) {
    return normalizeDate(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry));
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    entries.sort(([a], [b]) => a.localeCompare(b));
    return entries.reduce<Record<string, unknown>>((acc, [key, val]) => {
      acc[key] = normalizeValue(val);
      return acc;
    }, {});
  }
  return value;
}

export function canonicalize(value: unknown, options: CanonicalizationOptions = {}): unknown {
  if (options.normalizeTimezone && typeof value === "string") {
    return normalizeDate(value);
  }
  return normalizeValue(value);
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function stableHash(value: unknown): string {
  return createHash("sha256").update(canonicalStringify(value)).digest("hex");
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeUnicode(value: string): string {
  return value.normalize("NFC");
}

export function normalizeTimestamp(value: string | Date): string {
  return normalizeDate(value);
}
