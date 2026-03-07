import crypto from "crypto";

export interface ContextInput {
  scope: string;
  entities?: Record<string, unknown>[];
  notes?: string[];
  docsMetadata?: Record<string, unknown>[];
  hypotheses?: string[];
  canarySecret?: string;
}

export interface ContextPack {
  scope: string;
  redactedFields: string[];
  provenance: string[];
  sections: Record<string, unknown>;
  size: { tokens: number; bytes: number };
  warnings: string[];
}

const DEFAULT_ALLOWED_FIELDS = ["id", "name", "summary", "type", "createdAt"];

function sanitizeValue(value: unknown, redactedFields: string[], canary?: string): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    const sanitized = value.replace(/(password|secret|api key)/gi, "[REDACTED]");
    if (canary && sanitized.includes(canary)) {
      redactedFields.push("canary");
      return sanitized.replace(new RegExp(canary, "g"), "[REDACTED]");
    }
    return sanitized;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, redactedFields, canary));
  }
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (!DEFAULT_ALLOWED_FIELDS.includes(key)) {
        redactedFields.push(key);
        continue;
      }
      result[key] = sanitizeValue(val, redactedFields, canary);
    }
    return result;
  }
  return value;
}

function estimateTokens(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export class ContextPacker {
  constructor(
    private maxBytes = 4096,
    private maxTokens = 800
  ) {}

  build(input: ContextInput): ContextPack {
    const redactedFields: string[] = [];
    const provenance: string[] = [];
    const sections: Record<string, unknown> = {};
    const orderedSections: [string, unknown][] = [
      ["entities", input.entities ?? []],
      ["notes", input.notes ?? []],
      ["docsMetadata", input.docsMetadata ?? []],
      ["hypotheses", input.hypotheses ?? []],
    ];

    for (const [sectionName, data] of orderedSections) {
      const sanitized = sanitizeValue(data, redactedFields, input.canarySecret);
      sections[sectionName] = sanitized;
      provenance.push(
        `${sectionName}:${crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex").slice(0, 8)}`
      );
    }

    const serialized = JSON.stringify(sections);
    let bytes = Buffer.byteLength(serialized, "utf8");
    let tokens = estimateTokens(serialized);
    const warnings: string[] = [];

    if (bytes > this.maxBytes || tokens > this.maxTokens) {
      warnings.push("Context truncated to respect size limits");
      const trimmed = serialized.slice(0, this.maxBytes);
      bytes = Buffer.byteLength(trimmed, "utf8");
      tokens = estimateTokens(trimmed);
      sections.__truncated = true;
    }

    return {
      scope: input.scope,
      redactedFields: Array.from(new Set(redactedFields)).sort(),
      provenance,
      sections,
      size: { tokens, bytes },
      warnings,
    };
  }
}
