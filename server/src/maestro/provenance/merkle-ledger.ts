import { createHash } from 'crypto';
import { getPostgresPool } from '../../db/postgres.js';
import { otelService } from '../../middleware/observability/otel-tracing.js';

interface Evidence {
  id: string;
  runId: string;
  artifactType: string;
  hash: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface MerkleNode {
  hash: string;
  left?: MerkleNode;
  right?: MerkleNode;
  data?: Evidence;
}

interface MerkleProof {
  leaf: string;
  proof: Array<{ hash: string; side: 'left' | 'right' }>;
  root: string;
}

interface Claim {
  id: string;
  runId: string;
  statement: string;
  evidence: string[];
  confidence: number;
  source: string;
  timestamp: string;
}

interface Contradiction {
  id: string;
  claimA: string;
  claimB: string;
  conflictReason: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

export function merkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return '';
  if (hashes.length === 1) return hashes[0];

  let layer = hashes.map((h) => Buffer.from(h, 'hex'));

  while (layer.length > 1) {
    const next: Buffer[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const a = layer[i];
      const b = layer[i + 1] ?? layer[i]; // Duplicate last if odd number
      next.push(
        createHash('sha256')
          .update(Buffer.concat([a, b]))
          .digest(),
      );
    }
    layer = next;
  }

  return layer[0].toString('hex');
}

export function buildMerkleTree(evidenceList: Evidence[]): MerkleNode {
  if (evidenceList.length === 0) {
    throw new Error('Cannot build Merkle tree from empty evidence list');
  }

  // Create leaf nodes
  let nodes: MerkleNode[] = evidenceList.map((evidence) => ({
    hash: evidence.hash,
    data: evidence,
  }));

  // Build tree bottom-up
  while (nodes.length > 1) {
    const nextLevel: MerkleNode[] = [];

    for (let i = 0; i < nodes.length; i += 2) {
      const left = nodes[i];
      const right = nodes[i + 1] ?? left; // Duplicate if odd number

      const combinedHash = createHash('sha256')
        .update(
          Buffer.concat([
            Buffer.from(left.hash, 'hex'),
            Buffer.from(right.hash, 'hex'),
          ]),
        )
        .digest('hex');

      nextLevel.push({
        hash: combinedHash,
        left,
        right: nodes[i + 1] ? right : undefined, // Only set right if different from left
      });
    }

    nodes = nextLevel;
  }

  return nodes[0];
}

export function generateMerkleProof(
  tree: MerkleNode,
  targetHash: string,
): MerkleProof | null {
  const proof: Array<{ hash: string; side: 'left' | 'right' }> = [];

  function findPath(node: MerkleNode): boolean {
    if (node.data?.hash === targetHash) {
      return true;
    }

    if (!node.left && !node.right) {
      return false;
    }

    // Check left subtree
    if (node.left && findPath(node.left)) {
      if (node.right) {
        proof.push({ hash: node.right.hash, side: 'right' });
      }
      return true;
    }

    // Check right subtree
    if (node.right && findPath(node.right)) {
      if (node.left) {
        proof.push({ hash: node.left.hash, side: 'left' });
      }
      return true;
    }

    return false;
  }

  if (!findPath(tree)) {
    return null;
  }

  return {
    leaf: targetHash,
    proof: proof.reverse(), // Reverse to get root-to-leaf order
    root: tree.hash,
  };
}

export function verifyMerkleProof(proof: MerkleProof): boolean {
  let currentHash = proof.leaf;

  for (const step of proof.proof) {
    const leftHash = step.side === 'left' ? step.hash : currentHash;
    const rightHash = step.side === 'right' ? step.hash : currentHash;

    currentHash = createHash('sha256')
      .update(
        Buffer.concat([
          Buffer.from(leftHash, 'hex'),
          Buffer.from(rightHash, 'hex'),
        ]),
      )
      .digest('hex');
  }

  return currentHash === proof.root;
}

export class ProvenanceLedger {
  async registerEvidence(evidence: Evidence): Promise<string> {
    const span = otelService.createSpan('provenance.register_evidence');

    try {
      const pool = getPostgresPool();

      // Store evidence in ledger
      await pool.query(
        `INSERT INTO evidence_ledger 
         (id, run_id, artifact_type, hash, timestamp, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          evidence.id,
          evidence.runId,
          evidence.artifactType,
          evidence.hash,
          evidence.timestamp,
          JSON.stringify(evidence.metadata || {}),
        ],
      );

      // Update or create Merkle tree for this run
      await this.updateMerkleTree(evidence.runId);

      span?.addSpanAttributes({
        'provenance.evidence_id': evidence.id,
        'provenance.run_id': evidence.runId,
        'provenance.artifact_type': evidence.artifactType,
      });

      return evidence.id;
    } catch (error: any) {
      console.error('Evidence registration failed:', error);
      throw error;
    } finally {
      span?.end();
    }
  }

  private async updateMerkleTree(runId: string): Promise<void> {
    const pool = getPostgresPool();

    // Get all evidence for this run
    const { rows } = await pool.query(
      `SELECT id, run_id, artifact_type, hash, timestamp, metadata
       FROM evidence_ledger
       WHERE run_id = $1
       ORDER BY timestamp ASC`,
      [runId],
    );

    if (rows.length === 0) return;

    const evidenceList: Evidence[] = rows.map((row) => ({
      id: row.id,
      runId: row.run_id,
      artifactType: row.artifact_type,
      hash: row.hash,
      timestamp: row.timestamp,
      metadata: row.metadata,
    }));

    // Build Merkle tree
    const tree = buildMerkleTree(evidenceList);

    // Store tree root
    await pool.query(
      `INSERT INTO merkle_trees (run_id, root_hash, evidence_count, created_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (run_id) DO UPDATE SET
       root_hash = $2, evidence_count = $3, updated_at = now()`,
      [runId, tree.hash, evidenceList.length],
    );
  }

  async exportManifest(runId: string): Promise<{
    runId: string;
    rootHash: string;
    evidenceCount: number;
    manifest: Evidence[];
    timestamp: string;
  }> {
    const span = otelService.createSpan('provenance.export_manifest');

    try {
      const pool = getPostgresPool();

      // Get Merkle tree info
      const { rows: treeRows } = await pool.query(
        `SELECT root_hash, evidence_count, created_at
         FROM merkle_trees WHERE run_id = $1`,
        [runId],
      );

      if (!treeRows.length) {
        throw new Error(`No Merkle tree found for run ${runId}`);
      }

      // Get all evidence
      const { rows: evidenceRows } = await pool.query(
        `SELECT id, run_id, artifact_type, hash, timestamp, metadata
         FROM evidence_ledger
         WHERE run_id = $1
         ORDER BY timestamp ASC`,
        [runId],
      );

      const manifest: Evidence[] = evidenceRows.map((row) => ({
        id: row.id,
        runId: row.run_id,
        artifactType: row.artifact_type,
        hash: row.hash,
        timestamp: row.timestamp,
        metadata: row.metadata,
      }));

      const exportData = {
        runId,
        rootHash: treeRows[0].root_hash,
        evidenceCount: treeRows[0].evidence_count,
        manifest,
        timestamp: new Date().toISOString(),
      };

      // Log export event
      await pool.query(
        `INSERT INTO provenance_exports (run_id, root_hash, exported_at)
         VALUES ($1, $2, now())`,
        [runId, exportData.rootHash],
      );

      span?.addSpanAttributes({
        'provenance.export.run_id': runId,
        'provenance.export.evidence_count': manifest.length,
        'provenance.export.root_hash': exportData.rootHash,
      });

      return exportData;
    } catch (error: any) {
      console.error('Manifest export failed:', error);
      throw error;
    } finally {
      span?.end();
    }
  }

  async verifyManifest(manifest: any): Promise<{
    valid: boolean;
    rootHash: string;
    computedRootHash: string;
    details: any;
  }> {
    try {
      const evidenceList: Evidence[] = manifest.manifest || [];
      const tree = buildMerkleTree(evidenceList);
      const computedRootHash = tree.hash;

      return {
        valid: computedRootHash === manifest.rootHash,
        rootHash: manifest.rootHash,
        computedRootHash,
        details: {
          evidenceCount: evidenceList.length,
          manifestTimestamp: manifest.timestamp,
          verifiedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        valid: false,
        rootHash: manifest.rootHash || '',
        computedRootHash: '',
        details: { error: error.message },
      };
    }
  }

  async createClaim(claim: Claim): Promise<string> {
    const pool = getPostgresPool();

    await pool.query(
      `INSERT INTO claims (id, run_id, statement, evidence, confidence, source, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        claim.id,
        claim.runId,
        claim.statement,
        JSON.stringify(claim.evidence),
        claim.confidence,
        claim.source,
        claim.timestamp,
      ],
    );

    // Check for contradictions
    await this.detectContradictions(claim.id);

    return claim.id;
  }

  private async detectContradictions(newClaimId: string): Promise<void> {
    const pool = getPostgresPool();

    // Get the new claim
    const { rows: newClaimRows } = await pool.query(
      `SELECT * FROM claims WHERE id = $1`,
      [newClaimId],
    );

    if (!newClaimRows.length) return;
    const newClaim = newClaimRows[0];

    // Find potentially contradicting claims (same run, different statements)
    const { rows: existingClaims } = await pool.query(
      `SELECT * FROM claims 
       WHERE run_id = $1 AND id != $2`,
      [newClaim.run_id, newClaimId],
    );

    for (const existingClaim of existingClaims) {
      const contradiction = this.analyzeContradiction(newClaim, existingClaim);

      if (contradiction) {
        await pool.query(
          `INSERT INTO contradictions (id, claim_a, claim_b, conflict_reason, severity, timestamp)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, now())`,
          [
            newClaimId,
            existingClaim.id,
            contradiction.reason,
            contradiction.severity,
          ],
        );
      }
    }
  }

  private analyzeContradiction(
    claimA: any,
    claimB: any,
  ): { reason: string; severity: 'low' | 'medium' | 'high' } | null {
    // Simple contradiction detection (can be enhanced with NLP)
    const statementA = claimA.statement.toLowerCase();
    const statementB = claimB.statement.toLowerCase();

    // Detect explicit contradictions
    if (
      (statementA.includes('successful') && statementB.includes('failed')) ||
      (statementA.includes('approved') && statementB.includes('denied')) ||
      (statementA.includes('secure') && statementB.includes('vulnerable'))
    ) {
      return { reason: 'Contradictory outcome statements', severity: 'high' };
    }

    // Detect conflicting metrics
    const metricPatterns = [
      /latency.*?(\d+).*?ms/,
      /cost.*?\$(\d+\.?\d*)/,
      /success rate.*?(\d+\.?\d*)%/,
    ];

    for (const pattern of metricPatterns) {
      const matchA = statementA.match(pattern);
      const matchB = statementB.match(pattern);

      if (matchA && matchB) {
        const valueA = parseFloat(matchA[1]);
        const valueB = parseFloat(matchB[1]);

        if (Math.abs(valueA - valueB) / Math.max(valueA, valueB) > 0.5) {
          return { reason: 'Conflicting metric values', severity: 'medium' };
        }
      }
    }

    return null;
  }

  async getClaimsAndContradictions(runId: string): Promise<{
    claims: Claim[];
    contradictions: Contradiction[];
  }> {
    const pool = getPostgresPool();

    const { rows: claimsRows } = await pool.query(
      `SELECT * FROM claims WHERE run_id = $1 ORDER BY timestamp DESC`,
      [runId],
    );

    const { rows: contradictionsRows } = await pool.query(
      `SELECT c.*, ca.statement as claim_a_statement, cb.statement as claim_b_statement
       FROM contradictions c
       JOIN claims ca ON c.claim_a = ca.id
       JOIN claims cb ON c.claim_b = cb.id
       WHERE ca.run_id = $1 OR cb.run_id = $1
       ORDER BY c.timestamp DESC`,
      [runId],
    );

    return {
      claims: claimsRows.map((row) => ({
        id: row.id,
        runId: row.run_id,
        statement: row.statement,
        evidence: JSON.parse(row.evidence),
        confidence: row.confidence,
        source: row.source,
        timestamp: row.timestamp,
      })),
      contradictions: contradictionsRows.map((row) => ({
        id: row.id,
        claimA: row.claim_a,
        claimB: row.claim_b,
        conflictReason: row.conflict_reason,
        severity: row.severity,
        timestamp: row.timestamp,
      })),
    };
  }
}

export const PROVENANCE_LEDGER_SCHEMA = `
CREATE TABLE IF NOT EXISTS evidence_ledger (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  hash TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS merkle_trees (
  run_id TEXT PRIMARY KEY,
  root_hash TEXT NOT NULL,
  evidence_count INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provenance_exports (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL,
  root_hash TEXT NOT NULL,
  exported_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  statement TEXT NOT NULL,
  evidence JSONB NOT NULL,
  confidence DECIMAL(3,2),
  source TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contradictions (
  id TEXT PRIMARY KEY,
  claim_a TEXT REFERENCES claims(id),
  claim_b TEXT REFERENCES claims(id),
  conflict_reason TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low','medium','high')),
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS evidence_ledger_run_idx ON evidence_ledger (run_id, timestamp);
CREATE INDEX IF NOT EXISTS claims_run_idx ON claims (run_id, timestamp DESC);
`;

export const provenanceLedger = new ProvenanceLedger();
