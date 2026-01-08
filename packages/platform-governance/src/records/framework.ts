import crypto from "crypto";
import { z } from "zod";

export type RecordDomain = "event" | "object" | "message" | "file";
export type ImmutabilityMode = "append-only" | "versioned";

export interface DomainDefinition {
  domain: RecordDomain;
  description?: string;
  allowedTypes?: string[];
  requiredFields?: string[];
  defaultImmutability?: ImmutabilityMode;
}

const ClassificationSchema = z.enum(["public", "internal", "restricted", "confidential", "secret"]);

export const RecordMetadataSchema = z.object({
  owner: z.string(),
  classification: ClassificationSchema,
  retentionClass: z.string(),
  provenance: z.object({
    source: z.string(),
    transforms: z.array(z.string()).default([]),
    exports: z.array(z.string()).default([]),
  }),
  tags: z.array(z.string()).default([]),
  templateId: z.string().optional(),
});

export type RecordMetadata = z.infer<typeof RecordMetadataSchema>;

export const RecordTemplateSchema = z.object({
  id: z.string(),
  domain: z.enum(["event", "object", "message", "file"]),
  name: z.string(),
  description: z.string(),
  defaultMetadata: RecordMetadataSchema,
  requiredFields: z.array(z.string()).default([]),
});

export type RecordTemplate = z.infer<typeof RecordTemplateSchema>;

export const RecordVersionSchema = z.object({
  versionId: z.string(),
  timestamp: z.date(),
  hash: z.string(),
  data: z.unknown(),
  diff: z.record(z.unknown()).optional(),
  createdBy: z.string(),
  reason: z.string().optional(),
});

export type RecordVersion = z.infer<typeof RecordVersionSchema>;

export const RecordLineageSchema = z.object({
  parents: z.array(z.string()).default([]),
  children: z.array(z.string()).default([]),
});

export type RecordLineage = z.infer<typeof RecordLineageSchema>;

export const RecordEntrySchema = z.object({
  id: z.string(),
  domain: z.enum(["event", "object", "message", "file"]),
  type: z.string(),
  immutability: z.enum(["append-only", "versioned"]),
  metadata: RecordMetadataSchema,
  lineage: RecordLineageSchema,
  versions: z.array(RecordVersionSchema),
  deletedAt: z.date().optional(),
  deletionAttestation: z.string().optional(),
});

export type RecordEntry = z.infer<typeof RecordEntrySchema>;

export interface SearchQuery {
  owner?: string;
  classification?: z.infer<typeof ClassificationSchema>;
  tags?: string[];
  type?: string;
  domain?: RecordDomain;
  from?: Date;
  to?: Date;
}

export interface ExportBundle {
  manifest: Array<{
    id: string;
    versionId: string;
    hash: string;
  }>;
  bundleHash: string;
  payload: Record<string, unknown>;
}

export interface IntegrityViolation {
  recordId: string;
  versionId: string;
  expected: string;
  actual: string;
}

export interface AuditEvent {
  recordId: string;
  action: "create" | "update" | "export" | "delete";
  actor: string;
  timestamp: Date;
  details?: Record<string, unknown>;
  previousHash: string;
  hash: string;
}

function calculateHash(payload: unknown, previousHash?: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify(payload));
  if (previousHash) {
    hash.update(previousHash);
  }
  return hash.digest("hex");
}

function diffObjects(before: any, after: any): Record<string, unknown> {
  const diff: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const key of keys) {
    const beforeValue = before?.[key];
    const afterValue = after?.[key];
    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      diff[key] = { before: beforeValue, after: afterValue };
    }
  }
  return diff;
}

function assertRequiredFields(required: string[], data: unknown, label: string): void {
  if (!required.length) return;
  if (typeof data !== "object" || data === null) {
    throw new Error(`${label} is missing required fields: ${required.join(", ")}`);
  }
  const missing = required.filter((key) => !(key in (data as Record<string, unknown>)));
  if (missing.length) {
    throw new Error(`${label} is missing required fields: ${missing.join(", ")}`);
  }
}

export class AuditTrail {
  private events: AuditEvent[] = [];

  record(event: Omit<AuditEvent, "hash" | "previousHash"> & { previousHash?: string }): AuditEvent {
    const previousHash = event.previousHash ?? this.events.at(-1)?.hash ?? "";
    const fullEvent: AuditEvent = {
      ...event,
      previousHash,
      hash: calculateHash({ ...event, previousHash }),
    };
    this.events.push(fullEvent);
    return fullEvent;
  }

  getEvents(): AuditEvent[] {
    return [...this.events];
  }

  verifyChain(): boolean {
    let previousHash = "";
    for (const evt of this.events) {
      const recalculated = calculateHash({ ...evt, previousHash: evt.previousHash });
      if (recalculated !== evt.hash || evt.previousHash !== previousHash) {
        return false;
      }
      previousHash = evt.hash;
    }
    return true;
  }
}

export interface IntegrityJobResult {
  ranAt: Date;
  violations: IntegrityViolation[];
}

export class RecordFramework {
  private records: Map<string, RecordEntry> = new Map();
  private templates: Map<string, RecordTemplate> = new Map();
  private migratedDomains: Set<RecordDomain> = new Set();
  private retiredLegacy: Set<RecordDomain> = new Set();
  private auditTrail = new AuditTrail();
  private domains: Map<RecordDomain, DomainDefinition> = new Map();
  private lastIntegrityCheck?: IntegrityJobResult;

  registerDomain(definition: DomainDefinition): void {
    this.domains.set(definition.domain, definition);
  }

  registerTemplate(template: RecordTemplate): void {
    const validated = RecordTemplateSchema.parse(template);
    this.templates.set(validated.id, validated);
  }

  createRecord(params: {
    id?: string;
    domain: RecordDomain;
    type: string;
    immutability: ImmutabilityMode;
    metadata: RecordMetadata;
    data: unknown;
    createdBy: string;
    lineage?: Partial<RecordLineage>;
  }): RecordEntry {
    const domainDefinition = this.domains.get(params.domain);
    if (domainDefinition?.allowedTypes && !domainDefinition.allowedTypes.includes(params.type)) {
      throw new Error(`Type ${params.type} is not permitted for domain ${params.domain}`);
    }
    const recordId = params.id ?? crypto.randomUUID();
    const metadata = RecordMetadataSchema.parse(params.metadata);
    const lineage = RecordLineageSchema.parse({
      parents: params.lineage?.parents ?? [],
      children: params.lineage?.children ?? [],
    });

    if (domainDefinition?.requiredFields) {
      assertRequiredFields(domainDefinition.requiredFields, params.data, `Domain ${params.domain}`);
    }

    const immutabilityMode =
      params.immutability ?? domainDefinition?.defaultImmutability ?? "versioned";

    const version: RecordVersion = RecordVersionSchema.parse({
      versionId: crypto.randomUUID(),
      timestamp: new Date(),
      hash: calculateHash(params.data),
      data: params.data,
      createdBy: params.createdBy,
    });

    const entry: RecordEntry = RecordEntrySchema.parse({
      id: recordId,
      domain: params.domain,
      type: params.type,
      immutability: immutabilityMode,
      metadata,
      lineage,
      versions: [version],
    });

    this.records.set(recordId, entry);
    this.auditTrail.record({
      recordId,
      action: "create",
      actor: params.createdBy,
      timestamp: version.timestamp,
      details: { type: params.type, domain: params.domain },
      previousHash: this.auditTrail.getEvents().at(-1)?.hash,
    });
    return entry;
  }

  applyTemplate(
    templateId: string,
    overrides: {
      data: unknown;
      createdBy: string;
      type?: string;
      lineage?: Partial<RecordLineage>;
      metadata?: Partial<RecordMetadata>;
    }
  ): RecordEntry {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    const metadata = {
      ...template.defaultMetadata,
      ...overrides.metadata,
      templateId,
    } as RecordMetadata;
    assertRequiredFields(template.requiredFields, overrides.data, `Template ${templateId}`);
    return this.createRecord({
      domain: template.domain,
      type: overrides.type ?? template.name,
      immutability: "versioned",
      metadata,
      data: overrides.data,
      createdBy: overrides.createdBy,
      lineage: overrides.lineage,
    });
  }

  addChild(recordId: string, childId: string): void {
    const parent = this.records.get(recordId);
    const child = this.records.get(childId);
    if (!parent || !child) {
      throw new Error("Invalid lineage link");
    }
    parent.lineage.children.push(childId);
    child.lineage.parents.push(recordId);
  }

  appendVersion(
    recordId: string,
    data: unknown,
    createdBy: string,
    reason?: string
  ): RecordVersion {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error("Record not found");
    }

    const latest = record.versions.at(-1);
    const diff = record.immutability === "versioned" ? diffObjects(latest?.data, data) : undefined;

    if (record.immutability === "append-only" && latest) {
      const attemptedDiff = diffObjects(latest.data, data);
      const breakingKeys = Object.entries(attemptedDiff).filter(
        ([, change]) =>
          (change as any).before !== undefined &&
          JSON.stringify((change as any).before) !== JSON.stringify((change as any).after)
      );
      if (breakingKeys.length) {
        throw new Error(
          `Append-only records cannot modify existing fields: ${breakingKeys.map(([k]) => k).join(", ")}`
        );
      }
    }

    const version: RecordVersion = RecordVersionSchema.parse({
      versionId: crypto.randomUUID(),
      timestamp: new Date(),
      hash: calculateHash(data, latest?.hash),
      data,
      diff: diff && Object.keys(diff).length > 0 ? diff : undefined,
      createdBy,
      reason,
    });

    record.versions.push(version);
    this.auditTrail.record({
      recordId,
      action: "update",
      actor: createdBy,
      timestamp: version.timestamp,
      details: { reason },
      previousHash: this.auditTrail.getEvents().at(-1)?.hash,
    });
    return version;
  }

  search(query: SearchQuery): RecordEntry[] {
    const results: RecordEntry[] = [];
    for (const record of this.records.values()) {
      if (record.deletedAt) continue;
      if (query.owner && record.metadata.owner !== query.owner) continue;
      if (query.classification && record.metadata.classification !== query.classification) continue;
      if (query.domain && record.domain !== query.domain) continue;
      if (query.type && record.type !== query.type) continue;
      if (query.tags && !query.tags.every((tag) => record.metadata.tags.includes(tag))) continue;

      const createdAt = record.versions[0]?.timestamp;
      if (!createdAt) continue;
      if (query.from && createdAt < query.from) continue;
      if (query.to && createdAt > query.to) continue;
      results.push(record);
    }
    return results;
  }

  exportBundle(recordIds: string[]): ExportBundle {
    const manifest: ExportBundle["manifest"] = [];
    const payload: Record<string, unknown> = {};

    for (const id of recordIds) {
      const record = this.records.get(id);
      if (!record || record.deletedAt) continue;
      const latest = record.versions.at(-1)!;
      manifest.push({ id, versionId: latest.versionId, hash: latest.hash });
      payload[id] = { ...record, versions: record.versions };
      this.auditTrail.record({
        recordId: id,
        action: "export",
        actor: "system",
        timestamp: new Date(),
        details: { versionId: latest.versionId },
        previousHash: this.auditTrail.getEvents().at(-1)?.hash,
      });
    }

    const bundleHash = calculateHash({ manifest, payload });
    return { manifest, bundleHash, payload };
  }

  verifyIntegrity(recordId?: string): IntegrityViolation[] {
    const violations: IntegrityViolation[] = [];
    const records = recordId
      ? ([this.records.get(recordId)].filter(Boolean) as RecordEntry[])
      : [...this.records.values()];

    for (const record of records) {
      let previousHash: string | undefined;
      for (const version of record.versions) {
        const recalculated = calculateHash(version.data, previousHash);
        if (recalculated !== version.hash) {
          violations.push({
            recordId: record.id,
            versionId: version.versionId,
            expected: version.hash,
            actual: recalculated,
          });
        }
        previousHash = version.hash;
      }
    }
    return violations;
  }

  runIntegrityJob(recordId?: string): IntegrityJobResult {
    const violations = this.verifyIntegrity(recordId);
    const ranAt = new Date();
    this.lastIntegrityCheck = { ranAt, violations };
    return this.lastIntegrityCheck;
  }

  deleteRecord(recordId: string, actor: string, attestation: string): void {
    const record = this.records.get(recordId);
    if (!record) {
      throw new Error("Record not found");
    }
    record.deletedAt = new Date();
    record.deletionAttestation = attestation;
    this.auditTrail.record({
      recordId,
      action: "delete",
      actor,
      timestamp: record.deletedAt,
      details: { attestation },
      previousHash: this.auditTrail.getEvents().at(-1)?.hash,
    });
  }

  markDomainMigrated(domain: RecordDomain): void {
    this.migratedDomains.add(domain);
  }

  retireLegacyPath(domain: RecordDomain): void {
    if (!this.migratedDomains.has(domain)) {
      throw new Error("Cannot retire legacy paths before migration");
    }
    this.retiredLegacy.add(domain);
  }

  isLegacyRetired(domain: RecordDomain): boolean {
    return this.retiredLegacy.has(domain);
  }

  getAuditTrail(): AuditTrail {
    return this.auditTrail;
  }

  getRecord(recordId: string): RecordEntry | undefined {
    return this.records.get(recordId);
  }

  getIntegrityStatus(): IntegrityJobResult | undefined {
    return this.lastIntegrityCheck;
  }
}

export interface AccessScope {
  allowedDomains?: RecordDomain[];
  allowedClassifications?: z.infer<typeof ClassificationSchema>[];
  owners?: string[];
}

export class ScopedRecordApi {
  constructor(
    private readonly framework: RecordFramework,
    private readonly scope: AccessScope
  ) {}

  private assertAccess(record: RecordEntry): void {
    if (this.scope.allowedDomains && !this.scope.allowedDomains.includes(record.domain)) {
      throw new Error("Domain not permitted for actor");
    }
    if (
      this.scope.allowedClassifications &&
      !this.scope.allowedClassifications.includes(record.metadata.classification)
    ) {
      throw new Error("Classification not permitted for actor");
    }
    if (this.scope.owners && !this.scope.owners.includes(record.metadata.owner)) {
      throw new Error("Owner scope violated");
    }
  }

  create(params: Parameters<RecordFramework["createRecord"]>[0]): RecordEntry {
    const record = this.framework.createRecord(params);
    this.assertAccess(record);
    return record;
  }

  search(query: SearchQuery): RecordEntry[] {
    const results = this.framework.search(query);
    return results.filter((r) => {
      try {
        this.assertAccess(r);
        return true;
      } catch {
        return false;
      }
    });
  }

  append(recordId: string, data: unknown, createdBy: string, reason?: string): RecordVersion {
    const record = this.framework.getRecord(recordId);
    if (!record) {
      throw new Error("Record not found");
    }
    this.assertAccess(record);
    return this.framework.appendVersion(recordId, data, createdBy, reason);
  }

  export(recordIds: string[]): ExportBundle {
    for (const id of recordIds) {
      const record = this.framework.getRecord(id);
      if (record) this.assertAccess(record);
    }
    return this.framework.exportBundle(recordIds);
  }

  delete(recordId: string, actor: string, attestation: string): void {
    const record = this.framework.getRecord(recordId);
    if (!record) {
      throw new Error("Record not found");
    }
    this.assertAccess(record);
    this.framework.deleteRecord(recordId, actor, attestation);
  }
}

export function createRecordFramework(): RecordFramework {
  return new RecordFramework();
}

export function createScopedRecordApi(
  framework: RecordFramework,
  scope: AccessScope
): ScopedRecordApi {
  return new ScopedRecordApi(framework, scope);
}
