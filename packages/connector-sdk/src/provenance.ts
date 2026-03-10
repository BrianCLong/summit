import crypto from "node:crypto";

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys(obj[key]);
        return acc;
      }, {});
  }
  return value;
}

export function sha256(value: unknown): string {
  const serialized = typeof value === "string" ? value : stableStringify(value);
  return `sha256:${crypto.createHash("sha256").update(serialized).digest("hex")}`;
}

export function deterministicRunId(connectorId: string, input: unknown): string {
  const digest = sha256({ connectorId, input }).replace("sha256:", "").slice(0, 16);
  return `run:${connectorId}:${digest}`;
}
