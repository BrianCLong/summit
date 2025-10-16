import { randomUUID, createHash, createHmac } from 'crypto';
import { promises as fs } from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import os from 'os';
import path from 'path';
import { finished } from 'stream/promises';
import { z } from 'zod';
import { getPostgresPool } from '../db/postgres.js';
import { makeBundle } from './bundle.js';
import { disclosureMetrics } from '../metrics/disclosureMetrics.js';
import { RedactionService } from '../redaction/redact.js';
import fetch from 'node-fetch';

export type ExportArtifact =
  | 'audit-trail'
  | 'sbom'
  | 'attestations'
  | 'policy-reports';

export interface DisclosureExportRequest {
  tenantId: string;
  startTime: Date;
  endTime: Date;
  artifacts: ExportArtifact[];
  callbackUrl?: string;
}

export type DisclosureExportStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

export interface DisclosureExportJob {
  id: string;
  tenantId: string;
  status: DisclosureExportStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  warnings: string[];
  artifactStats: Record<string, number>;
  downloadUrl?: string;
  sha256?: string;
  error?: string;
  claimSet?: any;
}

interface InternalJob extends DisclosureExportJob {
  request: DisclosureExportRequest;
  workingDir: string;
  bundlePath?: string;
  attestations: any[];
  artifactDigests: Record<string, string>;
}

const MAX_WINDOW_DAYS = 31;
const MAX_EVENTS = 10_000;
const JOB_TTL_DAYS = 7;
const DEFAULT_ARTIFACTS: ExportArtifact[] = [
  'audit-trail',
  'sbom',
  'attestations',
  'policy-reports',
];

const requestSchema = z.object({
  tenantId: z.string().min(1),
  startTime: z.string().transform((value) => new Date(value)),
  endTime: z.string().transform((value) => new Date(value)),
  artifacts: z
    .array(z.enum(['audit-trail', 'sbom', 'attestations', 'policy-reports']))
    .optional(),
  callbackUrl: z.string().url().optional(),
});

function ensureDir(dir: string): Promise<void> {
  return fs.mkdir(dir, { recursive: true });
}

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  stream.on('data', (chunk) => hash.update(chunk));
  await finished(stream);
  return hash.digest('hex');
}

function merkleFromHashes(hashes: string[]): string {
  if (hashes.length === 0) return '';
  let layer = hashes.slice().sort();
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] ?? layer[i];
      const hash = createHash('sha256')
        .update(left + right)
        .digest('hex');
      next.push(hash);
    }
    layer = next;
  }
  return layer[0];
}

export class DisclosureExportService {
  private readonly jobs = new Map<string, InternalJob>();
  private readonly redaction = new RedactionService();

  async createJob(input: unknown): Promise<DisclosureExportJob> {
    const parsed = requestSchema.parse(input);

    if (
      Number.isNaN(parsed.startTime.getTime()) ||
      Number.isNaN(parsed.endTime.getTime())
    ) {
      throw new Error('invalid_time_range');
    }

    if (parsed.endTime <= parsed.startTime) {
      throw new Error('end_before_start');
    }

    const diffDays =
      (parsed.endTime.getTime() - parsed.startTime.getTime()) /
      (1000 * 60 * 60 * 24);
    if (diffDays > MAX_WINDOW_DAYS) {
      throw new Error('window_too_large');
    }

    const jobId = randomUUID();
    const nowIso = new Date().toISOString();
    const workingDir = path.join(os.tmpdir(), 'disclosures', jobId);
    await ensureDir(workingDir);

    const job: InternalJob = {
      id: jobId,
      tenantId: parsed.tenantId,
      status: 'pending',
      createdAt: nowIso,
      warnings: [],
      artifactStats: {},
      request: {
        tenantId: parsed.tenantId,
        startTime: parsed.startTime,
        endTime: parsed.endTime,
        artifacts: parsed.artifacts?.length
          ? parsed.artifacts
          : DEFAULT_ARTIFACTS,
        callbackUrl: parsed.callbackUrl,
      },
      workingDir,
      expiresAt: new Date(
        Date.now() + JOB_TTL_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString(),
      attestations: [],
      artifactDigests: {},
    };

    this.jobs.set(jobId, job);

    setImmediate(() => {
      this.processJob(jobId).catch((error) => {
        console.error('Disclosure export failed', error);
      });
    });

    return this.publicJob(job);
  }

  listJobsForTenant(tenantId: string): DisclosureExportJob[] {
    return Array.from(this.jobs.values())
      .filter((job) => job.tenantId === tenantId)
      .map((job) => this.publicJob(job));
  }

  getJob(jobId: string): DisclosureExportJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    return this.publicJob(job);
  }

  getDownload(
    jobId: string,
  ): { job: DisclosureExportJob; filePath: string } | undefined {
    const job = this.jobs.get(jobId);
    if (!job || !job.bundlePath) return undefined;
    return { job: this.publicJob(job), filePath: job.bundlePath };
  }

  async processJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'running';
    job.startedAt = new Date().toISOString();
    disclosureMetrics.exportStarted(job.tenantId);

    const startedAt = Date.now();
    const artifacts: { name: string; path: string; sha256?: string }[] = [];
    const artifactHashes: string[] = [];
    const warnings: string[] = [];

    try {
      const pool = getPostgresPool();
      const {
        tenantId,
        startTime,
        endTime,
        artifacts: requestedArtifacts,
        callbackUrl,
      } = job.request;

      if (requestedArtifacts.includes('audit-trail')) {
        const result = await this.collectAuditTrail({
          job,
          pool,
          startTime,
          endTime,
        });
        artifacts.push({
          name: 'audit-trail.json',
          path: result.filePath,
          sha256: result.hash,
        });
        artifactHashes.push(result.hash);
        job.artifactDigests['audit-trail.json'] = result.hash;
        job.artifactStats['audit-trail'] = result.count;
        warnings.push(...result.warnings.map((w) => `audit:${w}`));
      }

      if (requestedArtifacts.includes('sbom')) {
        const result = await this.collectSbomReports({
          job,
          pool,
          startTime,
          endTime,
        });
        if (result) {
          artifacts.push({
            name: 'sbom-reports.json',
            path: result.filePath,
            sha256: result.hash,
          });
          artifactHashes.push(result.hash);
          job.artifactDigests['sbom-reports.json'] = result.hash;
          job.artifactStats['sbom'] = result.count;
          warnings.push(...result.warnings.map((w) => `sbom:${w}`));
        }
      }

      if (requestedArtifacts.includes('policy-reports')) {
        const result = await this.collectPolicyReports({
          job,
          pool,
          startTime,
          endTime,
        });
        if (result) {
          artifacts.push({
            name: 'policy-reports.json',
            path: result.filePath,
            sha256: result.hash,
          });
          artifactHashes.push(result.hash);
          job.artifactDigests['policy-reports.json'] = result.hash;
          job.artifactStats['policy-reports'] = result.count;
          warnings.push(...result.warnings.map((w) => `policy:${w}`));
        }
      }

      if (requestedArtifacts.includes('attestations')) {
        const result = await this.collectAttestations({
          job,
          pool,
          startTime,
          endTime,
        });
        if (result) {
          artifacts.push({
            name: 'attestations.json',
            path: result.filePath,
            sha256: result.hash,
          });
          artifactHashes.push(result.hash);
          job.artifactDigests['attestations.json'] = result.hash;
          job.artifactStats['attestations'] = result.count;
          warnings.push(...result.warnings.map((w) => `attestation:${w}`));
          job.attestations = result.attestations;
        }
      }

      const claimSet = this.buildClaimSet(job, artifactHashes, warnings);
      job.claimSet = claimSet;

      const merkleRoot = merkleFromHashes(artifactHashes);
      const { path: bundlePath, sha256 } = await makeBundle({
        artifacts,
        claimSet,
        merkleRoot,
        attestations: job.attestations,
      });

      job.bundlePath = bundlePath;
      job.sha256 = sha256;
      job.downloadUrl = `/disclosures/export/${job.id}/download`;
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.warnings = warnings;

      const stats = await fs.stat(bundlePath);
      disclosureMetrics.exportCompleted(
        job.tenantId,
        Date.now() - startedAt,
        stats.size,
        warnings,
      );

      if (callbackUrl) {
        await this.notifyWebhook(callbackUrl, job).catch((error) => {
          warnings.push('webhook_failed');
          console.error('Disclosure webhook failed', error);
        });
      }
    } catch (error: any) {
      job.status = 'failed';
      job.error = error?.message || 'export_failed';
      job.completedAt = new Date().toISOString();
      job.warnings = warnings;
      disclosureMetrics.exportFailed(job.tenantId);
    }
  }

  private buildClaimSet(
    job: InternalJob,
    artifactHashes: string[],
    warnings: string[],
  ) {
    const signature = this.signClaimSet({
      jobId: job.id,
      tenantId: job.tenantId,
      window: {
        start: job.request.startTime.toISOString(),
        end: job.request.endTime.toISOString(),
      },
      artifacts: artifactHashes,
      warnings,
      createdAt: new Date().toISOString(),
    });

    return {
      id: `claimset-${job.id}`,
      tenantId: job.tenantId,
      window: {
        start: job.request.startTime.toISOString(),
        end: job.request.endTime.toISOString(),
      },
      artifacts: artifactHashes,
      warnings,
      signature,
    };
  }

  private signClaimSet(payload: Record<string, unknown>) {
    const secret =
      process.env.DISCLOSURE_SIGNING_SECRET || 'dev-disclosure-secret';
    const keyId = process.env.DISCLOSURE_SIGNING_KEY_ID || 'local-dev';
    const bytes = Buffer.from(JSON.stringify(payload));
    const digest = createHash('sha256').update(bytes).digest('hex');
    const mac = createHmac('sha256', secret).update(bytes).digest('hex');
    return { keyId, digest, signature: mac, algorithm: 'HMAC-SHA256' };
  }

  private async notifyWebhook(callbackUrl: string, job: InternalJob) {
    const payload = {
      jobId: job.id,
      status: job.status,
      sha256: job.sha256,
      downloadUrl: job.downloadUrl,
      warnings: job.warnings,
      tenantId: job.tenantId,
      completedAt: job.completedAt,
    };
    await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  private async collectAuditTrail({
    job,
    pool,
    startTime,
    endTime,
  }: {
    job: InternalJob;
    pool: any;
    startTime: Date;
    endTime: Date;
  }) {
    const { rows } = await pool.query(
      `SELECT * FROM audit_events
       WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
       ORDER BY created_at ASC
       LIMIT $4`,
      [
        job.tenantId,
        startTime.toISOString(),
        endTime.toISOString(),
        MAX_EVENTS + 1,
      ],
    );

    const truncated = rows.length > MAX_EVENTS;
    const selected = truncated ? rows.slice(0, MAX_EVENTS) : rows;
    const sanitized: any[] = [];
    for (const row of selected) {
      const clean = await this.redaction.redactObject(
        row,
        {
          rules: ['pii', 'sensitive', 'financial'],
        },
        job.tenantId,
        { jobId: job.id },
      );
      sanitized.push(clean);
    }

    const filePath = path.join(job.workingDir, 'audit-trail.json');
    await this.writeJsonObject(filePath, {
      tenantId: job.tenantId,
      window: { start: startTime.toISOString(), end: endTime.toISOString() },
      count: sanitized.length,
      events: sanitized,
    });

    const hash = await hashFile(filePath);
    const warnings = truncated ? ['truncated'] : [];

    return { filePath, count: sanitized.length, hash, warnings };
  }

  private async collectSbomReports({
    job,
    pool,
    startTime,
    endTime,
  }: {
    job: InternalJob;
    pool: any;
    startTime: Date;
    endTime: Date;
  }) {
    const { rows } = await pool.query(
      `SELECT sr.sbom, sr.created_at
         FROM sbom_reports sr
         JOIN run r ON r.id = sr.run_id
        WHERE r.tenant_id = $1
          AND sr.created_at BETWEEN $2 AND $3
        ORDER BY sr.created_at ASC
        LIMIT 5000`,
      [job.tenantId, startTime.toISOString(), endTime.toISOString()],
    );

    if (!rows.length) {
      return null;
    }

    const normalized = rows.map((row: any) => ({
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : row.created_at,
      sbom: row.sbom,
    }));

    const filePath = path.join(job.workingDir, 'sbom-reports.json');
    await this.writeJsonObject(filePath, {
      tenantId: job.tenantId,
      reports: normalized,
    });

    const hash = await hashFile(filePath);
    return {
      filePath,
      count: normalized.length,
      hash,
      warnings: [] as string[],
    };
  }

  private async collectPolicyReports({
    job,
    pool,
    startTime,
    endTime,
  }: {
    job: InternalJob;
    pool: any;
    startTime: Date;
    endTime: Date;
  }) {
    const { rows } = await pool.query(
      `SELECT policy, decision, created_at, user_id
         FROM policy_audit
        WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
        ORDER BY created_at ASC
        LIMIT 5000`,
      [job.tenantId, startTime.toISOString(), endTime.toISOString()],
    );

    if (!rows.length) {
      return null;
    }

    const sanitized: any[] = [];
    for (const row of rows) {
      const clean = await this.redaction.redactObject(
        row,
        {
          rules: ['pii', 'sensitive'],
        },
        job.tenantId,
        { jobId: job.id, artifact: 'policy' },
      );
      sanitized.push(clean);
    }

    const filePath = path.join(job.workingDir, 'policy-reports.json');
    await this.writeJsonObject(filePath, {
      tenantId: job.tenantId,
      entries: sanitized,
    });

    const hash = await hashFile(filePath);
    return {
      filePath,
      count: sanitized.length,
      hash,
      warnings: [] as string[],
    };
  }

  private async collectAttestations({
    job,
    pool,
    startTime,
    endTime,
  }: {
    job: InternalJob;
    pool: any;
    startTime: Date;
    endTime: Date;
  }) {
    const { rows } = await pool.query(
      `SELECT attestation, created_at
         FROM slsa_attestations
        WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
        ORDER BY created_at ASC
        LIMIT 2000`,
      [job.tenantId, startTime.toISOString(), endTime.toISOString()],
    );

    if (!rows.length) {
      return null;
    }

    const attestations = rows.map((row: any) => ({
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : row.created_at,
      attestation: row.attestation,
    }));

    const filePath = path.join(job.workingDir, 'attestations.json');
    await this.writeJsonObject(filePath, {
      tenantId: job.tenantId,
      attestations,
    });

    const hash = await hashFile(filePath);

    const mismatchedDigests = this.verifyAttestationSubjects(attestations, job);
    const warnings = mismatchedDigests.length
      ? mismatchedDigests.map((id) => `subject_digest_mismatch:${id}`)
      : [];

    return {
      filePath,
      count: attestations.length,
      hash,
      warnings,
      attestations: attestations.map((row) => row.attestation),
    };
  }

  private verifyAttestationSubjects(
    attestations: any[],
    job: InternalJob,
  ): string[] {
    const mismatches: string[] = [];
    const artifactHashes = new Set(Object.values(job.artifactDigests));
    for (const entry of attestations) {
      const attestation = entry.attestation;
      const subjects = attestation?.subject || [];
      for (const subject of subjects) {
        const digest = subject?.digest?.sha256;
        if (!digest) continue;
        if (!artifactHashes.has(digest)) {
          mismatches.push(subject?.name || 'unknown');
        }
      }
    }
    return mismatches;
  }

  private async writeJsonObject(
    filePath: string,
    obj: Record<string, unknown>,
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(filePath, { encoding: 'utf8' });
      stream.on('error', reject);
      stream.on('finish', () => resolve());
      stream.write(JSON.stringify(obj, null, 2));
      stream.end();
    });
  }

  private publicJob(job: InternalJob): DisclosureExportJob {
    return {
      id: job.id,
      tenantId: job.tenantId,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      expiresAt: job.expiresAt,
      warnings: job.warnings,
      artifactStats: job.artifactStats,
      downloadUrl: job.downloadUrl,
      sha256: job.sha256,
      error: job.error,
      claimSet: job.claimSet,
    };
  }
}

export const disclosureExportService = new DisclosureExportService();
