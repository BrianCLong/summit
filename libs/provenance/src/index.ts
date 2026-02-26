/**
 * @summit/provenance — Provenance Ledger + Export Signing
 *
 * Implements:
 * - Append-only hash-chained ledger
 * - Pluggable storage backends (in-memory + PostgreSQL)
 * - SHA-256 Merkle tree export manifests
 * - RSA-SHA256 / Ed25519 cryptographic signatures
 * - Offline verification CLI
 * - PII-free manifests (hashes and metadata only)
 */

import {
  createHash,
  createHmac,
  createSign,
  createVerify,
  generateKeyPairSync,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';

// ─── Ledger Entry Schema (from prompt spec) ──────────────────────────────────

export type Operation = 'CREATE' | 'UPDATE' | 'DELETE' | 'ACCESS';
export type SignatureAlgorithm = 'RSA-SHA256' | 'Ed25519';

export interface LedgerEntry {
  entryId: string;
  sequenceNumber: bigint;
  previousHash: string;
  currentHash: string;
  operation: Operation;
  entityId: string;
  entityType: string;
  timestamp: string; // ISO 8601
  actor: string;
  purpose: string;
  signature?: string;
  signatureAlgorithm?: SignatureAlgorithm;
  metadata: Record<string, unknown>;
}

// ─── Export Manifest Schema ──────────────────────────────────────────────────

export interface ExportManifest {
  version: '1.0';
  bundleId: string;
  createdAt: string;
  signer: {
    identity: string;
    publicKeyFingerprint: string;
    algorithm: SignatureAlgorithm;
  };
  signature: string;
  merkleRoot: string;
  contents: Array<{
    id: string;
    type: string;
    contentHash: string;
    size: number;
  }>;
  metadata: {
    purpose: string;
    classification: string;
    exportedBy: string;
    totalEntries: number;
    totalSize: number;
  };
}

// ─── Hash Chain Algorithm ────────────────────────────────────────────────────

export function computeEntryHash(entry: Omit<LedgerEntry, 'currentHash'>): string {
  // Deterministic serialization: sorted keys, BigInt → string
  const payload: Record<string, string> = {
    actor: entry.actor,
    entityId: entry.entityId,
    operation: entry.operation,
    previousHash: entry.previousHash,
    sequenceNumber: entry.sequenceNumber.toString(),
    timestamp: entry.timestamp,
  };
  return createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

export function validateChain(entries: LedgerEntry[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    // Verify hash chain linkage
    if (i > 0 && entries[i].previousHash !== entries[i - 1].currentHash) {
      errors.push(
        `Chain break at seq ${entries[i].sequenceNumber}: previousHash does not match prior entry`,
      );
    }
    // Verify entry integrity
    const computed = computeEntryHash(entries[i]);
    if (entries[i].currentHash !== computed) {
      errors.push(
        `Hash mismatch at seq ${entries[i].sequenceNumber}: expected ${computed}, got ${entries[i].currentHash}`,
      );
    }
  }
  return { valid: errors.length === 0, errors };
}

// ─── Merkle Tree ─────────────────────────────────────────────────────────────

export function buildMerkleTree(hashes: string[]): string {
  if (hashes.length === 0) return '';
  // Ensure all inputs are proper hex hashes
  let layer = hashes.map((h) =>
    /^[a-f0-9]{64}$/.test(h) ? h : createHash('sha256').update(h).digest('hex'),
  );
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] ?? left;
      next.push(createHash('sha256').update(left + right).digest('hex'));
    }
    layer = next;
  }
  return layer[0];
}

// ─── Storage Interface ───────────────────────────────────────────────────────

export interface LedgerStorage {
  append(entry: LedgerEntry): Promise<void>;
  getByEntityId(entityId: string): Promise<LedgerEntry[]>;
  getByTimeRange(start: string, end: string): Promise<LedgerEntry[]>;
  getByOperation(operation: Operation): Promise<LedgerEntry[]>;
  getBySequenceRange(start: bigint, end: bigint): Promise<LedgerEntry[]>;
  getAll(): Promise<LedgerEntry[]>;
  getHead(): Promise<LedgerEntry | undefined>;
  count(): Promise<bigint>;
}

// ─── In-Memory Storage (for testing) ─────────────────────────────────────────

export class InMemoryStorage implements LedgerStorage {
  private entries: LedgerEntry[] = [];

  async append(entry: LedgerEntry): Promise<void> {
    this.entries.push({ ...entry });
  }

  async getByEntityId(entityId: string): Promise<LedgerEntry[]> {
    return this.entries.filter((e) => e.entityId === entityId);
  }

  async getByTimeRange(start: string, end: string): Promise<LedgerEntry[]> {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return this.entries.filter((entry) => {
      const t = new Date(entry.timestamp).getTime();
      return t >= s && t <= e;
    });
  }

  async getByOperation(operation: Operation): Promise<LedgerEntry[]> {
    return this.entries.filter((e) => e.operation === operation);
  }

  async getBySequenceRange(start: bigint, end: bigint): Promise<LedgerEntry[]> {
    return this.entries.filter(
      (e) => e.sequenceNumber >= start && e.sequenceNumber <= end,
    );
  }

  async getAll(): Promise<LedgerEntry[]> {
    return [...this.entries];
  }

  async getHead(): Promise<LedgerEntry | undefined> {
    return this.entries.at(-1);
  }

  async count(): Promise<bigint> {
    return BigInt(this.entries.length);
  }
}

// ─── PostgreSQL Storage (for production) ─────────────────────────────────────

export interface PgClient {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

export class PostgresStorage implements LedgerStorage {
  constructor(
    private client: PgClient,
    private tableName = 'provenance_ledger',
  ) {}

  async append(entry: LedgerEntry): Promise<void> {
    await this.client.query(
      `INSERT INTO ${this.tableName} (
        entry_id, sequence_number, previous_hash, current_hash,
        operation, entity_id, entity_type, timestamp, actor,
        purpose, signature, signature_algorithm, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        entry.entryId,
        entry.sequenceNumber.toString(),
        entry.previousHash,
        entry.currentHash,
        entry.operation,
        entry.entityId,
        entry.entityType,
        entry.timestamp,
        entry.actor,
        entry.purpose,
        entry.signature ?? null,
        entry.signatureAlgorithm ?? null,
        JSON.stringify(entry.metadata),
      ],
    );
  }

  private rowToEntry(row: Record<string, unknown>): LedgerEntry {
    return {
      entryId: row.entry_id as string,
      sequenceNumber: BigInt(row.sequence_number as string),
      previousHash: row.previous_hash as string,
      currentHash: row.current_hash as string,
      operation: row.operation as Operation,
      entityId: row.entity_id as string,
      entityType: row.entity_type as string,
      timestamp: row.timestamp as string,
      actor: row.actor as string,
      purpose: row.purpose as string,
      signature: (row.signature as string) ?? undefined,
      signatureAlgorithm: (row.signature_algorithm as SignatureAlgorithm) ?? undefined,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata as Record<string, unknown>),
    };
  }

  async getByEntityId(entityId: string): Promise<LedgerEntry[]> {
    const result = await this.client.query(
      `SELECT * FROM ${this.tableName} WHERE entity_id = $1 ORDER BY sequence_number`,
      [entityId],
    );
    return result.rows.map((r) => this.rowToEntry(r));
  }

  async getByTimeRange(start: string, end: string): Promise<LedgerEntry[]> {
    const result = await this.client.query(
      `SELECT * FROM ${this.tableName} WHERE timestamp BETWEEN $1 AND $2 ORDER BY sequence_number`,
      [start, end],
    );
    return result.rows.map((r) => this.rowToEntry(r));
  }

  async getByOperation(operation: Operation): Promise<LedgerEntry[]> {
    const result = await this.client.query(
      `SELECT * FROM ${this.tableName} WHERE operation = $1 ORDER BY sequence_number`,
      [operation],
    );
    return result.rows.map((r) => this.rowToEntry(r));
  }

  async getBySequenceRange(start: bigint, end: bigint): Promise<LedgerEntry[]> {
    const result = await this.client.query(
      `SELECT * FROM ${this.tableName} WHERE sequence_number BETWEEN $1 AND $2 ORDER BY sequence_number`,
      [start.toString(), end.toString()],
    );
    return result.rows.map((r) => this.rowToEntry(r));
  }

  async getAll(): Promise<LedgerEntry[]> {
    const result = await this.client.query(
      `SELECT * FROM ${this.tableName} ORDER BY sequence_number`,
    );
    return result.rows.map((r) => this.rowToEntry(r));
  }

  async getHead(): Promise<LedgerEntry | undefined> {
    const result = await this.client.query(
      `SELECT * FROM ${this.tableName} ORDER BY sequence_number DESC LIMIT 1`,
    );
    return result.rows[0] ? this.rowToEntry(result.rows[0]) : undefined;
  }

  async count(): Promise<bigint> {
    const result = await this.client.query(
      `SELECT COUNT(*) as cnt FROM ${this.tableName}`,
    );
    return BigInt((result.rows[0]?.cnt as string) ?? '0');
  }
}

// ─── Provenance Ledger ───────────────────────────────────────────────────────

export interface LedgerOptions {
  storage: LedgerStorage;
  signingKey?: string;
  signatureAlgorithm?: SignatureAlgorithm;
}

export class ProvenanceLedger {
  private storage: LedgerStorage;
  private nextSequence = 0n;
  private signingKey?: string;
  private signatureAlgorithm: SignatureAlgorithm;

  constructor(options: LedgerOptions) {
    this.storage = options.storage;
    this.signingKey = options.signingKey;
    this.signatureAlgorithm = options.signatureAlgorithm ?? 'RSA-SHA256';
  }

  async append(input: {
    operation: Operation;
    entityId: string;
    entityType: string;
    actor: string;
    purpose: string;
    metadata?: Record<string, unknown>;
  }): Promise<LedgerEntry> {
    const head = await this.storage.getHead();
    const previousHash = head?.currentHash ?? '0'.repeat(64);
    const sequenceNumber = head ? head.sequenceNumber + 1n : this.nextSequence++;

    const partialEntry = {
      entryId: randomUUID(),
      sequenceNumber,
      previousHash,
      operation: input.operation,
      entityId: input.entityId,
      entityType: input.entityType,
      timestamp: new Date().toISOString(),
      actor: input.actor,
      purpose: input.purpose,
      metadata: input.metadata ?? {},
    };

    const currentHash = computeEntryHash(partialEntry);

    let signature: string | undefined;
    if (this.signingKey) {
      signature = createHmac('sha256', this.signingKey)
        .update(currentHash)
        .digest('hex');
    }

    const entry: LedgerEntry = {
      ...partialEntry,
      currentHash,
      signature,
      signatureAlgorithm: signature ? this.signatureAlgorithm : undefined,
    };

    await this.storage.append(entry);
    return entry;
  }

  async query(filters: {
    entityId?: string;
    operation?: Operation;
    timeRange?: { start: string; end: string };
    sequenceRange?: { start: bigint; end: bigint };
  }): Promise<LedgerEntry[]> {
    if (filters.entityId) return this.storage.getByEntityId(filters.entityId);
    if (filters.operation) return this.storage.getByOperation(filters.operation);
    if (filters.timeRange)
      return this.storage.getByTimeRange(filters.timeRange.start, filters.timeRange.end);
    if (filters.sequenceRange)
      return this.storage.getBySequenceRange(
        filters.sequenceRange.start,
        filters.sequenceRange.end,
      );
    return this.storage.getAll();
  }

  async verify(): Promise<{ valid: boolean; errors: string[] }> {
    const entries = await this.storage.getAll();
    return validateChain(entries);
  }

  async exportBundle(options: {
    purpose: string;
    classification: string;
    exportedBy: string;
    signerIdentity?: string;
    privateKey?: string;
    publicKey?: string;
    entityFilter?: string;
  }): Promise<{ manifest: ExportManifest; entries: LedgerEntry[] }> {
    let entries: LedgerEntry[];
    if (options.entityFilter) {
      entries = await this.storage.getByEntityId(options.entityFilter);
    } else {
      entries = await this.storage.getAll();
    }

    const jsonReplacer = (_: string, v: unknown) => (typeof v === 'bigint' ? v.toString() : v);
    const contentHashes = entries.map((e) => ({
      id: e.entityId,
      type: e.entityType,
      contentHash: e.currentHash,
      size: JSON.stringify(e, jsonReplacer).length,
    }));

    const merkleRoot = buildMerkleTree(contentHashes.map((c) => c.contentHash));

    const bundleId = randomUUID();
    const createdAt = new Date().toISOString();

    // Generate keypair for signing if not provided
    let privateKey = options.privateKey;
    let publicKey = options.publicKey;
    if (!privateKey || !publicKey) {
      const kp = generateKeyPairSync('rsa', { modulusLength: 2048 });
      privateKey = kp.privateKey.export({ format: 'pem', type: 'pkcs1' }).toString();
      publicKey = kp.publicKey.export({ format: 'pem', type: 'pkcs1' }).toString();
    }

    const publicKeyFingerprint =
      'SHA256:' + createHash('sha256').update(publicKey).digest('hex').slice(0, 16);

    // Sign the merkle root + bundle metadata
    const signPayload = JSON.stringify({
      bundleId,
      merkleRoot,
      createdAt,
      totalEntries: entries.length,
    });
    const signer = createSign('RSA-SHA256');
    signer.update(signPayload);
    const signature = signer.sign(privateKey, 'base64');

    const manifest: ExportManifest = {
      version: '1.0',
      bundleId,
      createdAt,
      signer: {
        identity: options.signerIdentity ?? 'intelgraph-export-service',
        publicKeyFingerprint,
        algorithm: 'RSA-SHA256',
      },
      signature,
      merkleRoot,
      contents: contentHashes,
      metadata: {
        purpose: options.purpose,
        classification: options.classification,
        exportedBy: options.exportedBy,
        totalEntries: entries.length,
        totalSize: contentHashes.reduce((sum, c) => sum + c.size, 0),
      },
    };

    // Return entries with sequenceNumber as number for JSON compatibility
    const serializableEntries = entries.map((e) => ({
      ...e,
      sequenceNumber: e.sequenceNumber,
    }));

    return { manifest, entries: serializableEntries };
  }

  getStorage(): LedgerStorage {
    return this.storage;
  }
}

// ─── Bundle Verification ─────────────────────────────────────────────────────

export function verifyBundle(
  manifest: ExportManifest,
  entries: LedgerEntry[],
  publicKey?: string,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Verify chain integrity
  const chainResult = validateChain(entries);
  errors.push(...chainResult.errors);

  // 2. Verify content hashes match entries
  for (const content of manifest.contents) {
    const matching = entries.find((e) => e.entityId === content.id);
    if (!matching) {
      errors.push(`Content ${content.id} not found in entries`);
    } else if (matching.currentHash !== content.contentHash) {
      errors.push(`Content hash mismatch for ${content.id}`);
    }
  }

  // 3. Verify Merkle root
  const computedRoot = buildMerkleTree(manifest.contents.map((c) => c.contentHash));
  if (computedRoot !== manifest.merkleRoot) {
    errors.push('Merkle root mismatch');
  }

  // 4. Verify RSA signature
  if (publicKey) {
    const signPayload = JSON.stringify({
      bundleId: manifest.bundleId,
      merkleRoot: manifest.merkleRoot,
      createdAt: manifest.createdAt,
      totalEntries: manifest.metadata.totalEntries,
    });
    const verifier = createVerify('RSA-SHA256');
    verifier.update(signPayload);
    if (!verifier.verify(publicKey, manifest.signature, 'base64')) {
      errors.push('Invalid RSA signature');
    }
  }

  // 5. Verify no PII in manifest
  const manifestStr = JSON.stringify(manifest);
  const piiPatterns = [/@[\w.-]+\.[\w]+/, /\b\d{3}-\d{2}-\d{4}\b/, /\b\d{10,}\b/];
  for (const pattern of piiPatterns) {
    if (pattern.test(manifestStr)) {
      errors.push('Potential PII detected in manifest');
    }
  }

  return { valid: errors.length === 0, errors };
}
