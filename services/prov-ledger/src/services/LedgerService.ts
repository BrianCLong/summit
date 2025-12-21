import crypto from 'crypto';
import { Pool } from 'pg';
import { createDatabase, Database } from '../lib/db.js';
import { calculateHash } from '../utils/hash.js';
import {
  Claim,
  ClaimInput,
  Evidence,
  EvidenceInput,
  Manifest,
  ManifestLeaf,
  ProvenanceChain,
  ProvenanceInput,
} from '../types.js';
import { buildMerkleTree } from '../lib/merkle.js';

export class LedgerService {
  private static instance: LedgerService;
  private readonly db: Database;
  private readonly pool: Pool;
  private readonly ready: Promise<void>;

  private constructor() {
    this.db = createDatabase();
    this.pool = this.db.pool;
    this.ready = this.db.ready;
  }

  public static getInstance(): LedgerService {
    if (!LedgerService.instance) {
      LedgerService.instance = new LedgerService();
    }
    return LedgerService.instance;
  }

  private async appendLedgerEntry(
    type: string,
    id: string,
    data: Record<string, unknown>,
    claimId?: string,
  ): Promise<string> {
    await this.ready;
    const previous = await this.pool.query('SELECT hash FROM ledger_entries ORDER BY seq DESC LIMIT 1');
    const previousHash = previous.rows[0]?.hash || null;
    const payload = { type, data, previousHash };
    const hash = calculateHash(payload);

    await this.pool.query(
      'INSERT INTO ledger_entries (id, claim_id, type, data, previous_hash, hash) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, claimId ?? null, type, JSON.stringify(data), previousHash, hash],
    );

    return hash;
  }

  async createClaim(input: ClaimInput): Promise<Claim> {
    await this.ready;
    const id = `clm_${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const claim: Claim = {
      id,
      createdAt,
      ...input,
    };

    await this.pool.query(
      `INSERT INTO claims (id, source_uri, hash, type, confidence, license_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        claim.id,
        claim.sourceUri,
        claim.hash,
        claim.type,
        claim.confidence,
        claim.licenseId,
        claim.createdAt,
      ],
    );

    await this.appendLedgerEntry('claim', id, claim, id);
    return claim;
  }

  async getClaim(id: string): Promise<Claim | null> {
    await this.ready;
    const res = await this.pool.query('SELECT * FROM claims WHERE id=$1', [id]);
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      sourceUri: row.source_uri,
      hash: row.hash,
      type: row.type,
      confidence: Number(row.confidence),
      licenseId: row.license_id,
      createdAt: row.created_at.toISOString(),
    };
  }

  async createEvidence(input: EvidenceInput): Promise<Evidence> {
    await this.ready;
    const claim = await this.getClaim(input.claimId);
    if (!claim) {
      throw new Error('CLAIM_NOT_FOUND');
    }

    const id = `ev_${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const evidence: Evidence = {
      id,
      createdAt,
      artifactDigest: input.artifactDigest,
      transformChain: input.transformChain ?? [],
      claimId: input.claimId,
    };

    await this.pool.query(
      `INSERT INTO evidence (id, claim_id, artifact_digest, transform_chain, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [evidence.id, evidence.claimId, evidence.artifactDigest, JSON.stringify(evidence.transformChain), evidence.createdAt],
    );

    await this.appendLedgerEntry('evidence', id, evidence, evidence.claimId);
    return evidence;
  }

  async getEvidence(id: string): Promise<Evidence | null> {
    await this.ready;
    const res = await this.pool.query('SELECT * FROM evidence WHERE id=$1', [id]);
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      claimId: row.claim_id,
      artifactDigest: row.artifact_digest,
      transformChain: row.transform_chain,
      createdAt: row.created_at.toISOString(),
    };
  }

  async createProvenance(input: ProvenanceInput): Promise<ProvenanceChain> {
    await this.ready;
    const claim = await this.getClaim(input.claimId);
    if (!claim) {
      throw new Error('CLAIM_NOT_FOUND');
    }

    const id = `pv_${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const chain: ProvenanceChain = {
      id,
      claimId: input.claimId,
      transforms: input.transforms,
      sources: input.sources,
      lineage: input.lineage,
      createdAt,
    };

    await this.pool.query(
      `INSERT INTO provenance_chains (id, claim_id, transforms, sources, lineage, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [chain.id, chain.claimId, JSON.stringify(chain.transforms), JSON.stringify(chain.sources), JSON.stringify(chain.lineage), chain.createdAt],
    );

    await this.appendLedgerEntry('provenance', id, chain, chain.claimId);
    return chain;
  }

  async listProvenance(claimId?: string): Promise<ProvenanceChain[]> {
    await this.ready;
    const res = claimId
      ? await this.pool.query('SELECT * FROM provenance_chains WHERE claim_id=$1 ORDER BY created_at ASC', [claimId])
      : await this.pool.query('SELECT * FROM provenance_chains ORDER BY created_at ASC');

    return res.rows.map((row) => ({
      id: row.id,
      claimId: row.claim_id,
      transforms: row.transforms,
      sources: row.sources,
      lineage: row.lineage,
      createdAt: row.created_at.toISOString(),
    }));
  }

  async verifyHash(content: unknown, expectedHash: string): Promise<{ valid: boolean; actualHash: string }>
  {
    const actualHash = calculateHash(content);
    return { valid: actualHash === expectedHash, actualHash };
  }

  async buildManifest(bundleId: string): Promise<Manifest | null> {
    await this.ready;
    const claim = await this.getClaim(bundleId);
    if (!claim) {
      return null;
    }

    const evidenceRes = await this.pool.query('SELECT * FROM evidence WHERE claim_id=$1 ORDER BY created_at ASC', [bundleId]);
    const evidences: Evidence[] = evidenceRes.rows.map((row) => ({
      id: row.id,
      claimId: row.claim_id,
      artifactDigest: row.artifact_digest,
      transformChain: row.transform_chain,
      createdAt: row.created_at.toISOString(),
    }));

    const ledgerRes = await this.pool.query(
      'SELECT hash FROM ledger_entries WHERE claim_id=$1 ORDER BY seq ASC',
      [bundleId],
    );
    const ledgerHashes: ManifestLeaf[] = ledgerRes.rows.map((row: { hash: string }) => ({
      type: 'ledger',
      hash: row.hash,
    }));

    const evidenceLeaves: ManifestLeaf[] = evidences.map((ev) => ({
      type: 'evidence',
      hash: calculateHash({ artifactDigest: ev.artifactDigest, transformChain: ev.transformChain }),
      refId: ev.id,
    }));

    const claimLeaf: ManifestLeaf = { type: 'claim', hash: claim.hash, refId: claim.id };
    const leaves = [claimLeaf, ...evidenceLeaves, ...ledgerHashes];
    const tree = buildMerkleTree(leaves.map((leaf) => leaf.hash));

    return {
      bundleId,
      version: '1.0',
      generatedAt: new Date().toISOString(),
      merkleRoot: tree.root,
      leaves,
      tree,
      claim,
      evidence: evidences,
    };
  }

  async resetAll(): Promise<void> {
    await this.ready;
    await this.pool.query('TRUNCATE TABLE provenance_chains, evidence, claims, ledger_entries RESTART IDENTITY');
  }
}

