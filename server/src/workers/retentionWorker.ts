import fs from 'node:fs';
import path from 'node:path';
import { pg } from '../db/pg';
import {
  RetentionPolicy,
  RETENTION_POLICY_AUTHORITY,
  RetentionRule,
} from '../policies/retentionPolicy.js';
import {
  RetentionActionError,
  RetentionJobService,
  RetentionStore,
} from '../services/RetentionJobService.js';

const DEFAULT_POLICY_ID = 'retention-default';
const DEFAULT_POLICY_VERSION = process.env.RETENTION_POLICY_VERSION || '1.0.0';
const DEFAULT_ACTOR_ID = process.env.RETENTION_ACTOR_ID || 'retention-worker';
const DEFAULT_TENANT_ID = process.env.RETENTION_TENANT_ID || 'system';

function readRetentionDays(): { riskDays: number; evidenceDays: number } {
  try {
    const p = path.resolve(
      process.cwd(),
      'contracts/policy-pack/v0/data/retention.json',
    );
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const tiers = raw?.tiers || {};
    const defaults = raw?.defaults || {};
    const standardDays = tiers?.standard?.days ?? 180;
    const longDays = tiers?.long?.days ?? 365;
    return {
      riskDays: Number(process.env.RETENTION_RISK_DAYS || standardDays),
      evidenceDays: Number(process.env.RETENTION_EVIDENCE_DAYS || longDays),
    };
  } catch {
    return {
      riskDays: Number(process.env.RETENTION_RISK_DAYS || 180),
      evidenceDays: Number(process.env.RETENTION_EVIDENCE_DAYS || 365),
    };
  }
}

function buildRetentionPolicy(retention: {
  riskDays: number;
  evidenceDays: number;
}): RetentionPolicy {
  return {
    metadata: {
      id: DEFAULT_POLICY_ID,
      version: DEFAULT_POLICY_VERSION,
      name: 'Default retention policy',
      description:
        'Applies baseline retention actions for risk signals and evidence bundles.',
      authority: RETENTION_POLICY_AUTHORITY,
    },
    scope: {
      tenantId: DEFAULT_TENANT_ID,
    },
    rules: [
      {
        id: 'risk-signals-delete',
        resource: { type: 'risk_signals', table: 'risk_signals' },
        retentionDays: retention.riskDays,
        action: 'DELETE',
        reason: 'Default risk signal retention window.',
      },
      {
        id: 'evidence-bundles-delete',
        resource: { type: 'evidence_bundles', table: 'evidence_bundles' },
        retentionDays: retention.evidenceDays,
        action: 'DELETE',
        reason: 'Default evidence bundle retention window.',
      },
    ],
  };
}

class PostgresRetentionStore implements RetentionStore {
  async deleteExpired(rule: RetentionRule, cutoff: Date) {
    const table = rule.resource.table || rule.resource.type;
    if (table === 'risk_signals') {
      const result = await pg.write(
        `DELETE FROM risk_signals WHERE created_at < $1`,
        [cutoff.toISOString()],
      );
      return result.rowCount || 0;
    }
    if (table === 'evidence_bundles') {
      const result = await pg.write(
        `DELETE FROM evidence_bundles WHERE created_at < $1`,
        [cutoff.toISOString()],
      );
      return result.rowCount || 0;
    }
    throw new RetentionActionError(
      `Unsupported retention resource: ${table}`,
    );
  }

  async archiveExpired() {
    throw new RetentionActionError(
      'Archive retention not implemented for Postgres store',
    );
  }

  async anonymizeExpired() {
    throw new RetentionActionError(
      'Anonymize retention not implemented for Postgres store',
    );
  }
}

export async function runRetentionOnce() {
  const { riskDays, evidenceDays } = readRetentionDays();
  const policy = buildRetentionPolicy({ riskDays, evidenceDays });
  const service = new RetentionJobService(new PostgresRetentionStore());
  await service.runPolicy(policy, {
    actorId: DEFAULT_ACTOR_ID,
    tenantId: DEFAULT_TENANT_ID,
  });
}

let timer: any;
export function startRetentionWorker() {
  if (process.env.ENABLE_RETENTION_WORKER !== 'true') return;
  const intervalMs = Number(
    process.env.RETENTION_WORKER_INTERVAL_MS || 24 * 3600 * 1000,
  );
  const tick = () =>
    runRetentionOnce().catch((e) => console.warn('retention error', e));
  timer = setInterval(tick, intervalMs);
  tick();
}

export function stopRetentionWorker() {
  if (timer) clearInterval(timer);
}
