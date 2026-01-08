import { createHash, randomUUID } from "crypto";
import tar from "tar-stream";
import { createGzip, createGunzip } from "zlib";
import { merkleRoot } from "../ledger";

export interface Receipt {
  id: string;
  subject: string;
  issuedAt: string;
  amount?: number;
  [key: string]: unknown;
}

export interface PolicyDecision {
  id: string;
  rule: string;
  outcome: "allow" | "deny" | "redact" | string;
  issuedAt: string;
  rationale?: string[];
  subjectId?: string;
  [key: string]: unknown;
}

export interface RedactionRules {
  receipts?: string[];
  policyDecisions?: string[];
  manifest?: string[];
}

export interface SelectiveDisclosure {
  receiptIds?: string[];
  decisionIds?: string[];
}

export interface ManifestMetadata {
  id?: string;
  caseId?: string;
  requestedBy?: string;
  policyVersion?: string;
  purpose?: string;
  note?: string;
}

export interface ReceiptBundleManifest extends ManifestMetadata {
  id: string;
  version: string;
  generatedAt: string;
  receiptCount: number;
  policyDecisionCount: number;
  receipts: Array<{ id: string; hash: string; redactedFields: string[] }>;
  policyDecisions: Array<{ id: string; hash: string; redactedFields: string[] }>;
  merkleRoot: string;
  redactionsApplied?: RedactionRules;
  selectiveDisclosure?: SelectiveDisclosure;
}

export interface BundleAssemblyInput {
  receipts: Receipt[];
  policyDecisions: PolicyDecision[];
  manifest?: ManifestMetadata;
  redaction?: RedactionRules;
  selectiveDisclosure?: SelectiveDisclosure;
}

export interface BundleAssemblyResult {
  bundle: Buffer;
  manifest: ReceiptBundleManifest;
  receipts: Receipt[];
  policyDecisions: PolicyDecision[];
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function hashEntity(entity: unknown): string {
  return createHash("sha256").update(JSON.stringify(entity)).digest("hex");
}

function redactEntity<T extends object>(
  entity: T,
  fields?: string[]
): { redacted: T; removed: string[] } {
  if (!fields || fields.length === 0) {
    return { redacted: entity, removed: [] };
  }

  const workingCopy = deepClone(entity) as Record<string, unknown>;
  const removed: string[] = [];

  for (const field of fields) {
    if (field in workingCopy) {
      delete workingCopy[field];
      removed.push(field);
    }
  }

  return { redacted: workingCopy as T, removed };
}

function filterByIds<T extends { id: string }>(items: T[], allowedIds?: string[]): T[] {
  if (!allowedIds || allowedIds.length === 0) {
    return items;
  }
  const allowed = new Set(allowedIds);
  return items.filter((item) => allowed.has(item.id));
}

async function gzipPack(pack: tar.Pack): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const gzip = createGzip();

  return new Promise<Buffer>((resolve, reject) => {
    gzip.on("data", (chunk) => chunks.push(chunk as Buffer));
    gzip.on("end", () => resolve(Buffer.concat(chunks)));
    gzip.on("error", reject);
    pack.on("error", reject);
    pack.pipe(gzip);
  });
}

export async function assembleReceiptBundle(
  input: BundleAssemblyInput
): Promise<BundleAssemblyResult> {
  const redaction = input.redaction || {};
  const selectiveDisclosure = input.selectiveDisclosure;

  const receipts = filterByIds(input.receipts, selectiveDisclosure?.receiptIds);
  const decisions = filterByIds(input.policyDecisions, selectiveDisclosure?.decisionIds);

  const receiptRecords = receipts.map((receipt) => {
    const { redacted, removed } = redactEntity(deepClone(receipt), redaction.receipts);
    return {
      record: redacted,
      hash: hashEntity(redacted),
      removed,
    };
  });

  const decisionRecords = decisions.map((decision) => {
    const { redacted, removed } = redactEntity(deepClone(decision), redaction.policyDecisions);
    return {
      record: redacted,
      hash: hashEntity(redacted),
      removed,
    };
  });

  const manifest: ReceiptBundleManifest = {
    id: input.manifest?.id || randomUUID(),
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    receiptCount: receiptRecords.length,
    policyDecisionCount: decisionRecords.length,
    receipts: receiptRecords.map((receipt) => ({
      id: receipt.record.id,
      hash: receipt.hash,
      redactedFields: receipt.removed,
    })),
    policyDecisions: decisionRecords.map((decision) => ({
      id: decision.record.id,
      hash: decision.hash,
      redactedFields: decision.removed,
    })),
    merkleRoot: merkleRoot([
      ...receiptRecords.map((r) => r.hash),
      ...decisionRecords.map((d) => d.hash),
    ]),
    selectiveDisclosure: selectiveDisclosure,
    ...input.manifest,
  };

  const { redacted: manifestForBundle, removed: removedManifestFields } = redactEntity(
    manifest,
    redaction.manifest
  );
  const manifestWithRedactions = manifestForBundle as unknown as ReceiptBundleManifest;

  manifestWithRedactions.redactionsApplied = {
    ...redaction,
    manifest: redaction.manifest ?? removedManifestFields,
  };

  const pack = tar.pack();
  pack.entry(
    { name: "receipts.json" },
    JSON.stringify(
      receiptRecords.map((r) => r.record),
      null,
      2
    )
  );
  pack.entry(
    { name: "policy-decisions.json" },
    JSON.stringify(
      decisionRecords.map((d) => d.record),
      null,
      2
    )
  );
  pack.entry({ name: "manifest.json" }, JSON.stringify(manifestWithRedactions, null, 2));

  const bundlePromise = gzipPack(pack);
  pack.finalize();
  const bundle = await bundlePromise;

  return {
    bundle,
    manifest: manifestWithRedactions,
    receipts: receiptRecords.map((r) => r.record),
    policyDecisions: decisionRecords.map((d) => d.record),
  };
}

export async function unpackBundle(bundle: Buffer): Promise<Record<string, string>> {
  const extract = tar.extract();
  const gunzip = createGunzip();
  const files: Record<string, string> = {};

  return new Promise<Record<string, string>>((resolve, reject) => {
    extract.on("entry", (header, stream, next) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk) => chunks.push(chunk as Buffer));
      stream.on("end", () => {
        files[header.name] = Buffer.concat(chunks).toString("utf8");
        next();
      });
      stream.on("error", reject);
      stream.resume();
    });

    extract.on("finish", () => resolve(files));
    extract.on("error", reject);
    gunzip.on("error", reject);

    gunzip.pipe(extract);

    gunzip.end(bundle);
  });
}
