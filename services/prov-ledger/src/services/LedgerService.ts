import { Evidence, Transform, Claim, LedgerEntry, Manifest } from '../types.js';
import { calculateHash } from '../utils/hash.js';
import { Pool } from 'pg';
import crypto from 'crypto';
import { newDb } from 'pg-mem';

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
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        seq SERIAL
      );

      CREATE INDEX IF NOT EXISTS idx_ledger_seq ON ledger_entries(seq);
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

  private async appendEntry(type: 'evidence' | 'transform' | 'claim', id: string, data: any): Promise<string> {
    const previousEntry = await this.getPreviousEntry();
    const previousHash = previousEntry ? previousEntry.hash : null;

    // Hash payload: type + data + prevHash
    const entryPayload = {
      type,
      data,
      previousHash
    };

    const hash = calculateHash(entryPayload);

    await this.pool.query(
      'INSERT INTO ledger_entries (id, type, data, previous_hash, hash) VALUES ($1, $2, $3, $4, $5)',
      [id, type, JSON.stringify(data), previousHash, hash]
    );

    return hash;
  }

  public async registerEvidence(req: { source: string, url?: string, blob?: string, license?: string, hash: string }): Promise<string> {
    const evidenceId = `ev_${crypto.randomUUID()}`;
    const evidence: Evidence = {
      evidenceId,
      ...req,
      timestamp: new Date().toISOString()
    };

    await this.appendEntry('evidence', evidenceId, evidence);
    return evidenceId;
  }

  public async registerTransform(req: { inputs: string[], tool: string, params: any, outputs: string[], operatorId: string }): Promise<string> {
    const transformId = `tx_${crypto.randomUUID()}`;
    const transform: Transform = {
      transformId,
      ...req,
      timestamp: new Date().toISOString()
    };

    await this.appendEntry('transform', transformId, transform);
    return transformId;
  }

  public async registerClaim(req: { subject: string, predicate: string, object: string, evidenceRefs: string[], confidence: number, licenseId: string }): Promise<string> {
    const claimId = `cl_${crypto.randomUUID()}`;
    const claim: Claim = {
      claimId,
      ...req,
      timestamp: new Date().toISOString()
    };

    await this.appendEntry('claim', claimId, claim);
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
      hash: row.hash
    }));

    const merkleRoot = entries[entries.length - 1].hash;

    return {
      bundleId,
      merkleRoot,
      entries
    };
  }
}
