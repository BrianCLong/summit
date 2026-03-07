import crypto from "crypto";
import { PiiRule } from "./types.js";

function applyAction(value: unknown, action: PiiRule["action"]): unknown {
  if (action === "drop") return undefined;
  if (action === "redact") return "[REDACTED]";
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function getNested(record: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, record);
}

function setNested(record: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = record;
  parts.forEach((part, idx) => {
    if (idx === parts.length - 1) {
      if (value === undefined) {
        delete current[part];
      } else {
        current[part] = value;
      }
    } else {
      if (!current[part] || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
  });
}

export class PiiGuard {
  private readonly rules: PiiRule[];

  constructor(rules: PiiRule[]) {
    this.rules = rules;
  }

  tag(record: Record<string, unknown>): string[] {
    const tags: string[] = [];
    for (const rule of this.rules) {
      const value = getNested(record, rule.path);
      if (value !== undefined) {
        tags.push(rule.path);
      }
    }
    return tags;
  }

  redact(record: Record<string, unknown>): Record<string, unknown> {
    const output = JSON.parse(JSON.stringify(record));
    for (const rule of this.rules) {
      const value = getNested(output, rule.path);
      if (value === undefined) continue;
      setNested(output, rule.path, applyAction(value, rule.action));
    }
    return output;
  }
}
