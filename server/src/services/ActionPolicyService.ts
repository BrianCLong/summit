// @ts-nocheck
import axios, { AxiosInstance } from 'axios';
import { createHash, randomUUID } from 'crypto';
import type {
  Obligation,
  PolicyDecision,
  PreflightRequest,
} from '../../../packages/policy-audit/src/types';
import { getPostgresPool } from '../db/postgres.js';
import { logger } from '../config/logger.js';
import { policyBundleStore } from '../policy/bundleStore.js';

interface PreflightMeta {
  correlationId?: string;
  ip?: string;
  userAgent?: string;
}

interface StoredDecision {
  decision: PolicyDecision;
  requestHash: string;
  policyName: string;
}

interface PreflightResult {
  preflightId: string;
  requestHash: string;
  decision: PolicyDecision;
}

type OpaDecision = PolicyDecision & {
  policy_version?: string;
  decision_id?: string;
  expires_at?: string;
  ttl_seconds?: number;
};

/**
 * Deterministically sort an object so that hashing is stable.
 */
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

function resolvePolicyVersion(request: PreflightRequest): string | undefined {
  const pinned =
    (request as any).policyVersion ||
    request.context?.policyVersion ||
    request.context?.pinnedPolicyVersion;
  if (pinned) return pinned;

  try {
    const resolved = policyBundleStore.resolve();
    return resolved.versionId;
  } catch (error: any) {
    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      'Falling back to request-supplied policy version',
    );
    return request.context?.policyVersion;
  }
}

export function calculateRequestHash(request: PreflightRequest): string {
  const canonical = normalize({
    action: request.action,
    actor: request.actor,
    resource: request.resource,
    payload: request.payload,
    approvers: request.approvers || [],
    policyVersion: request.context?.policyVersion || request.context?.pinnedPolicyVersion,
  });

  return createHash('sha256')
    .update(JSON.stringify(canonical))
    .digest('hex');
}

class PolicyDecisionStore {
  async saveDecision(
    preflightId: string,
    requestHash: string,
    decision: PolicyDecision,
    request: PreflightRequest,
    meta: PreflightMeta,
    timingMs: number,
  ): Promise<void> {
    const pool = getPostgresPool();
    const reasonPayload = {
      reason: decision.reason,
      requestHash,
      obligations: decision.obligations || [],
      expiresAt: decision.expiresAt,
      correlationId: meta.correlationId,
      action: request.action,
    };

    await pool.query(
      `INSERT INTO policy_decisions_log (
          decision_id,
          policy_name,
          decision,
          reason,
          user_id,
          resource_type,
          resource_id,
          action,
          appeal_available,
          ip_address,
          user_agent,
          tenant_id,
          evaluation_time_ms,
          cache_hit
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        preflightId,
        decision.policyVersion || 'actions',
        decision.allow ? 'ALLOW' : 'DENY',
        JSON.stringify(reasonPayload),
        request.actor?.id || null,
        request.resource?.type || null,
        requestHash,
        request.action,
        (decision.obligations || []).some(
          (obligation) => obligation.code === 'APPEAL_WINDOW',
        ),
        meta.ip || null,
        meta.userAgent || null,
        request.actor?.tenantId || null,
        timingMs,
        false,
      ],
    );
  }

  async getDecision(preflightId: string): Promise<StoredDecision | null> {
    const pool = getPostgresPool();
    const result = await pool.query(
      `SELECT decision_id, policy_name, decision, reason, resource_id
       FROM policy_decisions_log
       WHERE decision_id = $1
       LIMIT 1`,
      [preflightId],
    );

    if (!result.rows.length) return null;
    const row = result.rows[0];

    let parsed: {
      reason?: string;
      obligations?: Obligation[];
      expiresAt?: string;
      requestHash?: string;
    } = {};

    try {
      parsed = JSON.parse(row.reason || '{}');
    } catch (error: any) {
      logger.warn(
        {
          error: error instanceof Error ? error.message : String(error),
          preflightId,
        },
        'Failed to parse policy decision metadata; falling back to raw reason',
      );
    }

    const decision: PolicyDecision = {
      allow: row.decision === 'ALLOW',
      reason: parsed.reason || row.reason,
      obligations: parsed.obligations || [],
      decisionId: row.decision_id,
      policyVersion: row.policy_name,
      expiresAt: parsed.expiresAt,
    };

    return {
      decision,
      requestHash: parsed.requestHash || row.resource_id,
      policyName: row.policy_name,
    };
  }
}

export class ActionPolicyService {
  private readonly opaUrl: string;
  private readonly store: PolicyDecisionStore;
  private readonly http: AxiosInstance;
  private readonly defaultTtlSeconds = 900; // 15 minutes

  constructor(options?: { opaUrl?: string; store?: PolicyDecisionStore }) {
    this.opaUrl = options?.opaUrl || process.env.OPA_URL || 'http://localhost:8181';
    this.store = options?.store || new PolicyDecisionStore();
    this.http = axios.create({
      timeout: Number(process.env.OPA_TIMEOUT_MS || 5000),
    });
  }

  async preflight(
    request: PreflightRequest,
    meta: PreflightMeta = {},
  ): Promise<PreflightResult> {
    const actor = request.actor || { id: 'anonymous' };
    const normalized: PreflightRequest = {
      ...request,
      actor: {
        id: actor.id,
        role: actor.role,
        tenantId: actor.tenantId,
      },
    };

    if (!normalized.context) normalized.context = {} as any;
    if ((normalized as any).policyVersion && !normalized.context?.policyVersion) {
      normalized.context = {
        ...normalized.context,
        policyVersion: (normalized as any).policyVersion,
      };
    }

    const requestedPolicyVersion =
      (normalized as any).policyVersion ||
      normalized.context?.policyVersion ||
      normalized.context?.pinnedPolicyVersion;
    const policyVersion = requestedPolicyVersion || resolvePolicyVersion(normalized);

    if (policyVersion) {
      normalized.context = {
        ...(normalized.context || {}),
        policyVersion,
      };
    }

    const requestHash = calculateRequestHash(normalized);
    const started = Date.now();
    const opaDecision = await this.evaluateWithOpa(
      normalized,
      requestHash,
      meta,
      policyVersion,
    );

    const decision: PolicyDecision = {
      allow: opaDecision.allow,
      reason: opaDecision.reason || (opaDecision.allow ? 'allow' : 'deny'),
      obligations: opaDecision.obligations || [],
      policyVersion:
        opaDecision.policy_version || opaDecision.policyVersion || policyVersion,
      decisionId: opaDecision.decision_id || randomUUID(),
      expiresAt:
        opaDecision.expires_at ||
        (opaDecision.ttl_seconds
          ? new Date(Date.now() + opaDecision.ttl_seconds * 1000).toISOString()
          : new Date(
              Date.now() + this.defaultTtlSeconds * 1000,
            ).toISOString()),
    };

    await this.store.saveDecision(
      decision.decisionId!,
      requestHash,
      decision,
      normalized,
      meta,
      Date.now() - started,
    );

    return {
      preflightId: decision.decisionId!,
      requestHash,
      decision,
    };
  }

  async validateExecution(
    preflightId: string,
    request: PreflightRequest,
  ): Promise<
    | { status: 'missing' }
    | { status: 'expired'; expiresAt?: string }
    | { status: 'hash_mismatch'; expected: string; actual: string }
    | { status: 'blocked'; reason?: string; obligation?: Obligation }
    | { status: 'ok'; decision: PolicyDecision; requestHash: string }
  > {
    const record = await this.store.getDecision(preflightId);
    if (!record) return { status: 'missing' };

    const requestHash = calculateRequestHash(request);
    if (record.requestHash !== requestHash) {
      return {
        status: 'hash_mismatch',
        expected: record.requestHash,
        actual: requestHash,
      };
    }

    if (record.decision.expiresAt) {
      const expires = new Date(record.decision.expiresAt);
      if (Date.now() > expires.getTime()) {
        return { status: 'expired', expiresAt: record.decision.expiresAt };
      }
    }

    const unsatisfied = (record.decision.obligations || []).find(
      (obligation) => obligation.satisfied === false,
    );

    if (!record.decision.allow || unsatisfied) {
      return {
        status: 'blocked',
        reason: record.decision.reason,
        obligation: unsatisfied,
      };
    }

    return { status: 'ok', decision: record.decision, requestHash };
  }

  private async evaluateWithOpa(
    request: PreflightRequest,
    requestHash: string,
    meta: PreflightMeta,
    policyVersion?: string,
  ): Promise<OpaDecision> {
    try {
      const response = await this.http.post(
        `${this.opaUrl}/v1/data/actions/decision`,
        {
          input: {
            action: request.action,
            actor: request.actor,
            resource: request.resource,
            payload: request.payload,
            context: {
              approvers: request.approvers || [],
              correlationId: meta.correlationId,
              requestHash,
              policyVersion: policyVersion || request.context?.policyVersion,
            },
          },
        },
      );

      return response.data?.result || { allow: false, obligations: [] };
    } catch (error: any) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          action: request.action,
        },
        'OPA evaluation failed for action preflight',
      );

      return {
        allow: false,
        reason: 'opa_evaluation_failed',
        obligations: [],
      };
    }
  }
}
