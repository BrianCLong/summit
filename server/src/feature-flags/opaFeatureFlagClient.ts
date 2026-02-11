import { context as otContext, propagation, trace } from '@opentelemetry/api';
import { randomUUID, createHash } from 'crypto';
import { logger } from '../config/logger.js';
import { OPAClient } from '../services/opa-client.js';
import {
  featureFlagDecisions,
  featureFlagLatency,
  killSwitchGauge,
  ensureMetricsRegistered,
} from './metrics.js';
import {
  FeatureFlagContext,
  FeatureFlagDecision,
  FeatureFlagEvaluationResult,
  KillSwitchDecision,
  KillSwitchResult,
} from './types.js';

const DEFAULT_SOURCE = 'runtime-sdk';

export class OPAFeatureFlagClient {
  constructor(
    private readonly opaClient: OPAClient = new OPAClient(),
    private readonly failOpen = process.env.FEATURE_FLAG_FAIL_OPEN !== 'false',
  ) {
    ensureMetricsRegistered();
  }

  async evaluateFlag(
    flag: string,
    context: FeatureFlagContext = {},
  ): Promise<FeatureFlagEvaluationResult> {
    const started = process.hrtime.bigint();
    const evaluationId = randomUUID();
    const input = this.buildInput(flag, context, evaluationId);
    let enabled = this.failOpen;
    let reason = 'fail-open';
    let raw: Record<string, unknown> | null = null;
    let killSwitchActive = false;

    try {
      raw = await this.opaClient.evaluateQuery('feature_flags/decision', input);
      enabled = Boolean(raw?.enabled);
      reason = (raw?.reason as string) || 'opa-decision';
      killSwitchActive = Boolean(raw?.kill_switch_active);
      this.audit('feature_flag_decision', {
        evaluationId,
        flag,
        enabled,
        reason,
        killSwitchActive,
        context: input.context,
        opa: raw,
      });
    } catch (error: any) {
      reason = 'opa-error';
      this.audit('feature_flag_error', {
        evaluationId,
        flag,
        error: error instanceof Error ? error.message : 'Unknown error',
        context: input.context,
      });
    } finally {
      const durationSeconds = Number(process.hrtime.bigint() - started) / 1e9;
      featureFlagLatency
        .labels({
          flag,
          source: input.context.source || DEFAULT_SOURCE,
          outcome: enabled ? 'enabled' : 'disabled',
        })
        .observe(durationSeconds);
      featureFlagDecisions
        .labels({
          flag,
          source: input.context.source || DEFAULT_SOURCE,
          outcome: enabled ? 'enabled' : 'disabled',
        })
        .inc();
    }

    const decision: FeatureFlagDecision = {
      flag,
      enabled,
      reason,
      killSwitchActive,
      audit: raw?.audit,
      evaluationId,
      evaluatedAt: new Date().toISOString(),
      source: input.context.source,
      metadata: raw?.metadata,
    };

    return { decision, raw };
  }

  async isKillSwitchActive(
    module: string,
    context: FeatureFlagContext = {},
  ): Promise<KillSwitchResult> {
    const started = process.hrtime.bigint();
    const evaluationId = randomUUID();
    const input = this.buildInput('kill_switch', { ...context, module }, evaluationId);
    let active = false;
    let reason = 'not-configured';
    let raw: Record<string, unknown> | null = null;

    try {
      raw = await this.opaClient.evaluateQuery('feature_flags/kill_switch', input);
      active = Boolean(raw?.active);
      reason = (raw?.reason as string) || reason;
      killSwitchGauge.labels({ module }).set(active ? 1 : 0);
      this.audit('kill_switch_check', {
        evaluationId,
        module,
        active,
        reason,
        context: input.context,
      });
    } catch (error: any) {
      reason = 'opa-error';
      killSwitchGauge.labels({ module }).set(0);
      this.audit('kill_switch_error', {
        evaluationId,
        module,
        error: error instanceof Error ? error.message : 'Unknown error',
        context: input.context,
      });
    } finally {
      const durationSeconds = Number(process.hrtime.bigint() - started) / 1e9;
      featureFlagLatency
        .labels({ flag: 'kill_switch', source: input.context.source || DEFAULT_SOURCE, outcome: active ? 'enabled' : 'disabled' })
        .observe(durationSeconds);
    }

    const decision: KillSwitchDecision = {
      module,
      active,
      reason,
      audit: raw?.audit,
      evaluationId,
      evaluatedAt: new Date().toISOString(),
    };

    return { decision, raw };
  }

  buildInput(flag: string, context: FeatureFlagContext, evaluationId: string) {
    const activeContext = otContext.active();
    const carrier: Record<string, string> = {};
    propagation.inject(activeContext, carrier);
    const spanContext = trace.getSpan(activeContext)?.spanContext();

    // Sprint 08: Deterministic ramp seed for percentage rollouts
    const tenantId = context.tenantId || 'unknown';
    const rampSeed = createHash('sha256')
      .update(`${tenantId}:${flag}:${context.requestId || evaluationId}`)
      .digest('hex')
      .substring(0, 16);

    return {
      flag,
      evaluation_id: evaluationId,
      ramp_seed: rampSeed,
      context: {
        source: context.source || DEFAULT_SOURCE,
        userId: context.userId,
        tenantId: context.tenantId,
        roles: context.roles || [],
        scopes: context.scopes || [],
        module: context.module,
        ip: context.ip,
        correlationId: context.correlationId,
        requestId: context.requestId,
        traceId: context.traceId || spanContext?.traceId,
        spanId: context.spanId || spanContext?.spanId,
        environment: context.environment || process.env.NODE_ENV || 'development',
        metadata: context.metadata || {},
        baggage: carrier,
      },
    };
  }

  private audit(event: string, payload: Record<string, unknown>) {
    logger.info({ event, ...payload }, 'feature-flags');
  }
}

export const featureFlagClient = new OPAFeatureFlagClient();
