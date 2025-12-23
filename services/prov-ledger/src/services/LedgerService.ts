// @ts-nocheck
import { Evidence, Transform, Claim, LedgerEntry, Manifest, DisclosureBundle } from '../types.js';
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
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ledger_entries (
          id TEXT PRIMARY KEY,
          case_id TEXT,
          type TEXT NOT NULL,
          data JSONB NOT NULL,
          previous_hash TEXT,
          hash TEXT NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          seq SERIAL
        );

        CREATE INDEX IF NOT EXISTS idx_ledger_seq ON ledger_entries(seq);
        CREATE INDEX IF NOT EXISTS idx_ledger_case ON ledger_entries(case_id);
      `);
    } catch (e) {
      console.error('InitDB Error:', e);
      throw e;
    }
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

  private async getPreviousEntry(caseId?: string): Promise<{ hash: string } | null> {
    let res;
    if (caseId) {
      res = await this.pool.query('SELECT hash FROM ledger_entries WHERE case_id = $1 ORDER BY seq DESC LIMIT 1', [caseId]);
    } else {
      res = await this.pool.query('SELECT hash FROM ledger_entries WHERE case_id IS NULL ORDER BY seq DESC LIMIT 1');
    }

    if (res.rows.length === 0) return null;
    return res.rows[0];
  }

  private async appendEntry(type: 'evidence' | 'transform' | 'claim', id: string, data: any, caseId?: string): Promise<string> {
    const previousEntry = await this.getPreviousEntry(caseId);
    const previousHash = previousEntry ? previousEntry.hash : null;

    // Hash payload: type + data + prevHash + caseId
    const entryPayload = {
      type,
      data,
      previousHash,
      caseId
    };

    const hash = calculateHash(entryPayload);

    await this.pool.query(
      'INSERT INTO ledger_entries (id, case_id, type, data, previous_hash, hash) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, caseId || null, type, JSON.stringify(data), previousHash, hash]
    );

    return hash;
  }

  public async registerEvidence(req: { source: string, url?: string, blob?: string, license?: string, hash: string, caseId?: string }): Promise<string> {
    const evidenceId = `ev_${crypto.randomUUID()}`;
    const evidence: Evidence = {
      evidenceId,
      ...req,
      timestamp: new Date().toISOString()
    };

    await this.appendEntry('evidence', evidenceId, evidence, req.caseId);
    return evidenceId;
  }

  public async registerTransform(req: { inputs: string[], tool: string, params: any, outputs: string[], operatorId: string, caseId?: string }): Promise<string> {
    const transformId = `tx_${crypto.randomUUID()}`;
    const transform: Transform = {
      transformId,
      ...req,
      timestamp: new Date().toISOString()
    };

    await this.appendEntry('transform', transformId, transform, req.caseId);
    return transformId;
  }

  public async registerClaim(req: { subject: string, predicate: string, object: string, evidenceRefs: string[], confidence: number, licenseId: string, caseId?: string }): Promise<string> {
    const claimId = `cl_${crypto.randomUUID()}`;
    const claim: Claim = {
      claimId,
      ...req,
      timestamp: new Date().toISOString()
    };

    await this.appendEntry('claim', claimId, claim, req.caseId);
    return claimId;
  }

  public async getManifest(bundleId: string): Promise<Manifest | null> {
    return this.getBundle(bundleId);
  }

  public async getBundle(caseId: string): Promise<DisclosureBundle | null> {
    const res = await this.pool.query('SELECT * FROM ledger_entries WHERE case_id = $1 ORDER BY seq ASC', [caseId]);

    if (res.rows.length === 0) return null;

    const entries: LedgerEntry[] = res.rows.map((row: any) => ({
      id: row.id,
      caseId: row.case_id,
      type: row.type,
      data: row.data,
      previousHash: row.previous_hash,
      hash: row.hash
    }));

    // The chain's integrity relies on the last hash
    const merkleRoot = entries[entries.length - 1]!.hash;

    return {
      bundleId: caseId,
      merkleRoot,
      entries
    };
  }
}
