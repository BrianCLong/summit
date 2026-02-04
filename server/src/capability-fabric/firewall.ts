import Ajv from 'ajv';
import crypto from 'crypto';
import fs from 'node:fs';
import path from 'node:path';
import logger from '../config/logger.js';
import { CapabilityDecision, CapabilitySpec } from './types.js';
import {
  loadCapabilityRegistry,
  resolveCapabilityByHttp,
  resolveCapabilityByMcp,
} from './registry.js';
import { evaluateCapabilityPolicy } from './policy-gate.js';

const ajv = new Ajv({ allErrors: true, strict: false });
const schemaCache = new Map<string, Ajv.ValidateFunction>();
const rateLimitBuckets = new Map<string, number[]>();

function hashPayload(payload: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(payload ?? {}))
    .digest('hex');
}

function filterPayload(
  payload: Record<string, any>,
  allowlist?: string[],
  redactions?: string[],
): { filtered: Record<string, any>; redactionActions: string[] } {
  const redactionActions: string[] = [];
  let filtered: Record<string, any> = { ...payload };

  if (allowlist && allowlist.length > 0) {
    filtered = allowlist.reduce<Record<string, any>>((acc, key) => {
      if (payload[key] !== undefined) {
        acc[key] = payload[key];
      }
      return acc;
    }, {});
    redactionActions.push('allowlist_applied');
  }

  if (redactions && redactions.length > 0) {
    for (const key of redactions) {
      if (filtered[key] !== undefined) {
        delete filtered[key];
        redactionActions.push(`redacted:${key}`);
      }
    }
  }

  return { filtered, redactionActions };
}

function loadSchema(schemaPath: string): Ajv.ValidateFunction {
  const existing = schemaCache.get(schemaPath);
  if (existing) {
    return existing;
  }
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const validate = ajv.compile(schema);
  schemaCache.set(schemaPath, validate);
  return validate;
}

function enforceRateLimit(
  capability: CapabilitySpec,
): { allowed: boolean; remaining: number } {
  const maxPerMinute = capability.risk_controls?.rate_limit?.max_per_minute;
  if (!maxPerMinute) {
    return { allowed: true, remaining: Infinity };
  }

  const now = Date.now();
  const windowMs = 60_000;
  const bucket = rateLimitBuckets.get(capability.capability_id) ?? [];
  const filtered = bucket.filter((timestamp) => now - timestamp < windowMs);
  if (filtered.length >= maxPerMinute) {
    rateLimitBuckets.set(capability.capability_id, filtered);
    return { allowed: false, remaining: 0 };
  }
  filtered.push(now);
  rateLimitBuckets.set(capability.capability_id, filtered);
  return { allowed: true, remaining: Math.max(0, maxPerMinute - filtered.length) };
}

export type CapabilityPreflightResult = {
  capability: CapabilitySpec;
  decision: CapabilityDecision;
  sanitizedArgs: Record<string, any>;
  inputHash: string;
};

export type CapabilityPostflightResult = {
  decision: CapabilityDecision;
  outputHash: string;
  sanitizedResult: Record<string, any>;
};

export class CapabilityFirewall {
  private enforcementEnabled =
    process.env.CAPABILITY_FABRIC_ENFORCEMENT !== 'false';

  async preflightHttpEndpoint(
    method: string,
    pathValue: string,
    body: Record<string, any>,
    actorScopes: string[],
    approvalToken?: string,
    tenantId = 'system',
    userId = 'unknown',
  ): Promise<CapabilityPreflightResult> {
    const registry = loadCapabilityRegistry();
    const capability = resolveCapabilityByHttp(registry, method, pathValue);

    if (!capability) {
      const decision = {
        allowed: false,
        reason: 'capability_unregistered',
      };
      if (this.enforcementEnabled) {
        throw new Error(decision.reason);
      }
      return {
        capability: {
          capability_id: 'unregistered',
          name: 'unregistered',
          description: 'unregistered',
          business_domain: 'unknown',
          owner_team: 'unknown',
          repo: 'unknown',
          service: 'unknown',
          data_classification: 'internal',
          allowed_identities: [],
          operations: [],
        },
        decision,
        sanitizedArgs: body,
        inputHash: hashPayload(body),
      };
    }

    const allowed = capability.allowed_identities?.some((identity) =>
      actorScopes.includes(identity),
    );

    if (!allowed) {
      const decision = {
        allowed: false,
        reason: 'identity_not_allowed',
        capability_id: capability.capability_id,
      };
      if (this.enforcementEnabled) {
        throw new Error(decision.reason);
      }
      return {
        capability,
        decision,
        sanitizedArgs: body,
        inputHash: hashPayload(body),
      };
    }

    const requiresApproval =
      capability.risk_controls?.approvals_required ||
      capability.data_classification === 'restricted';
    if (requiresApproval && !approvalToken) {
      const decision = {
        allowed: false,
        reason: 'approval_required',
        capability_id: capability.capability_id,
        approvals_required: true,
      };
      if (this.enforcementEnabled) {
        throw new Error(decision.reason);
      }
      return {
        capability,
        decision,
        sanitizedArgs: body,
        inputHash: hashPayload(body),
      };
    }

    const { allowed: withinRate, remaining } = enforceRateLimit(capability);
    if (!withinRate) {
      const decision = {
        allowed: false,
        reason: 'rate_limited',
        capability_id: capability.capability_id,
        rate_limit_remaining: remaining,
      };
      if (this.enforcementEnabled) {
        throw new Error(decision.reason);
      }
      return {
        capability,
        decision,
        sanitizedArgs: body,
        inputHash: hashPayload(body),
      };
    }

    const allowlist = capability.risk_controls?.allowlist_fields;
    const redactions = capability.risk_controls?.redaction_fields;
    const { filtered, redactionActions } = filterPayload(
      body,
      allowlist,
      redactions,
    );

    if (capability.schemas?.input_schema_ref) {
      const schemaPath = path.resolve(
        process.cwd(),
        capability.schemas.input_schema_ref,
      );
      const validator = loadSchema(schemaPath);
      const valid = validator(filtered);
      if (!valid) {
        const decision = {
          allowed: false,
          reason: 'input_schema_invalid',
          capability_id: capability.capability_id,
        };
        if (this.enforcementEnabled) {
          throw new Error(decision.reason);
        }
        return {
          capability,
          decision,
          sanitizedArgs: filtered,
          inputHash: hashPayload(filtered),
        };
      }
    }

    const policyDecision = await evaluateCapabilityPolicy(capability, {
      tenantId,
      userId,
      role: 'agent',
      scopes: actorScopes,
      approvalToken,
    });

    if (!policyDecision.allow) {
      const decision = {
        allowed: false,
        reason: `policy_denied:${policyDecision.reason}`,
        capability_id: capability.capability_id,
      };
      if (this.enforcementEnabled) {
        throw new Error(decision.reason);
      }
      return {
        capability,
        decision,
        sanitizedArgs: filtered,
        inputHash: hashPayload(filtered),
      };
    }

    const decision: CapabilityDecision = {
      allowed: true,
      reason: 'allowed',
      capability_id: capability.capability_id,
      policy_refs: capability.policy_refs,
      approvals_required: requiresApproval,
      redaction_actions: redactionActions,
      rate_limit_remaining: remaining,
    };

    return {
      capability,
      decision,
      sanitizedArgs: filtered,
      inputHash: hashPayload(filtered),
    };
  }

  async preflightMcpInvoke(
    server: string,
    tool: string,
    args: Record<string, any>,
    sessionScopes: string[],
    approvalToken?: string,
    tenantId = 'system',
    userId = 'unknown',
  ): Promise<CapabilityPreflightResult> {
    const registry = loadCapabilityRegistry();
    const capability = resolveCapabilityByMcp(registry, server, tool);

    if (!capability) {
      const decision = {
        allowed: false,
        reason: 'capability_unregistered',
      };
      if (this.enforcementEnabled) {
        throw new Error(decision.reason);
      }
      return {
        capability: {
          capability_id: 'unregistered',
          name: 'unregistered',
          description: 'unregistered',
          business_domain: 'unknown',
          owner_team: 'unknown',
          repo: 'unknown',
          service: 'unknown',
          data_classification: 'internal',
          allowed_identities: [],
          operations: [],
        },
        decision,
        sanitizedArgs: args,
        inputHash: hashPayload(args),
      };
    }

    const allowed = capability.allowed_identities?.some((identity) =>
      sessionScopes.includes(identity),
    );

    if (!allowed) {
      const decision = {
        allowed: false,
        reason: 'identity_not_allowed',
        capability_id: capability.capability_id,
      };
      if (this.enforcementEnabled) {
        throw new Error(decision.reason);
      }
      return {
        capability,
        decision,
        sanitizedArgs: args,
        inputHash: hashPayload(args),
      };
    }

    const requiresApproval =
      capability.risk_controls?.approvals_required ||
      capability.data_classification === 'restricted';
    if (requiresApproval && !approvalToken) {
      const decision = {
        allowed: false,
        reason: 'approval_required',
        capability_id: capability.capability_id,
        approvals_required: true,
      };
      if (this.enforcementEnabled) {
        throw new Error(decision.reason);
      }
      return {
        capability,
        decision,
        sanitizedArgs: args,
        inputHash: hashPayload(args),
      };
    }

    const { allowed: withinRate, remaining } = enforceRateLimit(capability);
    if (!withinRate) {
      const decision = {
        allowed: false,
        reason: 'rate_limited',
        capability_id: capability.capability_id,
        rate_limit_remaining: remaining,
      };
      if (this.enforcementEnabled) {
        throw new Error(decision.reason);
      }
      return {
        capability,
        decision,
        sanitizedArgs: args,
        inputHash: hashPayload(args),
      };
    }

    const allowlist = capability.risk_controls?.allowlist_fields;
    const redactions = capability.risk_controls?.redaction_fields;
    const { filtered, redactionActions } = filterPayload(
      args,
      allowlist,
      redactions,
    );

    if (capability.schemas?.input_schema_ref) {
      const schemaPath = path.resolve(
        process.cwd(),
        capability.schemas.input_schema_ref,
      );
      const validator = loadSchema(schemaPath);
      const valid = validator({ server, tool, args: filtered });
      if (!valid) {
        const decision = {
          allowed: false,
          reason: 'input_schema_invalid',
          capability_id: capability.capability_id,
        };
        if (this.enforcementEnabled) {
          throw new Error(decision.reason);
        }
        return {
          capability,
          decision,
          sanitizedArgs: filtered,
          inputHash: hashPayload(filtered),
        };
      }
    }

    const policyDecision = await evaluateCapabilityPolicy(capability, {
      tenantId,
      userId,
      role: 'agent',
      scopes: sessionScopes,
      approvalToken,
    });

    if (!policyDecision.allow) {
      const decision = {
        allowed: false,
        reason: `policy_denied:${policyDecision.reason}`,
        capability_id: capability.capability_id,
      };
      if (this.enforcementEnabled) {
        throw new Error(decision.reason);
      }
      return {
        capability,
        decision,
        sanitizedArgs: filtered,
        inputHash: hashPayload(filtered),
      };
    }

    const decision: CapabilityDecision = {
      allowed: true,
      reason: 'allowed',
      capability_id: capability.capability_id,
      policy_refs: capability.policy_refs,
      approvals_required: requiresApproval,
      redaction_actions: redactionActions,
      rate_limit_remaining: remaining,
    };

    return {
      capability,
      decision,
      sanitizedArgs: filtered,
      inputHash: hashPayload(filtered),
    };
  }

  postflightMcpInvoke(
    capability: CapabilitySpec,
    server: string,
    tool: string,
    result: Record<string, any>,
  ): CapabilityPostflightResult {
    const allowlist = capability.risk_controls?.allowlist_fields;
    const redactions = capability.risk_controls?.redaction_fields;
    const { filtered, redactionActions } = filterPayload(
      result,
      allowlist,
      redactions,
    );

    if (capability.schemas?.output_schema_ref) {
      const schemaPath = path.resolve(
        process.cwd(),
        capability.schemas.output_schema_ref,
      );
      const validator = loadSchema(schemaPath);
      const valid = validator({
        server,
        tool,
        result: filtered,
      });
      if (!valid && this.enforcementEnabled) {
        throw new Error('output_schema_invalid');
      }
    }

    const decision: CapabilityDecision = {
      allowed: true,
      reason: 'allowed',
      capability_id: capability.capability_id,
      policy_refs: capability.policy_refs,
      redaction_actions: redactionActions,
    };

    return {
      decision,
      outputHash: hashPayload(filtered),
      sanitizedResult: filtered,
    };
  }

  logDecision(
    decision: CapabilityDecision,
    inputHash: string,
    outputHash?: string,
  ): void {
    logger.info('Capability firewall decision', {
      decision,
      inputHash,
      outputHash,
    });
  }
}

export const capabilityFirewall = new CapabilityFirewall();
