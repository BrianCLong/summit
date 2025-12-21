import { Evidence, Transform, Claim, LedgerEntry, Manifest } from '../types.js';
import { calculateHash } from '../utils/hash.js';
import { Pool } from 'pg';
import crypto from 'crypto';
import { newDb } from 'pg-mem';
import { defaultSigner } from '../utils/ed25519.js';
import { merkleRoot } from '../utils/merkle.js';
import { eventBus } from '../utils/events.js';

export class LedgerService {
  private static instance: LedgerService;
  private pool: any; // Using any to support both pg Pool and pg-mem adapter

  private constructor() {
    if (process.env.NODE_ENV === 'test') {
      const db = newDb();
      // pg-mem's createPg returns an object with Pool, but we need to instantiate it or use it as is?
      // Actually db.adapters.createPg() returns { Pool, Client } constructors.
      const adapter = db.adapters.createPg();
      this.pool = new adapter.Pool();
    } else {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/provenance',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }

    this.initDB();
  }

  private async initDB() {
    // Simple schema creation for prototype
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        data JSONB NOT NULL,
        previous_hash TEXT,
        hash TEXT NOT NULL,
        signature TEXT NOT NULL,
        public_key TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        seq SERIAL
      );

      CREATE INDEX IF NOT EXISTS idx_ledger_seq ON ledger_entries(seq);
    `);

    await this.pool.query(`
      ALTER TABLE ledger_entries
      ADD COLUMN IF NOT EXISTS signature TEXT DEFAULT '' NOT NULL,
      ADD COLUMN IF NOT EXISTS public_key TEXT DEFAULT '' NOT NULL;
    `);
  }

  public static getInstance(): LedgerService {
    if (!LedgerService.instance) {
      LedgerService.instance = new LedgerService();
    }
    return LedgerService.instance;
  }

  // Exposed for testing to reset state
  public async _reset() {
      await this.pool.query('TRUNCATE TABLE ledger_entries');
  }

  private async getPreviousEntry(): Promise<{ hash: string } | null> {
    const res = await this.pool.query('SELECT hash FROM ledger_entries ORDER BY seq DESC LIMIT 1');
    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  private async appendEntry(type: 'evidence' | 'transform' | 'claim', id: string, data: any): Promise<LedgerEntry> {
    const previousEntry = await this.getPreviousEntry();
    const previousHash = previousEntry ? previousEntry.hash : null;

    // Hash payload: type + data + prevHash
    const entryPayload = {
      type,
      data,
      previousHash
    };

    const hash = calculateHash(entryPayload);
    const signature = defaultSigner.sign(hash);
    const publicKey = defaultSigner.getPublicKey();

    await this.pool.query(
      'INSERT INTO ledger_entries (id, type, data, previous_hash, hash, signature, public_key) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, type, JSON.stringify(data), previousHash, hash, signature, publicKey]
    );

    const entry: LedgerEntry = { id, type, data, previousHash, hash, signature, publicKey };
    return entry;
  }

  public async registerEvidence(req: { source: string, url?: string, blob?: string, license?: string, hash: string }): Promise<string> {
    const evidenceId = `ev_${crypto.randomUUID()}`;
    const evidence: Evidence = {
      evidenceId,
      ...req,
      timestamp: new Date().toISOString()
    };

    const entry = await this.appendEntry('evidence', evidenceId, evidence);
    eventBus.emit('claims.v1.created', { evidenceId, hash: entry.hash, signature: entry.signature });
    return evidenceId;
  }

  public async registerTransform(req: { inputs: string[], tool: string, params: any, outputs: string[], operatorId: string }): Promise<string> {
    const transformId = `tx_${crypto.randomUUID()}`;
    const transform: Transform = {
      transformId,
      ...req,
      timestamp: new Date().toISOString()
    };

    const entry = await this.appendEntry('transform', transformId, transform);
    eventBus.emit('claims.v1.created', { transformId, hash: entry.hash, signature: entry.signature });
    return transformId;
  }

  public async registerClaim(req: { subject: string, predicate: string, object: string, evidenceRefs: string[], confidence: number, licenseId: string }): Promise<string> {
    const claimId = `cl_${crypto.randomUUID()}`;
    const claim: Claim = {
      claimId,
      ...req,
      timestamp: new Date().toISOString()
    };

    const entry = await this.appendEntry('claim', claimId, claim);
    eventBus.emit('claims.v1.created', { claimId, hash: entry.hash, signature: entry.signature });
    return claimId;
  }

  public async getManifest(bundleId: string): Promise<Manifest | null> {
    // Return all entries ordered by sequence
    const res = await this.pool.query('SELECT * FROM ledger_entries ORDER BY seq ASC');

    if (res.rows.length === 0) return null;

    const entries: LedgerEntry[] = res.rows.map(row => ({
      id: row.id,
      type: row.type,
      data: row.data,
      previousHash: row.previous_hash,
      hash: row.hash,
      signature: row.signature,
      publicKey: row.public_key,
    }));

    const merkle = merkleRoot(entries.map(e => e.hash));
    const deterministicBundleId = bundleId || `bundle_${merkle.slice(0, 12)}`;

    const manifest: Manifest = {
      bundleId: deterministicBundleId,
      merkleRoot: merkle,
      entries,
    };

    eventBus.emit('manifests.v1.emitted', manifest);
    return manifest;
  }
}
