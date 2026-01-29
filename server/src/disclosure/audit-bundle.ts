import { mkdtemp, writeFile, mkdir, copyFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { createHash } from 'crypto';
import { getPostgresPool } from '../db/postgres.js';
import { RedactionService } from '../redaction/redact.js';
import { makeBundle } from './bundle.js';

type BundleFormat = 'tar' | 'zip';

interface AuditBundleOptions {
  tenantId: string;
  startTime: Date;
  endTime: Date;
  format?: BundleFormat;
  outputPath?: string;
  limit?: number;
}

interface BundleArtifact {
  name: string;
  path: string;
  sha256?: string;
}

interface BundleResult {
  bundlePath: string;
  sha256: string;
  checksums: Record<string, string>;
  claimSet: Record<string, unknown>;
  merkleRoot: string;
  format: BundleFormat;
}

const DEFAULT_LIMIT = 5000;

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const { createReadStream } = await import('fs');
  return new Promise<string>((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', (chunk: Buffer | string) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function merkleFromHashes(hashes: string[]): string {
  if (hashes.length === 0) return '';
  let layer = hashes.slice().sort();
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] ?? layer[i];
      const digest = createHash('sha256')
        .update(left + right)
        .digest('hex');
      next.push(digest);
    }
    layer = next;
  }
  return layer[0];
}

async function writeJson(
  filePath: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

export async function buildAuditBundle({
  tenantId,
  startTime,
  endTime,
  format = 'tar',
  outputPath,
  limit = DEFAULT_LIMIT,
}: AuditBundleOptions): Promise<BundleResult> {
  const pool = getPostgresPool();
  const redaction = new RedactionService();
  const workdir = await mkdtemp(path.join(os.tmpdir(), 'audit-bundle-'));
  const artifacts: BundleArtifact[] = [];
  const checksums: Record<string, string> = {};

  await mkdir(workdir, { recursive: true });

  const window = {
    start: startTime.toISOString(),
    end: endTime.toISOString(),
  };

  const auditQuery = await pool.query(
    `SELECT * FROM audit_events
     WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
     ORDER BY created_at ASC
     LIMIT $4`,
    [tenantId, window.start, window.end, limit],
  );

  const policyQuery = await pool.query(
    `SELECT * FROM policy_audit
     WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
     ORDER BY created_at ASC
     LIMIT $4`,
    [tenantId, window.start, window.end, limit],
  );

  const sbomQuery = await pool.query(
    `SELECT sr.run_id, sr.sbom, sr.created_at
       FROM sbom_reports sr
       JOIN run r ON r.id = sr.run_id
      WHERE r.tenant_id = $1
        AND sr.created_at BETWEEN $2 AND $3
      ORDER BY sr.created_at ASC
      LIMIT $4`,
    [tenantId, window.start, window.end, limit],
  );

  const provenanceQuery = await pool.query(
    `SELECT id, source_type, source_id, user_id, entity_count, relationship_count, hash_manifest, transform_chain, metadata, created_at
       FROM provenance_records
      WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
      ORDER BY created_at ASC
      LIMIT $4`,
    [tenantId, window.start, window.end, limit],
  );

interface SbomRow {
  run_id: string;
  created_at: Date | string;
  sbom: unknown;
}

  const policy = { rules: ['pii', 'sensitive', 'financial'] as const };

  const auditEvents = await Promise.all(
    auditQuery.rows.map((row: unknown) =>
      redaction.redactObject(row, policy as any, tenantId, {
        purpose: 'audit_bundle',
      }),
    ),
  );
  const policyDecisions = await Promise.all(
    policyQuery.rows.map((row: unknown) =>
      redaction.redactObject(row, policy as any, tenantId, {
        purpose: 'audit_bundle',
      }),
    ),
  );

  const auditPath = path.join(workdir, 'audit-events.json');
  await writeJson(auditPath, {
    tenantId,
    window,
    count: auditEvents.length,
    events: auditEvents,
  });
  checksums['audit-events.json'] = await hashFile(auditPath);
  artifacts.push({ name: 'audit-events.json', path: auditPath });

  const policyPath = path.join(workdir, 'policy-decisions.json');
  await writeJson(policyPath, {
    tenantId,
    window,
    count: policyDecisions.length,
    decisions: policyDecisions,
  });
  checksums['policy-decisions.json'] = await hashFile(policyPath);
  artifacts.push({ name: 'policy-decisions.json', path: policyPath });

  const sbomPath = path.join(workdir, 'sbom-reports.json');
  const sbomReports = sbomQuery.rows.map((row: SbomRow) => ({
    runId: row.run_id,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
    sbom: row.sbom,
  }));
  await writeJson(sbomPath, {
    tenantId,
    window,
    count: sbomReports.length,
    reports: sbomReports,
  });
  checksums['sbom-reports.json'] = await hashFile(sbomPath);
  artifacts.push({ name: 'sbom-reports.json', path: sbomPath });

  const provenancePath = path.join(workdir, 'provenance-records.json');
  await writeJson(provenancePath, {
    tenantId,
    window,
    count: provenanceQuery.rows.length,
    records: provenanceQuery.rows,
  });
  checksums['provenance-records.json'] = await hashFile(provenancePath);
  artifacts.push({ name: 'provenance-records.json', path: provenancePath });

  const merkleRoot = merkleFromHashes(Object.values(checksums));
  const claimSet = {
    id: `audit-bundle-${tenantId}-${Date.now()}`,
    tenantId,
    window,
    counts: {
      auditEvents: auditEvents.length,
      policyDecisions: policyDecisions.length,
      sbomReports: sbomReports.length,
      provenanceRecords: provenanceQuery.rows.length,
    },
    createdAt: new Date().toISOString(),
  };

  const { path: bundlePath, sha256 } = await makeBundle({
    artifacts,
    claimSet,
    merkleRoot,
    attestations: [],
    format,
    checksums,
  });

  const finalPath =
    outputPath && outputPath !== bundlePath
      ? path.resolve(outputPath)
      : bundlePath;

  if (finalPath !== bundlePath) {
    await copyFile(bundlePath, finalPath);
  }

  return {
    bundlePath: finalPath,
    sha256,
    checksums,
    claimSet,
    merkleRoot,
    format,
  };
}
