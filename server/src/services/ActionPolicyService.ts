import axios, { AxiosInstance } from 'axios';
import { createHash, randomUUID } from 'crypto';
import type {
  Obligation,
  PolicyDecision,
  PreflightApprover,
  PreflightRequest,
} from '@summit/policy-types';
import { pg } from '../db/pg.js';
import { logger } from '../utils/logger.js';

export class ActionPolicyError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    status = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ActionPolicyError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface StoredDecision extends PolicyDecision {
  preflightId: string;
  requestHash: string;
  expiresAt: Date;
  request: PreflightRequest;
}

interface PreflightOptions {
  correlationId?: string;
  ip?: string;
  userAgent?: string;
}

interface ActionPolicyServiceOptions {
  ttlSeconds?: number;
  opaClient?: AxiosInstance;
  persistDecisions?: boolean;
}

const DEFAULT_TTL_SECONDS = 10 * 60; // 10 minutes

function normalizeObligations(obligations: Obligation[] | undefined): Obligation[] {
  if (!obligations) return [];
  return obligations.filter(
    (obligation): obligation is Obligation =>
      typeof obligation === 'object' &&
      obligation !== null &&
      typeof obligation.type === 'string' &&
      obligation.type.length > 0,
  );
}

function stableStringify(input: unknown): string {
  if (input === null || typeof input !== 'object') {
    return JSON.stringify(input);
  }
  if (Array.isArray(input)) {
    return `[${input.map((item) => stableStringify(item)).join(',')}]`;
  }
  const entries = Object.entries(input as Record<string, unknown>).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  return `{${entries
    .map(([key, value]) => `${JSON.stringify(key)}:${stableStringify(value)}`)
    .join(',')}}`;
}

function sanitizeRequestForHash(request: PreflightRequest): PreflightRequest {
  const { approvers: _approvers, context, ...rest } = request;
  const sanitizedContext = context
    ? Object.fromEntries(
        Object.entries(context).filter(
          ([key]) => key !== 'correlationId' && key !== 'requestHash',
        ),
      )
    : undefined;
  return {
    ...rest,
    ...(sanitizedContext ? { context: sanitizedContext } : {}),
  };
}

function hashRequest(request: PreflightRequest): string {
  const normalized = sanitizeRequestForHash(request);
  return createHash('sha256').update(stableStringify(normalized)).digest('hex');
}

export class ActionPolicyService {
  private readonly decisions = new Map<string, StoredDecision>();
  private readonly ttlSeconds: number;
  private readonly opaClient: AxiosInstance;
  private readonly persistDecisions: boolean;

  constructor(options?: ActionPolicyServiceOptions) {
    this.ttlSeconds = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    this.persistDecisions = options?.persistDecisions ?? true;
    this.opaClient =
      options?.opaClient ||
      axios.create({
        baseURL:
          process.env.OPA_URL ||
          'http://localhost:8181/v1/data/summit/abac/decision',
        timeout: 4000,
      });
  }

  private normalizeDecision(result: any): PolicyDecision {
    if (typeof result === 'boolean') {
      return {
        allow: result,
        reason: result ? 'allow' : 'deny',
        obligations: [],
      };
    }
    if (typeof result === 'object' && result !== null) {
      const allow =
        typeof result.allow === 'boolean'
          ? result.allow
          : result.allow === 'true';
      const reason =
        typeof result.reason === 'string'
          ? result.reason
          : allow
            ? 'allow'
            : 'deny';
      return {
        allow,
        reason,
        obligations: normalizeObligations(result.obligations),
      };
    }
    return { allow: false, reason: 'opa_error', obligations: [] };
  }

  private async evaluateWithOPA(
    request: PreflightRequest,
    correlationId: string,
    contextExtras: Record<string, unknown> = {},
  ): Promise<PolicyDecision> {
    try {
      const response = await this.opaClient.post('', {
        input: {
          ...request,
          context: {
            ...(request.context || {}),
            correlationId,
            ...contextExtras,
          },
        },
      });
      const decision = this.normalizeDecision(response.data?.result);
      return {
        ...decision,
        evaluatedAt: new Date().toISOString(),
        requestHash: hashRequest(request),
        correlationId,
        expiresAt: new Date(
          Date.now() + this.ttlSeconds * 1000,
        ).toISOString(),
      };
    } catch (error) {
      logger.error({ err: error }, 'OPA evaluation failed for preflight');
      return {
        allow: false,
        reason: 'opa_error',
        obligations: [],
      };
    }
  }

  private requiresDualControl(decision: PolicyDecision): boolean {
    return decision.obligations.some(
      (obligation) => obligation.type?.toLowerCase() === 'dual_control',
    );
  }

  private ensureDistinctApprovers(
    approvers: PreflightApprover[] | undefined,
    subjectId: string,
  ): void {
    if (!approvers || approvers.length < 2) {
      throw new ActionPolicyError(
        'Dual-control actions require at least two approvers',
        'dual_control_required',
        400,
      );
    }

    const uniqueApprovers = new Set(
      approvers.map((approver) => approver.id).filter(Boolean),
    );

    if (uniqueApprovers.size < 2) {
      throw new ActionPolicyError(
        'Approvals must come from distinct approvers',
        'approver_overlap',
        409,
      );
    }

    if (uniqueApprovers.has(subjectId)) {
      throw new ActionPolicyError(
        'Initiator cannot self-approve dual-control actions',
        'approver_overlap',
        409,
      );
    }
  }

  private async persistDecision(
    decision: StoredDecision,
    request: PreflightRequest,
    evaluationMs: number,
  ): Promise<void> {
    if (!this.persistDecisions) return;

    try {
      await pg.oneOrNone(
        `
        INSERT INTO policy_decisions_log (
          decision_id,
          policy_name,
          decision,
          reason,
          user_id,
          resource_type,
          resource_id,
          action,
          appeal_available,
          cache_hit,
          evaluation_time_ms,
          tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
        [
          decision.preflightId,
          'actions/preflight',
          decision.allow ? 'ALLOW' : 'DENY',
          decision.reason,
          request.subject?.id || null,
          request.resource?.type || null,
          request.resource?.id || null,
          request.action,
          decision.obligations?.length > 0,
          false,
          evaluationMs,
          request.subject?.tenantId || null,
        ],
        { forceWrite: true },
      );
    } catch (error) {
      logger.warn(
        { err: error, preflightId: decision.preflightId },
        'Failed to persist policy decision; continuing with in-memory record',
      );
    }
  }

  async runPreflight(
    request: PreflightRequest,
    options: PreflightOptions = {},
  ): Promise<StoredDecision> {
    if (!request?.action || !request?.subject?.id) {
      throw new ActionPolicyError(
        'action and subject.id are required',
        'invalid_request',
      );
    }

    const correlationId = options.correlationId || randomUUID();
    const requestHash = hashRequest(request);
    const start = Date.now();
    const decision = await this.evaluateWithOPA(request, correlationId, {
      ip: options.ip,
      userAgent: options.userAgent,
    });

    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);
    const stored: StoredDecision = {
      ...decision,
      preflightId: randomUUID(),
      requestHash,
      expiresAt,
      request: sanitizeRequestForHash(request),
    };

    this.decisions.set(stored.preflightId, stored);
    await this.persistDecision(stored, request, Date.now() - start);

    return stored;
  }

  async assertExecutable(
    preflightId: string,
    request: PreflightRequest,
    approvers?: PreflightApprover[],
  ): Promise<StoredDecision> {
    if (!preflightId) {
      throw new ActionPolicyError('preflight_id is required', 'invalid_request');
    }
    if (!request?.action || !request?.subject?.id) {
      throw new ActionPolicyError(
        'action and subject.id are required',
        'invalid_request',
      );
    }

    const record = this.decisions.get(preflightId);
    if (!record) {
      throw new ActionPolicyError(
        'Unknown or expired preflight_id',
        'preflight_missing',
        404,
      );
    }

    if (record.expiresAt.getTime() < Date.now()) {
      this.decisions.delete(preflightId);
      throw new ActionPolicyError(
        'Preflight decision has expired',
        'preflight_expired',
        410,
      );
    }

    const incomingHash = hashRequest(request);
    if (incomingHash !== record.requestHash) {
      throw new ActionPolicyError(
        'Request does not match preflight decision',
        'request_hash_mismatch',
        409,
      );
    }

    if (!record.allow) {
      throw new ActionPolicyError(
        'Preflight denied execution',
        'preflight_denied',
        403,
      );
    }

    if (this.requiresDualControl(record)) {
      this.ensureDistinctApprovers(approvers, request.subject.id);
    }

    return record;
  }
}

export const actionPolicyService = new ActionPolicyService();
