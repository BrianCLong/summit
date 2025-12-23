// @ts-nocheck
import crypto from 'crypto';
import { query } from './db';

export async function addEvidence(sha256: string, contentType: string) {
  if (!/^[a-fA-F0-9]{64}$/.test(sha256)) {
    throw new Error('invalid_sha');
  }
  if (!contentType || typeof contentType !== 'string') {
    throw new Error('invalid_content_type');
  }
  const { rows } = await query(
    'INSERT INTO evidence(sha256, content_type) VALUES ($1,$2) RETURNING id, sha256, content_type as "contentType", created_at as "createdAt"',
    [sha256, contentType],
  );
  return rows[0];
}

export async function addClaim(evidenceIds: string[], transformChain: string[]) {
  if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) {
    throw new Error('evidence_required');
  }
  if (!Array.isArray(transformChain) || transformChain.length === 0) {
    throw new Error('transform_chain_required');
  }
  const leaf = crypto
    .createHash('sha256')
    .update(evidenceIds.sort().join(':'))
    .digest('hex');
  const root = crypto
    .createHash('sha256')
    .update(`${leaf}:${transformChain.join('|')}`)
    .digest('hex');
  const { rows } = await query(
    'INSERT INTO claim(transform_chain, hash_root, evidence_ids) VALUES ($1,$2,$3) RETURNING id, hash_root as "hashRoot"',
    [transformChain, root, evidenceIds],
  );
  return { id: rows[0].id, hashRoot: rows[0].hashRoot, transformChain };
}

export async function exportManifest(caseId: string) {
  const { rows: claims } = await query(
    'SELECT * FROM claim ORDER BY created_at DESC LIMIT 50',
  );
  const manifest = {
    caseId,
    version: 1,
    issuedAt: new Date().toISOString(),
    claims: claims.map((c) => ({ id: c.id, hashRoot: c.hash_root, chain: c.transform_chain })),
    signature: { alg: 'none', kid: 'dev', sig: '' },
  };
  return Buffer.from(JSON.stringify(manifest)).toString('base64');
}
