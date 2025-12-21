import pino from 'pino';
import { RateLimitResult, rateLimiter } from '../services/RateLimiter.js';
import {
  TenantContext,
  TenantPolicyDecision,
  TenantPolicyInput,
  TenantPrivilegeTier,
} from './types.js';
import { tenantKillSwitch, TenantKillSwitch } from './killSwitch.js';

const logger = (pino as any)({ name: 'tenant-isolation-guard' });

export interface TenantIsolationConfig {
  defaultWindowMs: number;
  rateLimits: {
    api: number;
    ingestion: number;
    rag: number;
    llm: number;
  };
  llmSoftCeiling: number;
}

export interface RateLimiterLike {
  checkLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

const DEFAULT_CONFIG: TenantIsolationConfig = {
  defaultWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  rateLimits: {
    api: 120,
    ingestion: 45,
    rag: 60,
    llm: Number(process.env.AI_RATE_LIMIT_MAX_REQUESTS || 50),
  },
  llmSoftCeiling: Math.max(
    10,
    Math.floor(Number(process.env.AI_RATE_LIMIT_MAX_REQUESTS || 50) / 2),
  ),
};

export class TenantIsolationGuard {
  constructor(
    private limiter: RateLimiterLike = rateLimiter,
    private killSwitch: TenantKillSwitch = tenantKillSwitch,
    private config: TenantIsolationConfig = DEFAULT_CONFIG,
  ) {}

  assertTenantContext(context: TenantContext): void {
    if (!context?.tenantId) {
      throw new Error('Tenant context missing tenantId');
    }
    if (!context.environment) {
      throw new Error('Tenant context missing environment');
    }
    if (!context.privilegeTier) {
      throw new Error('Tenant context missing privilegeTier');
    }
  }

  evaluatePolicy(
    context: TenantContext,
    input: TenantPolicyInput,
  ): TenantPolicyDecision {
    this.assertTenantContext(context);

    if (context.environment === 'prod' && !this.killSwitch.hasConfig()) {
      return {
        allowed: false,
        status: 500,
        reason: 'Kill-switch configuration missing',
      };
    }

    if (this.killSwitch.isDisabled(context.tenantId)) {
      return {
        allowed: false,
        status: 423,
        reason: 'Tenant kill switch active',
      };
    }

    if (
      input.resourceTenantId &&
      input.resourceTenantId !== context.tenantId
    ) {
      return {
        allowed: false,
        status: 403,
        reason: 'Cross-tenant access denied',
      };
    }

    if (input.environment && input.environment !== context.environment) {
      return {
        allowed: false,
        status: 400,
        reason: 'Tenant environment mismatch',
      };
    }

    return { allowed: true };
  }

  async enforceRateLimit(
    context: TenantContext,
    bucket: keyof TenantIsolationConfig['rateLimits'],
  ): Promise<RateLimitResult & { bucket: string }> {
    this.assertTenantContext(context);

    const limit =
      this.config.rateLimits[bucket] ?? this.config.rateLimits.api;
    const key = `tenant:${context.tenantId}:${bucket}:${context.environment}:${context.privilegeTier}`;
    const result = await this.limiter.checkLimit(
      key,
      limit,
      this.config.defaultWindowMs,
    );

    if (!result.allowed) {
      logger.warn(
        {
          tenantId: context.tenantId,
          bucket,
          environment: context.environment,
          privilegeTier: context.privilegeTier,
        },
        'Tenant rate limit exceeded',
      );
    }

    return { ...result, bucket };
  }

  async enforceIngestionCap(
    context: TenantContext,
  ): Promise<TenantPolicyDecision & { limit: number; reset: number }> {
    const rateResult = await this.enforceRateLimit(context, 'ingestion');
    return {
      allowed: rateResult.allowed,
      status: rateResult.allowed ? 200 : 429,
      reason: rateResult.allowed ? undefined : 'Tenant ingestion cap reached',
      warning: rateResult.remaining < 5
        ? 'Approaching ingestion cap'
        : undefined,
      limit: rateResult.total,
      reset: rateResult.reset,
    };
  }

  async enforceLlmCeiling(
    context: TenantContext,
  ): Promise<TenantPolicyDecision & { limit: number; reset: number }> {
    const rateResult = await this.enforceRateLimit(context, 'llm');
    const softBlocked = !rateResult.allowed;
    const warning =
      rateResult.remaining <= this.config.llmSoftCeiling
        ? 'LLM budget nearly exhausted'
        : undefined;

    return {
      allowed: !softBlocked,
      status: softBlocked ? 429 : 200,
      reason: softBlocked ? 'LLM ceiling reached' : undefined,
      warning,
      limit: rateResult.total,
      reset: rateResult.reset,
    };
  }

  isPrivileged(context: TenantContext): boolean {
    return (
      context.privilegeTier === 'break-glass' ||
      context.privilegeTier === 'elevated'
    );
  }

  hardenPrivilege(context: TenantContext): TenantContext {
    const downgrade: Record<TenantPrivilegeTier, TenantPrivilegeTier> = {
      'break-glass': 'elevated',
      elevated: 'elevated',
      standard: 'standard',
    };
    return {
      ...context,
      privilegeTier: downgrade[context.privilegeTier],
    };
  }
}

export const tenantIsolationGuard = new TenantIsolationGuard();
