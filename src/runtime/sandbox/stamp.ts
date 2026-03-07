import { createHash } from "node:crypto";

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stableValue(entry));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right)
    );
    return Object.fromEntries(entries.map(([key, entry]) => [key, stableValue(entry)]));
  }

  return value;
}

export function stableInputsHash(inputs: Record<string, unknown>): string {
  const normalized = stableValue(inputs);
  const json = JSON.stringify(normalized);
  return createHash("sha256").update(json).digest("hex");
}
