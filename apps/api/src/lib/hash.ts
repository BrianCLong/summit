import crypto from "node:crypto";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const canonicalize = (value: JsonValue): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${canonicalize(val)}`)
    .join(",")}}`;
};

export const hashExecutionInput = (payload: { action?: string; input: JsonValue }): string => {
  const normalized = canonicalize({
    action: payload.action ?? "default",
    input: payload.input,
  });

  return crypto.createHash("sha256").update(normalized).digest("hex");
};
