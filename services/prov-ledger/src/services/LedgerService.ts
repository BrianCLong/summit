import { Pool } from 'pg';
import { newDb } from 'pg-mem';
import crypto from 'crypto';
import { calculateHash } from '../utils/hash.js';
import { Evidence, Claim, LedgerEntry, Manifest } from '../types.js';
import { buildMerkleRoot } from '../utils/merkle.js';
import { KafkaPublisher } from '../utils/kafka.js';

type IdempotencyRecord = {
  key: string;
  method: string;
  path: string;
  requestHash: string;
  statusCode: number;
  responseBody: any;
  createdAt: string;
};

export class LedgerService {
  private static instance: LedgerService;
  private pool: Pool;
  private publisher: KafkaPublisher;

  private constructor(publisher: KafkaPublisher = new KafkaPublisher()) {
    this.publisher = publisher;
    if (process.env.NODE_ENV === 'test') {
      const db = newDb();
      const adapter = db.adapters.createPg();
      this.pool = new adapter.Pool();
    } else {
      this.pool = new Pool({
        connectionString:
          process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/prov-ledger',
      });
    }
  }

  public static getInstance(): LedgerService {
    if (!LedgerService.instance) {
      LedgerService.instance = new LedgerService();
    }
    return LedgerService.instance;
  }

  public async initDB(): Promise<void> {
    await this.pool.query(`
      CREATE SCHEMA IF NOT EXISTS prov_ledger_v1;
      CREATE TABLE IF NOT EXISTS prov_ledger_v1.evidence (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        hash TEXT NOT NULL,
        license TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS prov_ledger_v1.claims (
        id TEXT PRIMARY KEY,
        assertion TEXT NOT NULL,
        confidence NUMERIC NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS prov_ledger_v1.claim_evidence (
        claim_id TEXT REFERENCES prov_ledger_v1.claims(id) ON DELETE CASCADE,
        evidence_id TEXT REFERENCES prov_ledger_v1.evidence(id) ON DELETE CASCADE,
        PRIMARY KEY (claim_id, evidence_id)
      );
      CREATE TABLE IF NOT EXISTS prov_ledger_v1.ledger_entries (
        seq SERIAL PRIMARY KEY,
        id TEXT NOT NULL,
        type TEXT NOT NULL,
        data JSONB NOT NULL,
        previous_hash TEXT,
        hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ledger_id ON prov_ledger_v1.ledger_entries(id);
      CREATE TABLE IF NOT EXISTS prov_ledger_v1.idempotency_keys (
        key TEXT PRIMARY KEY,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        status_code INT NOT NULL,
        response_body JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public async reset(): Promise<void> {
    await this.pool.query('DELETE FROM prov_ledger_v1.claim_evidence');
    await this.pool.query('DELETE FROM prov_ledger_v1.claims');
    await this.pool.query('DELETE FROM prov_ledger_v1.evidence');
    await this.pool.query('DELETE FROM prov_ledger_v1.ledger_entries');
    await this.pool.query('DELETE FROM prov_ledger_v1.idempotency_keys');
  }

  private async withIdempotency<T>(
    key: string | undefined,
    method: string,
    path: string,
    requestBody: unknown,
    handler: () => Promise<{ statusCode: number; responseBody: T }>,
  ): Promise<{ statusCode: number; responseBody: T; fromCache: boolean }>
  {
    const bodyHash = calculateHash(requestBody ?? {});

    if (!key) {
      const { statusCode, responseBody } = await handler();
      return { statusCode, responseBody, fromCache: false };
    }

    const existing = await this.pool.query<IdempotencyRecord>(
      'SELECT * FROM prov_ledger_v1.idempotency_keys WHERE key = $1',
      [key],
    );

    if (existing.rowCount && existing.rows[0].requestHash === bodyHash) {
      const row = existing.rows[0];
      return { statusCode: row.statusCode, responseBody: row.responseBody as T, fromCache: true };
    }

    const { statusCode, responseBody } = await handler();
    await this.pool.query(
      `INSERT INTO prov_ledger_v1.idempotency_keys (key, method, path, request_hash, status_code, response_body)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (key) DO NOTHING`,
      [key, method, path, bodyHash, statusCode, JSON.stringify(responseBody)],
    );
    return { statusCode, responseBody, fromCache: false };
  }

  private async appendLedgerEntry(id: string, type: LedgerEntry['type'], data: any): Promise<LedgerEntry> {
    const previous = await this.pool.query('SELECT hash FROM prov_ledger_v1.ledger_entries ORDER BY seq DESC LIMIT 1');
    const previousHash = previous.rowCount ? previous.rows[0].hash : null;
    const hash = calculateHash({ id, type, data, previousHash });

    await this.pool.query(
      'INSERT INTO prov_ledger_v1.ledger_entries (id, type, data, previous_hash, hash) VALUES ($1,$2,$3,$4,$5)',
      [id, type, JSON.stringify(data), previousHash, hash],
    );

    return { id, type, data, previousHash, hash };
  }

  public async registerEvidence(
    req: { source: string; hash: string; license?: string },
    idempotencyKey?: string,
  ): Promise<{ evidenceId: string; hash: string }>
  {
    await this.initDB();
    const path = '/v1/evidence';
    const result = await this.withIdempotency(idempotencyKey, 'POST', path, req, async () => {
      const evidenceId = `ev_${crypto.randomUUID()}`;
      await this.pool.query(
        'INSERT INTO prov_ledger_v1.evidence (id, source, hash, license) VALUES ($1,$2,$3,$4)',
        [evidenceId, req.source, req.hash, req.license ?? null],
      );
      await this.appendLedgerEntry(evidenceId, 'evidence', {
        id: evidenceId,
        ...req,
      });
      return { statusCode: 201, responseBody: { evidenceId, hash: req.hash } };
    });

    return result.responseBody;
  }

  public async registerClaim(
    req: { evidenceIds: string[]; assertion: string; confidence: number },
    idempotencyKey?: string,
  ): Promise<{ claimId: string; merkleRoot: string }>
  {
    await this.initDB();
    const path = '/v1/claims';
    const result = await this.withIdempotency(idempotencyKey, 'POST', path, req, async () => {
      const claimId = `cl_${crypto.randomUUID()}`;
      await this.pool.query(
        'INSERT INTO prov_ledger_v1.claims (id, assertion, confidence) VALUES ($1,$2,$3)',
        [claimId, req.assertion, req.confidence],
      );
      for (const evidenceId of req.evidenceIds) {
        await this.pool.query(
          'INSERT INTO prov_ledger_v1.claim_evidence (claim_id, evidence_id) VALUES ($1,$2)',
          [claimId, evidenceId],
        );
      }
      const claimData: Claim = {
        claimId,
        assertion: req.assertion,
        confidence: req.confidence,
        evidenceRefs: req.evidenceIds,
        timestamp: new Date().toISOString(),
      };
      const entry = await this.appendLedgerEntry(claimId, 'claim', claimData);
      const manifest = await this.getManifest(claimId);
      await this.publisher.emitClaimRegistered(claimData, entry.hash, manifest?.merkleRoot ?? entry.hash);
      return { statusCode: 201, responseBody: { claimId, merkleRoot: manifest?.merkleRoot ?? entry.hash } };
    });

    return result.responseBody;
  }

  public async getManifest(claimId: string): Promise<Manifest | null> {
    await this.initDB();
    const claimRes = await this.pool.query('SELECT * FROM prov_ledger_v1.claims WHERE id = $1', [claimId]);
    if (!claimRes.rowCount) {
      return null;
    }

    const evidenceRes = await this.pool.query(
      `SELECT e.* FROM prov_ledger_v1.evidence e
       INNER JOIN prov_ledger_v1.claim_evidence ce ON ce.evidence_id = e.id
       WHERE ce.claim_id = $1`,
      [claimId],
    );

    const entryRes = await this.pool.query(
      `SELECT id, type, data, previous_hash as "previousHash", hash
       FROM prov_ledger_v1.ledger_entries
       WHERE id = ANY($1)
       ORDER BY seq ASC`,
      [[claimId, ...evidenceRes.rows.map((r) => r.id)]],
    );

    const entries: LedgerEntry[] = entryRes.rows.map((row) => ({
      id: row.id,
      type: row.type,
      data: row.data,
      previousHash: row.previousHash,
      hash: row.hash,
    }));

    const merkleRoot = buildMerkleRoot(entries.map((e) => e.hash));

    return {
      bundleId: claimId,
      merkleRoot,
      entries,
    };
  }
}
