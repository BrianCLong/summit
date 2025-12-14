/**
 * GraphQL Resolvers for Provenance & Claims Ledger
 */

import { Pool } from 'pg';
import { GraphQLScalarType, Kind } from 'graphql';
import crypto from 'crypto';

// Database pool (shared with REST service)
let pool: Pool;

export function setDatabasePool(dbPool: Pool) {
  pool = dbPool;
}

// ============================================================================
// Custom Scalars
// ============================================================================

const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'ISO 8601 DateTime',
  serialize(value: any): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return new Date(value).toISOString();
  },
  parseValue(value: any): Date {
    return new Date(value);
  },
  parseLiteral(ast): Date | null {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON object',
  serialize(value: any): any {
    return value;
  },
  parseValue(value: any): any {
    return value;
  },
  parseLiteral(ast): any {
    if (ast.kind === Kind.OBJECT) {
      return ast;
    }
    return null;
  },
});

// ============================================================================
// Utility Functions
// ============================================================================

function generateHash(content: any): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(content, Object.keys(content).sort()))
    .digest('hex');
}

function generateChecksum(content: any, algorithm: string = 'sha256'): string {
  const hash = crypto.createHash(algorithm);
  if (Buffer.isBuffer(content)) {
    hash.update(content);
  } else if (typeof content === 'string') {
    hash.update(content);
  } else {
    hash.update(JSON.stringify(content));
  }
  return hash.digest('hex');
}

function generateClaimId(): string {
  return `claim_${crypto.randomUUID()}`;
}

function generateEvidenceId(): string {
  return `evidence_${crypto.randomUUID()}`;
}

function generateProvenanceId(): string {
  return `prov_${crypto.randomUUID()}`;
}

function generateCaseId(): string {
  return `case_${crypto.randomUUID()}`;
}

function computeMerkleRoot(hashes: string[]): string {
  if (hashes.length === 0) return '';
  if (hashes.length === 1) return hashes[0];

  const newLevel: string[] = [];
  for (let i = 0; i < hashes.length; i += 2) {
    if (i + 1 < hashes.length) {
      const combined = hashes[i] + hashes[i + 1];
      newLevel.push(generateChecksum(combined));
    } else {
      newLevel.push(hashes[i]);
    }
  }

  return computeMerkleRoot(newLevel);
}

// Function to generate (or retrieve) a signing key pair
// In production, this would use a KMS or HSM
function getSigningKeyPair() {
  // Check if keys are stored in environment or generate ephemeral ones
  if (process.env.SIGNING_PRIVATE_KEY && process.env.SIGNING_PUBLIC_KEY) {
    return {
      privateKey: process.env.SIGNING_PRIVATE_KEY,
      publicKey: process.env.SIGNING_PUBLIC_KEY,
    };
  }

  // For MVP/Demo: Generate ephemeral Ed25519 keys
  // Note: This means signatures won't persist across restarts unless keys are externalized
  // Ideally, these should be generated once and stored in secrets
  return crypto.generateKeyPairSync('ed25519', {
    privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
    publicKeyEncoding: { format: 'pem', type: 'spki' },
  });
}

const { privateKey, publicKey } = getSigningKeyPair();

function signContent(content: string): string {
  const signer = crypto.createSign(null);
  signer.update(content);
  signer.end();
  return signer.sign(privateKey).toString('base64');
}

function verifySignature(content: string, signature: string): boolean {
  const verifier = crypto.createVerify(null);
  verifier.update(content);
  verifier.end();
  return verifier.verify(publicKey, Buffer.from(signature, 'base64'));
}

// ============================================================================
// Query Resolvers
// ============================================================================

const Query = {
  async claim(_: any, { id }: { id: string }, context: any) {
    const result = await pool.query(
      'SELECT * FROM claims WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      content: row.content,
      hash: row.hash,
      signature: row.signature,
      metadata: row.metadata,
      sourceRef: row.source_ref,
      licenseId: row.license_id,
      policyLabels: row.policy_labels || [],
      createdAt: row.created_at,
    };
  },

  async claims(_: any, { limit = 50, offset = 0 }: { limit?: number; offset?: number }) {
    const result = await pool.query(
      'SELECT * FROM claims ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset],
    );

    return result.rows.map((row) => ({
      id: row.id,
      content: row.content,
      hash: row.hash,
      signature: row.signature,
      metadata: row.metadata,
      sourceRef: row.source_ref,
      licenseId: row.license_id,
      policyLabels: row.policy_labels || [],
      createdAt: row.created_at,
    }));
  },

  async evidence(_: any, { id }: { id: string }) {
    const result = await pool.query(
      'SELECT * FROM evidence WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      caseId: row.case_id,
      sourceRef: row.source_ref,
      checksum: row.checksum,
      checksumAlgorithm: row.checksum_algorithm,
      contentType: row.content_type,
      fileSize: row.file_size,
      transformChain: row.transform_chain,
      licenseId: row.license_id,
      policyLabels: row.policy_labels || [],
      authorityId: row.authority_id,
      createdAt: row.created_at,
      metadata: row.metadata,
    };
  },

  async allEvidence(_: any, { limit = 50, offset = 0 }: { limit?: number; offset?: number }) {
    const result = await pool.query(
      'SELECT * FROM evidence ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset],
    );

    return result.rows.map((row) => ({
      id: row.id,
      caseId: row.case_id,
      sourceRef: row.source_ref,
      checksum: row.checksum,
      checksumAlgorithm: row.checksum_algorithm,
      contentType: row.content_type,
      fileSize: row.file_size,
      transformChain: row.transform_chain,
      licenseId: row.license_id,
      policyLabels: row.policy_labels || [],
      authorityId: row.authority_id,
      createdAt: row.created_at,
      metadata: row.metadata,
    }));
  },

  async evidenceByCase(_: any, { caseId }: { caseId: string }) {
    const result = await pool.query(
      `SELECT e.* FROM evidence e
       INNER JOIN case_evidence ce ON e.id = ce.evidence_id
       WHERE ce.case_id = $1
       ORDER BY e.created_at ASC`,
      [caseId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      caseId: row.case_id,
      sourceRef: row.source_ref,
      checksum: row.checksum,
      checksumAlgorithm: row.checksum_algorithm,
      contentType: row.content_type,
      fileSize: row.file_size,
      transformChain: row.transform_chain,
      licenseId: row.license_id,
      policyLabels: row.policy_labels || [],
      authorityId: row.authority_id,
      createdAt: row.created_at,
      metadata: row.metadata,
    }));
  },

  async provenanceChains(_: any, { claimId }: { claimId: string }) {
    const result = await pool.query(
      'SELECT * FROM provenance_chains WHERE claim_id = $1 ORDER BY created_at DESC',
      [claimId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      claimId: row.claim_id,
      transforms: row.transforms,
      sources: row.sources,
      lineage: row.lineage,
      createdAt: row.created_at,
    }));
  },

  async case(_: any, { id }: { id: string }) {
    const result = await pool.query(
      'SELECT * FROM cases WHERE id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata,
    };
  },

  async cases(_: any, { limit = 50, offset = 0 }: { limit?: number; offset?: number }) {
    const result = await pool.query(
      'SELECT * FROM cases ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset],
    );

    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata,
    }));
  },

  async disclosureBundle(_: any, { caseId }: { caseId: string }) {
    // Verify case exists
    const caseResult = await pool.query(
      'SELECT id FROM cases WHERE id = $1',
      [caseId],
    );

    if (caseResult.rows.length === 0) {
      throw new Error('Case not found');
    }

    // Get all evidence for the case
    const evidenceResult = await pool.query(
      `SELECT e.* FROM evidence e
       INNER JOIN case_evidence ce ON e.id = ce.evidence_id
       WHERE ce.case_id = $1
       ORDER BY e.created_at ASC`,
      [caseId],
    );

    const evidence = evidenceResult.rows.map((row) => ({
      id: row.id,
      sourceRef: row.source_ref,
      checksum: row.checksum,
      transformChain: row.transform_chain,
    }));

    // Build hash tree
    const hashTree = evidenceResult.rows.map((row) => row.checksum);

    // Compute merkle root
    const merkleRoot = computeMerkleRoot(hashTree);

    return {
      caseId,
      version: '1.0',
      evidence,
      hashTree,
      merkleRoot,
      generatedAt: new Date().toISOString(),
    };
  },

  async provenanceManifest(_: any, { id }: { id: string }, context: any) {
      // 1. Try to find if manifest already exists by ID
      const manifestRes = await pool.query(
        'SELECT * FROM manifests WHERE id = $1',
        [id]
      );

      if (manifestRes.rows.length > 0) {
        const row = manifestRes.rows[0];
        return {
          id: row.id,
          version: row.version,
          claims: row.claims,
          hashChain: row.hash_chain,
          signature: row.signature,
          generatedAt: row.generated_at
        };
      }

      // If not found, fall back to generation logic (which should be in mutation strictly, but for safety read logic)
      // Actually, standard practice for Query is read-only. We should likely throw or return null if not found.
      // But based on previous implementation pattern, we'll return null to signal it needs creation.
      return null;
  },

  async verifyTransformChain(_: any, { evidenceId }: { evidenceId: string }) {
    const result = await pool.query(
      'SELECT * FROM evidence WHERE id = $1',
      [evidenceId],
    );

    if (result.rows.length === 0) {
      throw new Error('Evidence not found');
    }

    const evidence = result.rows[0];
    const issues: string[] = [];
    let transformChainValid = true;
    let checksumValid = true;

    // Validate transform chain structure
    const transformChain = evidence.transform_chain;
    if (!Array.isArray(transformChain)) {
      transformChainValid = false;
      issues.push('Transform chain is not an array');
    } else {
      for (let i = 0; i < transformChain.length; i++) {
        const step = transformChain[i];
        if (!step.transformType) {
          transformChainValid = false;
          issues.push(`Transform step ${i} missing transformType`);
        }
        if (!step.timestamp) {
          transformChainValid = false;
          issues.push(`Transform step ${i} missing timestamp`);
        }
        if (!step.actorId) {
          transformChainValid = false;
          issues.push(`Transform step ${i} missing actorId`);
        }
      }
    }

    // Validate checksum format
    if (!evidence.checksum || evidence.checksum.length !== 64) {
      checksumValid = false;
      issues.push('Invalid checksum format (expected SHA-256)');
    }

    return {
      valid: transformChainValid && checksumValid,
      evidenceId,
      transformChainValid,
      checksumValid,
      issues,
      verifiedAt: new Date().toISOString(),
    };
  },

  async health() {
    try {
      await pool.query('SELECT 1');
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'healthy',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'unhealthy',
      };
    }
  },
};

// ============================================================================
// Mutation Resolvers
// ============================================================================

const Mutation = {
  async createClaim(_: any, { input }: { input: any }, context: any) {
    const { content, signature, metadata, sourceRef, licenseId, policyLabels } = input;
    const id = generateClaimId();
    const hash = generateHash(content);
    const createdAt = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO claims (id, content, hash, signature, metadata, source_ref, license_id, policy_labels, created_at, authority_id, reason_for_access)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        id,
        JSON.stringify(content),
        hash,
        signature,
        JSON.stringify(metadata || {}),
        sourceRef,
        licenseId,
        JSON.stringify(policyLabels || []),
        createdAt,
        context.authorityId,
        context.reasonForAccess,
      ],
    );

    const row = result.rows[0];
    return {
      id: row.id,
      content: row.content,
      hash: row.hash,
      signature: row.signature,
      metadata: row.metadata,
      sourceRef: row.source_ref,
      licenseId: row.license_id,
      policyLabels: row.policy_labels || [],
      createdAt: row.created_at,
    };
  },

  async createEvidence(_: any, { input }: { input: any }, context: any) {
    const {
      caseId,
      sourceRef,
      content,
      checksum: providedChecksum,
      checksumAlgorithm = 'sha256',
      contentType,
      fileSize,
      transformChain = [],
      licenseId,
      policyLabels = [],
      metadata,
    } = input;

    let checksum = providedChecksum;
    if (!checksum && content) {
      checksum = generateChecksum(content, checksumAlgorithm);
    }

    if (!checksum) {
      throw new Error('Either checksum or content must be provided');
    }

    const id = generateEvidenceId();
    const createdAt = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO evidence (id, case_id, source_ref, checksum, checksum_algorithm, content_type, file_size,
       transform_chain, license_id, policy_labels, authority_id, created_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        id,
        caseId || null,
        sourceRef,
        checksum,
        checksumAlgorithm,
        contentType || null,
        fileSize || null,
        JSON.stringify(transformChain),
        licenseId || null,
        JSON.stringify(policyLabels),
        context.authorityId,
        createdAt,
        JSON.stringify(metadata || {}),
      ],
    );

    // Link to case if caseId provided
    if (caseId) {
      await pool.query(
        `INSERT INTO case_evidence (case_id, evidence_id, added_by)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [caseId, id, context.authorityId],
      );
    }

    const row = result.rows[0];
    return {
      id: row.id,
      caseId: row.case_id,
      sourceRef: row.source_ref,
      checksum: row.checksum,
      checksumAlgorithm: row.checksum_algorithm,
      contentType: row.content_type,
      fileSize: row.file_size,
      transformChain: row.transform_chain,
      licenseId: row.license_id,
      policyLabels: row.policy_labels || [],
      authorityId: row.authority_id,
      createdAt: row.created_at,
      metadata: row.metadata,
    };
  },

  async createProvenanceChain(_: any, { input }: { input: any }, context: any) {
    const { claimId, transforms, sources, lineage } = input;
    const id = generateProvenanceId();
    const createdAt = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO provenance_chains (id, claim_id, transforms, sources, lineage, created_at, authority_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        claimId,
        JSON.stringify(transforms),
        JSON.stringify(sources),
        JSON.stringify(lineage),
        createdAt,
        context.authorityId,
      ],
    );

    const row = result.rows[0];
    return {
      id: row.id,
      claimId: row.claim_id,
      transforms: row.transforms,
      sources: row.sources,
      lineage: row.lineage,
      createdAt: row.created_at,
    };
  },

  async createCase(_: any, { input }: { input: any }, context: any) {
    const { title, description, status = 'active', metadata } = input;
    const id = generateCaseId();
    const createdAt = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO cases (id, title, description, status, created_by, created_at, updated_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        title,
        description,
        status,
        context.authorityId,
        createdAt,
        createdAt,
        JSON.stringify(metadata || {}),
      ],
    );

    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata,
    };
  },

  async verifyHash(_: any, { input }: { input: any }) {
    const { content, expectedHash } = input;
    const actualHash = generateHash(content);
    const isValid = actualHash === expectedHash;

    return {
      valid: isValid,
      verificationId: `verify_${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      details: {
        expectedHash,
        actualHash,
      },
    };
  },

  async manifest(_: any, { id }: { id: string }, context: any) {
     // Generate manifest for the given ID (e.g. export or case)
     // First check if it already exists
     const existing = await Query.provenanceManifest(null, { id }, context);
     if (existing) {
       return existing;
     }

     // Generate new manifest
     const caseRes = await pool.query('SELECT id FROM cases WHERE id = $1', [id]);
     let claimsQuery = '';
     let params: any[] = [];

     if (caseRes.rows.length > 0) {
       // It's a case, get evidence as claims
       claimsQuery = `
         SELECT e.id, e.checksum as hash,
         COALESCE(e.transform_chain, '[]'::jsonb) as transforms
         FROM evidence e
         JOIN case_evidence ce ON e.id = ce.evidence_id
         WHERE ce.case_id = $1
       `;
       params = [id];
     } else {
       // Treat it as a global export or specific collection if not a case
       claimsQuery = `
         SELECT c.id, c.hash,
                COALESCE(array_agg(pc.transforms ORDER BY pc.created_at), ARRAY[]::jsonb[]) as transforms
         FROM claims c
         LEFT JOIN provenance_chains pc ON c.id = pc.claim_id
         GROUP BY c.id, c.hash
         ORDER BY c.created_at DESC
       `;
     }

     const claimsResult = await pool.query(claimsQuery, params);

     const claims = claimsResult.rows.map((row: any) => ({
       id: row.id,
       hash: row.hash,
       transforms: Array.isArray(row.transforms) ? row.transforms.filter((t: any) => t !== null) : [],
     }));

     const hashChain = generateHash(claims.map((c: any) => c.hash).join(''));

     // Sign the hash chain
     const signature = signContent(hashChain);

     const manifestId = `manifest_${crypto.randomUUID()}`;
     const generatedAt = new Date().toISOString();
     const version = '1.0';

     // Persist to DB
     await pool.query(
       `INSERT INTO manifests (id, version, hash_chain, signature, claims, generated_at, authority_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
       [
         manifestId,
         version,
         hashChain,
         signature,
         JSON.stringify(claims),
         generatedAt,
         context.authorityId
       ]
     );

     return {
       id: manifestId,
       version,
       claims,
       hashChain,
       signature,
       generatedAt,
     };
  },

  async verify(_: any, { manifestId }: { manifestId: string }) {
     // 1. Fetch manifest from DB
     const result = await pool.query(
       'SELECT * FROM manifests WHERE id = $1',
       [manifestId]
     );

     if (result.rows.length === 0) {
       throw new Error(`Manifest not found: ${manifestId}`);
     }

     const row = result.rows[0];
     const { hash_chain, signature, claims } = row;

     const checks: string[] = [];
     let valid = true;

     // 2. Verify Hash Chain Integrity
     // Recompute hash chain from claims
     const claimHashes = (claims as any[]).map(c => c.hash).join('');
     const computedChain = generateHash(claimHashes);

     if (computedChain === hash_chain) {
       checks.push('hash_chain_verified');
     } else {
       valid = false;
       checks.push('hash_chain_mismatch');
     }

     // 3. Verify Signature
     if (signature) {
       if (verifySignature(hash_chain, signature)) {
         checks.push('signature_verified');
       } else {
         valid = false;
         checks.push('signature_invalid');
       }
     } else {
       valid = false;
       checks.push('signature_missing');
     }

     return {
        valid,
        verificationId: `verify_run_${crypto.randomUUID()}`,
        timestamp: new Date().toISOString(),
        details: {
           manifestId,
           message: valid ? "Manifest verified successfully" : "Manifest verification failed",
           checks
        }
     };
  }
};

// ============================================================================
// Field Resolvers
// ============================================================================

const Claim = {
  async provenanceChains(parent: any) {
    const result = await pool.query(
      'SELECT * FROM provenance_chains WHERE claim_id = $1 ORDER BY created_at DESC',
      [parent.id],
    );

    return result.rows.map((row) => ({
      id: row.id,
      claimId: row.claim_id,
      transforms: row.transforms,
      sources: row.sources,
      lineage: row.lineage,
      createdAt: row.created_at,
    }));
  },

  async license(parent: any) {
    if (!parent.licenseId) return null;

    const result = await pool.query(
      'SELECT * FROM licenses WHERE id = $1',
      [parent.licenseId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      claimId: row.claim_id,
      licenseType: row.license_type,
      licenseText: row.license_text,
      terms: row.terms,
      restrictions: row.restrictions,
      attributionRequired: row.attribution_required,
      commercialUseAllowed: row.commercial_use_allowed,
      createdAt: row.created_at,
    };
  },
};

const Evidence = {
  async license(parent: any) {
    if (!parent.licenseId) return null;

    const result = await pool.query(
      'SELECT * FROM licenses WHERE id = $1',
      [parent.licenseId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      claimId: row.claim_id,
      licenseType: row.license_type,
      licenseText: row.license_text,
      terms: row.terms,
      restrictions: row.restrictions,
      attributionRequired: row.attribution_required,
      commercialUseAllowed: row.commercial_use_allowed,
      createdAt: row.created_at,
    };
  },

  async case(parent: any) {
    if (!parent.caseId) return null;

    const result = await pool.query(
      'SELECT * FROM cases WHERE id = $1',
      [parent.caseId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata,
    };
  },
};

const ProvenanceChain = {
  async claim(parent: any) {
    const result = await pool.query(
      'SELECT * FROM claims WHERE id = $1',
      [parent.claimId],
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      content: row.content,
      hash: row.hash,
      signature: row.signature,
      metadata: row.metadata,
      sourceRef: row.source_ref,
      licenseId: row.license_id,
      policyLabels: row.policy_labels || [],
      createdAt: row.created_at,
    };
  },
};

const Case = {
  async evidence(parent: any) {
    const result = await pool.query(
      `SELECT e.* FROM evidence e
       INNER JOIN case_evidence ce ON e.id = ce.evidence_id
       WHERE ce.case_id = $1
       ORDER BY e.created_at ASC`,
      [parent.id],
    );

    return result.rows.map((row) => ({
      id: row.id,
      caseId: row.case_id,
      sourceRef: row.source_ref,
      checksum: row.checksum,
      checksumAlgorithm: row.checksum_algorithm,
      contentType: row.content_type,
      fileSize: row.file_size,
      transformChain: row.transform_chain,
      licenseId: row.license_id,
      policyLabels: row.policy_labels || [],
      authorityId: row.authority_id,
      createdAt: row.created_at,
      metadata: row.metadata,
    }));
  },

  async disclosureBundle(parent: any) {
    // Reuse the query logic
    return Query.disclosureBundle(null, { caseId: parent.id }, null);
  },
};

// ============================================================================
// Export Resolvers
// ============================================================================

export const resolvers = {
  DateTime: DateTimeScalar,
  JSON: JSONScalar,
  Query,
  Mutation,
  Claim,
  Evidence,
  ProvenanceChain,
  Case,
};
