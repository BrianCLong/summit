import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export type BoundingBox = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
};

export type TextSpan = {
  start: number;
  end: number;
  label?: string;
};

export type RedactionInstructions = {
  boundingBoxes: BoundingBox[];
  textSpans: TextSpan[];
};

export type EvidenceRecord = {
  id: string;
  mimeType: string;
  content: Buffer;
  createdAt: string;
};

export type RedactionActor = {
  id: string;
  role: string;
};

export type RedactionRequest = {
  evidenceId: string;
  instructions: RedactionInstructions;
  reasonCode: string;
  actor: RedactionActor;
};

export type RedactedSnippet = TextSpan & {
  hash: string;
  replacement: string;
  snippet: string;
};

export type BoundingBoxOverlay = BoundingBox & { hash: string };

export type RedactionOverlay = {
  artifactId: string;
  baseEvidenceId: string;
  instructionsVersion: number;
  reasonCode: string;
  generatedAt: string;
  overlays: {
    pages: Array<{
      page: number;
      boxes: BoundingBoxOverlay[];
    }>;
    textSpans: RedactedSnippet[];
  };
};

export type DerivativeArtifact = {
  artifactId: string;
  evidenceId: string;
  version: number;
  instructionsHash: string;
  cacheKey: string;
  createdAt: string;
  originalChecksum: string;
  reasonCode: string;
  redactedBy: string;
  redactedByRole: string;
  redactedContent: string;
  snippetHashes: string[];
  overlay: RedactionOverlay;
  storagePath: string;
};

export type RedactionProvenance = {
  derivativeId: string;
  evidenceId: string;
  redactedBy: string;
  role: string;
  reasonCode: string;
  instructionsVersion: number;
  instructionsHash: string;
  timestamp: string;
};

export interface EvidenceStore {
  get(id: string): Promise<EvidenceRecord | undefined>;
}

export interface DerivativeStore {
  findByInstructionsHash(evidenceId: string, instructionsHash: string): DerivativeArtifact | undefined;
  nextVersion(evidenceId: string, instructionsHash: string): number;
  save(artifact: DerivativeArtifact): Promise<void>;
  getById(artifactId: string): DerivativeArtifact | undefined;
}

export class InMemoryEvidenceStore implements EvidenceStore {
  private records = new Map<string, EvidenceRecord>();

  add(record: EvidenceRecord) {
    this.records.set(record.id, record);
  }

  async get(id: string): Promise<EvidenceRecord | undefined> {
    return this.records.get(id);
  }
}

export class FileSystemDerivativeStore implements DerivativeStore {
  private derivatives = new Map<string, DerivativeArtifact>();
  private instructionVersions = new Map<string, Map<string, number>>();

  constructor(public readonly basePath: string) {}

  findByInstructionsHash(evidenceId: string, instructionsHash: string): DerivativeArtifact | undefined {
    for (const artifact of this.derivatives.values()) {
      if (artifact.evidenceId === evidenceId && artifact.instructionsHash === instructionsHash) {
        return artifact;
      }
    }
    return undefined;
  }

  nextVersion(evidenceId: string, instructionsHash: string): number {
    const versionMap = this.instructionVersions.get(evidenceId) ?? new Map<string, number>();
    if (versionMap.has(instructionsHash)) {
      return versionMap.get(instructionsHash)!;
    }
    const next = versionMap.size + 1;
    versionMap.set(instructionsHash, next);
    this.instructionVersions.set(evidenceId, versionMap);
    return next;
  }

  async save(artifact: DerivativeArtifact): Promise<void> {
    this.derivatives.set(artifact.artifactId, artifact);
    await fs.mkdir(path.dirname(artifact.storagePath), { recursive: true });
    await fs.writeFile(artifact.storagePath, JSON.stringify(artifact, null, 2), 'utf8');
  }

  getById(artifactId: string): DerivativeArtifact | undefined {
    return this.derivatives.get(artifactId);
  }
}

export class RedactionProvenanceLedger {
  private ledger = new Map<string, RedactionProvenance>();

  record(entry: RedactionProvenance) {
    this.ledger.set(entry.derivativeId, entry);
  }

  get(derivativeId: string): RedactionProvenance | undefined {
    return this.ledger.get(derivativeId);
  }
}

const ALLOWED_ROLES = new Set(['admin', 'analyst', 'compliance', 'auditor']);

export class RedactionPipeline {
  constructor(
    private opts: {
      evidenceStore: EvidenceStore;
      derivativeStore: DerivativeStore;
      provenanceLedger: RedactionProvenanceLedger;
      clock?: () => Date;
      featureFlag?: string;
    },
  ) {}

  async applyRedaction(request: RedactionRequest): Promise<{
    artifact: DerivativeArtifact;
    provenance: RedactionProvenance;
  }> {
    this.ensureEnabled();
    this.ensureAuthorized(request.actor.role);

    const evidence = await this.opts.evidenceStore.get(request.evidenceId);
    if (!evidence) {
      throw new Error(`Evidence ${request.evidenceId} not found`);
    }

    const normalizedInstructions = normalizeInstructions(request.instructions);
    const instructionsHash = hashObject(normalizedInstructions);
    const existing = this.opts.derivativeStore.findByInstructionsHash(request.evidenceId, instructionsHash);
    if (existing) {
      const provenance = this.opts.provenanceLedger.get(existing.artifactId);
      if (provenance) {
        return { artifact: existing, provenance };
      }
    }

    const version = this.opts.derivativeStore.nextVersion(request.evidenceId, instructionsHash);
    const now = (this.opts.clock ?? (() => new Date()))().toISOString();
    const artifactId = hashObject({
      evidenceId: evidence.id,
      instructionsHash,
      version,
    }).slice(0, 32);

    const originalContent = evidence.content.toString('utf8');
    const { redactedContent, snippets } = applyTextRedactions(originalContent, normalizedInstructions.textSpans);
    const boxOverlays = normalizedInstructions.boundingBoxes.map((box) => ({ ...box, hash: hashObject(box) }));
    const overlay = buildOverlay({
      artifactId,
      baseEvidenceId: evidence.id,
      instructionsVersion: version,
      reasonCode: request.reasonCode,
      generatedAt: now,
      snippets,
      boxes: boxOverlays,
    });

    const storagePath = path.join(this.resolveBasePath(), evidence.id, `${artifactId}.json`);
    const artifact: DerivativeArtifact = {
      artifactId,
      evidenceId: evidence.id,
      version,
      instructionsHash,
      cacheKey: `${artifactId}:${instructionsHash}`,
      createdAt: now,
      originalChecksum: hashBuffer(evidence.content),
      reasonCode: request.reasonCode,
      redactedBy: request.actor.id,
      redactedByRole: request.actor.role,
      redactedContent,
      snippetHashes: [...snippets.map((s) => s.hash), ...boxOverlays.map((b) => b.hash)],
      overlay,
      storagePath,
    };

    await this.opts.derivativeStore.save(artifact);
    const provenance: RedactionProvenance = {
      derivativeId: artifact.artifactId,
      evidenceId: artifact.evidenceId,
      redactedBy: request.actor.id,
      role: request.actor.role,
      reasonCode: request.reasonCode,
      instructionsVersion: version,
      instructionsHash,
      timestamp: now,
    };
    this.opts.provenanceLedger.record(provenance);

    return { artifact, provenance };
  }

  private ensureEnabled() {
    const flag = this.opts.featureFlag ?? process.env.REDACTION_PIPELINE;
    if (flag !== '1') {
      throw new Error('Redaction pipeline disabled (set REDACTION_PIPELINE=1 to enable)');
    }
  }

  private ensureAuthorized(role: string) {
    if (!ALLOWED_ROLES.has(role)) {
      throw new Error(`Role ${role} is not permitted to perform redactions`);
    }
  }

  private resolveBasePath() {
    const base =
      this.opts.derivativeStore instanceof FileSystemDerivativeStore
        ? this.opts.derivativeStore.basePath
        : path.join(process.cwd(), 'derivatives');
    return path.resolve(base);
  }
}

function applyTextRedactions(content: string, spans: TextSpan[]): { redactedContent: string; snippets: RedactedSnippet[] } {
  const normalized = spans
    .map((span) => ({
      start: Math.max(0, span.start),
      end: Math.min(content.length, span.end),
      label: span.label,
    }))
    .filter((span) => span.end > span.start)
    .sort((a, b) => a.start - b.start);

  let cursor = 0;
  const parts: string[] = [];
  const snippets: RedactedSnippet[] = [];

  for (const span of normalized) {
    if (span.start > cursor) {
      parts.push(content.slice(cursor, span.start));
    }
    const snippet = content.slice(span.start, span.end);
    const replacement = '█'.repeat(span.end - span.start);
    parts.push(replacement);

    snippets.push({
      ...span,
      snippet,
      replacement,
      hash: hashObject({ snippet, start: span.start, end: span.end, label: span.label }),
    });
    cursor = span.end;
  }

  if (cursor < content.length) {
    parts.push(content.slice(cursor));
  }

  return { redactedContent: parts.join(''), snippets };
}

function hashObject(obj: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

function hashBuffer(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function normalizeInstructions(instructions: RedactionInstructions): RedactionInstructions {
  const textSpans = [...instructions.textSpans].sort((a, b) => a.start - b.start || a.end - b.end);
  const boundingBoxes = [...instructions.boundingBoxes].sort(
    (a, b) => a.page - b.page || a.y - b.y || a.x - b.x,
  );
  return { boundingBoxes, textSpans };
}

function buildOverlay(input: {
  artifactId: string;
  baseEvidenceId: string;
  instructionsVersion: number;
  reasonCode: string;
  generatedAt: string;
  snippets: RedactedSnippet[];
  boxes: BoundingBoxOverlay[];
}): RedactionOverlay {
  const pageMap = new Map<number, BoundingBoxOverlay[]>();
  for (const box of input.boxes) {
    const list = pageMap.get(box.page) ?? [];
    list.push(box);
    pageMap.set(box.page, list);
  }

  return {
    artifactId: input.artifactId,
    baseEvidenceId: input.baseEvidenceId,
    instructionsVersion: input.instructionsVersion,
    reasonCode: input.reasonCode,
    generatedAt: input.generatedAt,
    overlays: {
      pages: Array.from(pageMap.entries()).map(([page, boxes]) => ({ page, boxes })),
      textSpans: input.snippets,
    },
  };
}
