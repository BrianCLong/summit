import tar from "tar-stream";
import { createGzip } from "zlib";
import { Manifest } from "../ledger";

export interface ReceiptRecord {
  id: string;
  subject: string;
  type: string;
  issuedAt: string;
  actor?: string;
  payload: Record<string, any>;
  [key: string]: any;
}

export interface PolicyDecisionRecord {
  id: string;
  decision: "allow" | "deny" | "review";
  rationale: string;
  policy: string;
  createdAt: string;
  attributes?: Record<string, any>;
}

export interface RedactionRules {
  allowReceiptIds?: string[];
  redactFields?: string[];
  maskFields?: string[];
}

export interface RedactionMetadata {
  applied: boolean;
  droppedReceipts: string[];
  redactedFields: string[];
  maskedFields: string[];
}

export interface BundleMetadata {
  redaction: RedactionMetadata;
  counts: {
    receipts: number;
    policyDecisions: number;
  };
}

export interface ExportBundleInput {
  manifest: Manifest & Record<string, any>;
  receipts?: ReceiptRecord[];
  policyDecisions?: PolicyDecisionRecord[];
  redaction?: RedactionRules;
  attachments?: Record<string, any>;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function scrubValue(
  value: any,
  rules: RedactionRules,
  meta: { redacted: Set<string>; masked: Set<string> },
  path: string
): any {
  if (Array.isArray(value)) {
    return value.map((entry, idx) => scrubValue(entry, rules, meta, `${path}[${idx}]`));
  }

  if (value && typeof value === "object") {
    const next: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (rules.redactFields?.includes(key) || rules.redactFields?.includes(currentPath)) {
        meta.redacted.add(currentPath);
        continue;
      }
      if (rules.maskFields?.includes(key) || rules.maskFields?.includes(currentPath)) {
        meta.masked.add(currentPath);
        next[key] = "[REDACTED]";
        continue;
      }
      next[key] = scrubValue(val, rules, meta, currentPath);
    }
    return next;
  }

  return value;
}

function applyRedaction<T extends Record<string, any>>(
  records: T[],
  rules: RedactionRules
): { data: T[]; metadata: RedactionMetadata } {
  const allowed =
    rules.allowReceiptIds && rules.allowReceiptIds.length > 0
      ? records.filter((r: any) => rules.allowReceiptIds?.includes(r.id))
      : records;
  const droppedReceipts =
    rules.allowReceiptIds && rules.allowReceiptIds.length > 0
      ? records.filter((r: any) => !rules.allowReceiptIds?.includes(r.id)).map((r: any) => r.id)
      : [];

  const redacted = new Set<string>();
  const masked = new Set<string>();
  const cleaned = allowed.map((record) =>
    scrubValue(clone(record), rules, { redacted, masked }, "")
  );

  const metadata: RedactionMetadata = {
    applied: droppedReceipts.length > 0 || redacted.size > 0 || masked.size > 0,
    droppedReceipts,
    redactedFields: Array.from(redacted).sort(),
    maskedFields: Array.from(masked).sort(),
  };

  return { data: cleaned, metadata };
}

export function assembleExportBundle(input: ExportBundleInput): {
  stream: NodeJS.ReadableStream;
  metadata: BundleMetadata;
  manifest: Manifest & Record<string, any>;
} {
  const receipts = input.receipts ?? [];
  const policyDecisions = input.policyDecisions ?? [];
  const rules = input.redaction ?? {};

  const receiptResult = applyRedaction(receipts, rules);
  const policyResult = applyRedaction(policyDecisions, {
    ...rules,
    allowReceiptIds: undefined,
  });

  const redaction: RedactionMetadata = {
    applied: receiptResult.metadata.applied || policyResult.metadata.applied,
    droppedReceipts: receiptResult.metadata.droppedReceipts,
    redactedFields: Array.from(
      new Set([...receiptResult.metadata.redactedFields, ...policyResult.metadata.redactedFields])
    ).sort(),
    maskedFields: Array.from(
      new Set([...receiptResult.metadata.maskedFields, ...policyResult.metadata.maskedFields])
    ).sort(),
  };

  const metadata: BundleMetadata = {
    redaction,
    counts: {
      receipts: receiptResult.data.length,
      policyDecisions: policyResult.data.length,
    },
  };

  const manifest = {
    ...input.manifest,
    export: {
      generatedAt: new Date().toISOString(),
      receipts: metadata.counts.receipts,
      policyDecisions: metadata.counts.policyDecisions,
      redaction,
    },
  };

  const pack = tar.pack();
  pack.entry({ name: "manifest.json" }, JSON.stringify(manifest, null, 2));
  pack.entry({ name: "receipts.json" }, JSON.stringify(receiptResult.data, null, 2));
  pack.entry({ name: "policy-decisions.json" }, JSON.stringify(policyResult.data, null, 2));
  pack.entry({ name: "metadata.json" }, JSON.stringify(metadata, null, 2));
  if (input.attachments) {
    for (const [name, content] of Object.entries(input.attachments)) {
      pack.entry({ name }, JSON.stringify(content, null, 2));
    }
  }
  pack.finalize();

  const gzip = createGzip();
  pack.pipe(gzip);

  return { stream: gzip, metadata, manifest };
}
