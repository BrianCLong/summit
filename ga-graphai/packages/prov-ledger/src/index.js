import { createHash, createHmac, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  buildLedgerUri,
  collectEvidencePointers,
  normalizeWorkflow
} from "common-types";
function normaliseTimestamp(value) {
  if (value) {
    return new Date(value).toISOString();
  }
  return (/* @__PURE__ */ new Date()).toISOString();
}
function computeHash(entry) {
  const hash = createHash("sha256");
  hash.update(entry.id);
  hash.update(entry.category);
  hash.update(entry.actor);
  hash.update(entry.action);
  hash.update(entry.resource);
  hash.update(JSON.stringify(entry.payload));
  hash.update(entry.timestamp);
  if (entry.previousHash) {
    hash.update(entry.previousHash);
  }
  return hash.digest("hex");
}
class SimpleProvenanceLedger {
  entries = [];
  append(fact) {
    const timestamp = normaliseTimestamp(fact.timestamp);
    const previousHash = this.entries.at(-1)?.hash;
    const entry = {
      ...fact,
      timestamp,
      previousHash,
      hash: ""
    };
    entry.hash = computeHash(entry);
    this.entries.push(entry);
    return entry;
  }
  list(filter) {
    let data = [...this.entries];
    if (filter?.category) {
      data = data.filter((entry) => entry.category === filter.category);
    }
    if (filter?.limit && filter.limit > 0) {
      data = data.slice(-filter.limit);
    }
    return data;
  }
  verify() {
    return this.entries.every((entry, index) => {
      const expectedPrevious = index === 0 ? void 0 : this.entries[index - 1].hash;
      if (expectedPrevious !== entry.previousHash) {
        return false;
      }
      const recalculated = computeHash({ ...entry });
      return recalculated === entry.hash;
    });
  }
  exportEvidence(filter) {
    const entries = this.list(filter);
    return {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      headHash: entries.at(-1)?.hash,
      entries
    };
  }
}
const DAY_IN_MS = 24 * 60 * 60 * 1e3;
const DEFAULT_RETENTION_MS = 365 * DAY_IN_MS;
class ProvenanceLedger {
  now;
  retentionMs;
  records = [];
  bySession = /* @__PURE__ */ new Map();
  byRepo = /* @__PURE__ */ new Map();
  constructor(options = {}) {
    this.now = options.now ?? (() => /* @__PURE__ */ new Date());
    this.retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
  }
  async append(event, options) {
    this.prune();
    const receivedAt = (options.receivedAt ?? this.now()).toISOString();
    const checksum = this.computeChecksum(event, options.decision, receivedAt);
    const record2 = {
      ...event,
      policy: options.decision,
      receivedAt,
      checksum,
      budget: options.budget,
      rateLimit: options.rateLimit
    };
    this.records.push(record2);
    this.index(record2);
    return record2;
  }
  list(limit = 200) {
    if (limit >= this.records.length) {
      return [...this.records];
    }
    return this.records.slice(this.records.length - limit);
  }
  findBySession(sessionId) {
    return this.bySession.get(sessionId) ?? [];
  }
  findByRepo(repo) {
    return this.byRepo.get(repo) ?? [];
  }
  findByRequest(requestId) {
    return this.records.find((record2) => record2.provenance.requestId === requestId);
  }
  stats() {
    return {
      totalRecords: this.records.length,
      uniqueSessions: this.bySession.size,
      uniqueRepos: this.byRepo.size,
      lastDecisionAt: this.records.at(-1)?.receivedAt
    };
  }
  coverageForDiffHashes(repo, diffHashes) {
    const records = this.findByRepo(repo);
    if (diffHashes.length === 0) {
      return { coverage: 1, missing: [] };
    }
    const seen = /* @__PURE__ */ new Set();
    for (const record2 of records) {
      const hash = record2.outputRef?.diffSha256;
      if (hash) {
        seen.add(hash);
      }
    }
    const missing = [];
    for (const hash of diffHashes) {
      if (!seen.has(hash)) {
        missing.push(hash);
      }
    }
    const coverage = 1 - missing.length / diffHashes.length;
    return { coverage, missing };
  }
  prune() {
    if (this.retentionMs === null) {
      return;
    }
    const threshold = this.now().getTime() - this.retentionMs;
    if (threshold <= 0) {
      return;
    }
    while (this.records.length > 0) {
      const record2 = this.records[0];
      const ts = Date.parse(record2.receivedAt);
      if (Number.isNaN(ts) || ts >= threshold) {
        break;
      }
      this.records.shift();
      this.removeFromIndex(record2);
    }
  }
  computeChecksum(event, decision, receivedAt) {
    const hash = createHash("sha256");
    hash.update(JSON.stringify({ event, decision, receivedAt }));
    return hash.digest("hex");
  }
  index(record2) {
    const sessionId = record2.provenance.sessionId;
    if (!this.bySession.has(sessionId)) {
      this.bySession.set(sessionId, []);
    }
    this.bySession.get(sessionId)?.push(record2);
    const repo = record2.repo;
    if (!this.byRepo.has(repo)) {
      this.byRepo.set(repo, []);
    }
    this.byRepo.get(repo)?.push(record2);
  }
  removeFromIndex(record2) {
    const sessionId = record2.provenance.sessionId;
    const sessionRecords = this.bySession.get(sessionId);
    if (sessionRecords) {
      const idx = sessionRecords.indexOf(record2);
      if (idx >= 0) {
        sessionRecords.splice(idx, 1);
      }
      if (sessionRecords.length === 0) {
        this.bySession.delete(sessionId);
      }
    }
    const repo = record2.repo;
    const repoRecords = this.byRepo.get(repo);
    if (repoRecords) {
      const idx = repoRecords.indexOf(record2);
      if (idx >= 0) {
        repoRecords.splice(idx, 1);
      }
      if (repoRecords.length === 0) {
        this.byRepo.delete(repo);
      }
    }
  }
}
function record(run, workflow, context, options = {}) {
  const normalized = normalizeWorkflow(workflow);
  const timestamp = context.timestamp ?? (/* @__PURE__ */ new Date()).toISOString();
  const evidence = collectEvidencePointers(normalized.nodes);
  const inputsHash = hashObject({
    workflowId: normalized.workflowId,
    version: normalized.version,
    policy: normalized.policy,
    constraints: normalized.constraints,
    nodes: normalized.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      params: node.params,
      evidenceOutputs: node.evidenceOutputs
    })),
    edges: normalized.edges
  });
  const outputsHash = hashObject({
    runId: run.runId,
    status: run.status,
    stats: run.stats,
    nodes: options.includeNodeMetrics ? run.nodes : void 0
  });
  const signature = signPayload({
    runId: run.runId,
    workflowId: normalized.workflowId,
    version: normalized.version,
    inputsHash,
    outputsHash,
    timestamp
  }, context.signingKey);
  const ledgerUri = buildLedgerUri(context, run.runId);
  return {
    runId: run.runId,
    workflowId: normalized.workflowId,
    version: normalized.version,
    tenantId: normalized.tenantId,
    status: run.status,
    policy: normalized.policy,
    stats: run.stats,
    evidence,
    inputsHash,
    outputsHash,
    signature,
    ledgerUri,
    timestamp,
    tags: options.evaluationTags
  };
}
function hashObject(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
function signPayload(payload, signingKey) {
  return createHmac("sha256", signingKey).update(JSON.stringify(payload)).digest("hex");
}
function hashPayload(payload) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
function hashPrompt(prompt) {
  return createHash("sha256").update(prompt).digest("hex");
}
function toIso(timestamp) {
  return timestamp.toISOString();
}
function createProvenanceRecord(input) {
  const start = input.startedAt ?? /* @__PURE__ */ new Date();
  const end = input.completedAt ?? start;
  return {
    reqId: input.reqId,
    step: input.step,
    inputHash: hashPayload(input.input),
    outputHash: hashPayload(input.output),
    modelId: input.modelId,
    ckpt: input.ckpt,
    promptHash: hashPrompt(input.prompt),
    params: input.params,
    scores: input.scores ?? {},
    policy: input.policy,
    time: {
      start: toIso(start),
      end: toIso(end)
    },
    tags: input.tags
  };
}
function signRecord(record2, secret) {
  const payload = JSON.stringify(record2);
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return { record: record2, signature };
}
function verifySignature(entry, secret) {
  const expected = createHmac("sha256", secret).update(JSON.stringify(entry.record)).digest("hex");
  return expected === entry.signature;
}
class CoopProvenanceLedger {
  items = /* @__PURE__ */ new Map();
  secret;
  constructor(secret) {
    this.secret = secret ?? randomUUID();
  }
  append(input) {
    const record2 = createProvenanceRecord(input);
    const signed = signRecord(record2, this.secret);
    const collection = this.items.get(record2.reqId) ?? [];
    collection.push(signed);
    this.items.set(record2.reqId, collection);
    return signed;
  }
  list(reqId) {
    if (!reqId) {
      return Array.from(this.items.values()).flat();
    }
    return [...this.items.get(reqId) ?? []];
  }
  verifyAll(secret) {
    const signerSecret = secret ?? randomUUID();
    return this.list().every((entry) => verifySignature(entry, signerSecret));
  }
  getSecret() {
    return this.secret;
  }
}
class TamperEvidentStore {
  storagePath;
  entries = [];
  constructor(options = {}) {
    this.storagePath = options.storagePath;
    if (this.storagePath && existsSync(this.storagePath)) {
      try {
        const raw = JSON.parse(readFileSync(this.storagePath, "utf-8"));
        if (Array.isArray(raw?.entries)) {
          for (const entry of raw.entries) {
            this.entries.push(entry);
          }
        }
      } catch (error) {
      }
    }
  }
  append(entry) {
    this.entries.push(entry);
    this.persist();
  }
  all() {
    return [...this.entries];
  }
  head() {
    return this.entries.at(-1);
  }
  sliceAfter(hash) {
    if (!hash) {
      return this.all();
    }
    const index = this.entries.findIndex((entry) => entry.hash === hash);
    if (index < 0) {
      return this.all();
    }
    return this.entries.slice(index + 1);
  }
  persist() {
    if (!this.storagePath) {
      return;
    }
    const directory = dirname(this.storagePath);
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }
    writeFileSync(
      this.storagePath,
      JSON.stringify({ entries: this.entries }, null, 2),
      "utf-8"
    );
  }
}
function canonicalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeValue(item));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== void 0).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    const result = {};
    for (const [key, val] of entries) {
      result[key] = canonicalizeValue(val);
    }
    return result;
  }
  return value;
}
function canonicalHash(value) {
  return createHash("sha256").update(JSON.stringify(canonicalizeValue(value))).digest("hex");
}
function cloneEvidenceItem(item) {
  return {
    uri: item.uri,
    hash: item.hash,
    bytes: item.bytes,
    mediaType: item.mediaType,
    label: item.label,
    annotations: item.annotations ? { ...item.annotations } : void 0,
    role: item.role
  };
}
class ClaimLedger {
  chainId;
  signer;
  signingKey;
  environment;
  store;
  claimsById = /* @__PURE__ */ new Map();
  constructor(options = {}) {
    this.chainId = options.chainId ?? "ga-core";
    this.signer = options.signer ?? "claim-ledger";
    this.signingKey = options.signingKey ?? "claim-ledger";
    this.environment = options.environment;
    this.store = new TamperEvidentStore({
      storagePath: options.storagePath
    });
    for (const claim of this.store.all()) {
      this.claimsById.set(claim.claimId, claim);
    }
  }
  listClaims(limit) {
    const entries = this.store.all();
    if (!limit || limit <= 0 || limit >= entries.length) {
      return entries;
    }
    return entries.slice(entries.length - limit);
  }
  getClaim(claimId) {
    return this.claimsById.get(claimId);
  }
  getHead() {
    return this.store.head();
  }
  recordIngestClaim(options) {
    const assertedAt = options.assertedAt ?? (/* @__PURE__ */ new Date()).toISOString();
    const claimId = options.claimId ?? randomUUID();
    const inputs = [
      this.buildEvidenceItem({
        ...cloneEvidenceItem(options.source),
        hash: options.source.hash ?? canonicalHash({
          uri: options.source.uri,
          summary: options.source.summary,
          jobId: options.jobId,
          runId: options.runId
        }),
        label: options.source.label ?? "source",
        role: "input"
      })
    ];
    const outputUri = options.output.uri ?? `graph://${options.datasetId}/ingest/${options.runId}`;
    const outputs = [
      this.buildEvidenceItem({
        uri: outputUri,
        hash: options.output.hash ?? canonicalHash({
          datasetId: options.datasetId,
          runId: options.runId,
          recordCount: options.output.recordCount,
          bytes: options.output.bytes
        }),
        bytes: options.output.bytes,
        mediaType: options.output.mediaType ?? "application/json",
        label: "normalized-records",
        role: "output"
      })
    ];
    const references = options.references?.map(
      (reference) => this.buildEvidenceItem({
        ...cloneEvidenceItem(reference),
        role: reference.role ?? "reference"
      })
    );
    const context = {
      tenantId: options.tenantId,
      datasetId: options.datasetId,
      environment: options.environment ?? this.environment,
      runId: options.runId,
      jobId: options.jobId,
      sourceUri: options.source.uri,
      ...options.metadata
    };
    const draft = {
      chainId: this.chainId,
      claimId,
      layer: "ingest",
      actor: options.actor ?? this.signer,
      assertedAt,
      context,
      evidence: { inputs, outputs, references },
      transform: {
        id: "ingest",
        description: options.metadata?.description ?? "Source ingestion",
        parameters: {
          recordCount: options.output.recordCount,
          sourceMediaType: options.source.mediaType
        }
      }
    };
    return this.persistClaim(draft);
  }
  recordTransformClaim(options) {
    const previous = this.getClaim(options.previousClaimId);
    if (!previous) {
      throw new Error(`unknown previous claim: ${options.previousClaimId}`);
    }
    const assertedAt = options.assertedAt ?? (/* @__PURE__ */ new Date()).toISOString();
    const claimId = options.claimId ?? randomUUID();
    const inputs = previous.evidence.outputs.map((output) => this.buildEvidenceItem({
      uri: output.uri,
      hash: output.hash,
      bytes: output.bytes,
      mediaType: output.mediaType,
      label: output.label ?? `from:${previous.claimId}`,
      annotations: output.annotations,
      role: "input"
    }));
    const outputUri = options.output.uri ?? `graph://${options.datasetId}/transform/${options.transformId}/${options.runId}`;
    const outputs = [
      this.buildEvidenceItem({
        uri: outputUri,
        hash: options.output.hash ?? canonicalHash({
          datasetId: options.datasetId,
          runId: options.runId,
          transformId: options.transformId,
          recordCount: options.output.recordCount ?? previous.evidence.outputs.length,
          bytes: options.output.bytes
        }),
        bytes: options.output.bytes ?? previous.evidence.outputs[0]?.bytes,
        mediaType: options.output.mediaType ?? "application/json",
        label: "transformed-records",
        role: "output"
      })
    ];
    const references = options.references?.map(
      (reference) => this.buildEvidenceItem({
        ...cloneEvidenceItem(reference),
        role: reference.role ?? "reference"
      })
    );
    const context = {
      tenantId: options.tenantId,
      datasetId: options.datasetId,
      environment: options.environment ?? this.environment,
      runId: options.runId,
      transformId: options.transformId,
      ...options.metadata
    };
    const draft = {
      chainId: this.chainId,
      claimId,
      layer: "transform",
      actor: options.actor ?? this.signer,
      assertedAt,
      context,
      evidence: { inputs, outputs, references },
      transform: {
        id: options.transformId,
        description: options.description ?? "Data transformation",
        codeHash: options.codeHash,
        parameters: options.parameters
      }
    };
    return this.persistClaim(draft, previous.hash);
  }
  recordApiClaim(options) {
    const assertedAt = options.assertedAt ?? (/* @__PURE__ */ new Date()).toISOString();
    const claimId = options.claimId ?? randomUUID();
    const baseClaim = options.previousClaimId ? this.getClaim(options.previousClaimId) : this.getHead();
    const inputs = baseClaim ? baseClaim.evidence.outputs.map(
      (output) => this.buildEvidenceItem({
        uri: output.uri,
        hash: output.hash,
        bytes: output.bytes,
        mediaType: output.mediaType,
        label: output.label ?? `from:${baseClaim.claimId}`,
        annotations: output.annotations,
        role: "input"
      })
    ) : [];
    const requestEvidence = options.request ? [
      this.buildEvidenceItem({
        uri: `urn:request:${options.requestId}`,
        hash: canonicalHash(options.request),
        mediaType: "application/json",
        label: "request",
        role: "reference"
      })
    ] : [];
    const responseBody = options.response ?? { statusCode: options.statusCode };
    const responseString = JSON.stringify(canonicalizeValue(responseBody));
    const outputs = [
      this.buildEvidenceItem({
        uri: `urn:response:${options.requestId}`,
        hash: canonicalHash(responseBody),
        bytes: Buffer.byteLength(responseString, "utf-8"),
        mediaType: "application/json",
        label: "response",
        role: "output"
      })
    ];
    const references = requestEvidence.length > 0 ? requestEvidence : void 0;
    const context = {
      tenantId: options.tenantId ?? "system",
      datasetId: options.datasetId,
      environment: options.environment ?? this.environment,
      requestId: options.requestId,
      sourceUri: options.route,
      ...options.metadata
    };
    const draft = {
      chainId: this.chainId,
      claimId,
      layer: "api",
      actor: options.actor ?? this.signer,
      assertedAt,
      context,
      evidence: { inputs, outputs, references },
      transform: {
        description: "API response delivery",
        parameters: {
          route: options.route,
          method: options.method,
          statusCode: options.statusCode
        }
      }
    };
    return this.persistClaim(draft, baseClaim?.hash);
  }
  exportResyncBundle(sinceHash) {
    const entries = this.store.sliceAfter(sinceHash);
    return {
      chainId: this.chainId,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      startHash: sinceHash,
      headHash: this.store.head()?.hash,
      entries
    };
  }
  createExportManifest(options) {
    const claims = this.listClaims();
    const headHash = claims.at(-1)?.hash ?? "";
    const artifacts = options.artifacts.map((artifact) => ({
      path: artifact.path,
      hash: artifact.hash ?? canonicalHash({ path: artifact.path, claimId: artifact.claimId, bytes: artifact.bytes }),
      algorithm: "sha256",
      bytes: artifact.bytes,
      claimId: artifact.claimId,
      role: artifact.role ?? "dataset",
      mediaType: artifact.mediaType,
      description: artifact.description
    }));
    const manifest = {
      manifestVersion: "1.0.0",
      exportId: options.exportId,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      dataset: {
        id: options.datasetId,
        name: options.datasetName,
        description: options.description,
        totalRecords: options.totalRecords,
        sensitivity: options.sensitivity,
        tags: options.tags,
        owner: options.owner
      },
      destination: {
        uri: options.destinationUri,
        format: options.format
      },
      claimChain: {
        chainId: this.chainId,
        head: headHash,
        claims
      },
      ledgerAnchors: options.anchors ?? {
        ingest: claims.find((claim) => claim.layer === "ingest")?.hash,
        transform: claims.filter((claim) => claim.layer === "transform").at(-1)?.hash,
        api: claims.filter((claim) => claim.layer === "api").at(-1)?.hash
      },
      artifacts,
      verification: {
        manifestHash: "",
        includedHashes: claims.map((claim) => claim.hash)
      },
      signatures: []
    };
    manifest.verification.manifestHash = canonicalHash({
      manifestVersion: manifest.manifestVersion,
      exportId: manifest.exportId,
      createdAt: manifest.createdAt,
      dataset: manifest.dataset,
      destination: manifest.destination,
      claimChain: {
        chainId: manifest.claimChain.chainId,
        head: manifest.claimChain.head,
        claimHashes: manifest.claimChain.claims.map((claim) => claim.hash)
      },
      artifacts: manifest.artifacts.map((artifact) => ({
        path: artifact.path,
        hash: artifact.hash,
        bytes: artifact.bytes,
        claimId: artifact.claimId,
        role: artifact.role
      })),
      ledgerAnchors: manifest.ledgerAnchors
    });
    const signature = {
      keyId: `${this.signer}#export`,
      signer: this.signer,
      algorithm: "hmac-sha256",
      signedAt: manifest.createdAt,
      signature: this.sign(manifest.verification.manifestHash)
    };
    manifest.signatures.push(signature);
    return manifest;
  }
  verifyChain() {
    const entries = this.store.all();
    let previousHash;
    for (const entry of entries) {
      if (entry.previousHash !== previousHash) {
        return false;
      }
      const draft = {
        chainId: entry.chainId,
        claimId: entry.claimId,
        layer: entry.layer,
        actor: entry.actor,
        assertedAt: entry.assertedAt,
        context: entry.context,
        evidence: entry.evidence,
        transform: entry.transform
      };
      const expectedHash = this.computeHash(draft, previousHash);
      if (expectedHash !== entry.hash) {
        return false;
      }
      if (this.sign(entry.hash) !== entry.signature) {
        return false;
      }
      previousHash = entry.hash;
    }
    return true;
  }
  persistClaim(draft, previousHash) {
    const hash = this.computeHash(draft, previousHash);
    const signature = this.sign(hash);
    const record2 = {
      ...draft,
      previousHash,
      hash,
      signature
    };
    this.store.append(record2);
    this.claimsById.set(record2.claimId, record2);
    return record2;
  }
  computeHash(draft, previousHash) {
    return canonicalHash({
      chainId: draft.chainId,
      claimId: draft.claimId,
      layer: draft.layer,
      actor: draft.actor,
      assertedAt: draft.assertedAt,
      context: draft.context,
      evidence: draft.evidence,
      transform: draft.transform,
      previousHash
    });
  }
  buildEvidenceItem(input) {
    return {
      uri: input.uri,
      hash: input.hash ?? canonicalHash({ uri: input.uri, label: input.label }),
      algorithm: "sha256",
      bytes: input.bytes,
      mediaType: input.mediaType,
      label: input.label,
      annotations: input.annotations,
      role: input.role ?? "reference"
    };
  }
  sign(payload) {
    return createHmac("sha256", this.signingKey).update(payload).digest("hex");
  }
}
export {
  ClaimLedger,
  CoopProvenanceLedger,
  ProvenanceLedger,
  SimpleProvenanceLedger,
  canonicalHash,
  createProvenanceRecord,
  hashPayload,
  record,
  signRecord,
  verifySignature
};
