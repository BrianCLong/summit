import { URL } from 'url';

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  policyVersion: string;
  enforced?: string[];
}

export interface PolicyConfig {
  allowedTools?: string[];
  deniedTools?: string[];
  targetAllowlist?: string[];
  commandAllowlist?: string[];
  defaultTimeoutMs?: number;
  rateLimit?: {
    maxCalls: number;
    intervalMs: number;
  };
  dataEgress?: {
    maxOutputLength: number;
    redactSecrets: boolean;
  };
  environmentRestrictions?: Record<string, string[]>;
}

export interface PolicyEvaluationContext {
  tool: string;
  target?: string;
  command?: string;
  labMode?: boolean;
  environment?: string;
}

export interface PolicyEngine {
  evaluate(context: PolicyEvaluationContext): PolicyDecision;
}

const DEFAULT_POLICY_VERSION = '1.0.0';

const matchTarget = (target: string, allowlist: string[]) => {
  return allowlist.some((allowed) => {
    if (!allowed) return false;
    if (allowed === '*') return true;
    if (target === allowed) return true;
    if (target.endsWith(`.${allowed}`)) return true;
    return false;
  });
};

export class BasicPolicyEngine implements PolicyEngine {
  private readonly calls: number[] = [];

  constructor(private readonly config: PolicyConfig = {}) {}

  private enforceRateLimit(): boolean {
    const { rateLimit } = this.config;
    if (!rateLimit) return true;
    const now = Date.now();
    const windowStart = now - rateLimit.intervalMs;
    while (this.calls.length && this.calls[0] < windowStart) {
      this.calls.shift();
    }
    if (this.calls.length >= rateLimit.maxCalls) {
      return false;
    }
    this.calls.push(now);
    return true;
  }

  evaluate(context: PolicyEvaluationContext): PolicyDecision {
    if (this.config.deniedTools && this.config.deniedTools.includes(context.tool)) {
      return {
        allowed: false,
        reason: `Tool ${context.tool} is explicitly denied`,
        policyVersion: DEFAULT_POLICY_VERSION,
        enforced: ['denylist'],
      };
    }

    if (!this.enforceRateLimit()) {
      return {
        allowed: false,
        reason: 'Rate limit exceeded',
        policyVersion: DEFAULT_POLICY_VERSION,
        enforced: ['rate-limit'],
      };
    }

    if (this.config.allowedTools && !this.config.allowedTools.includes(context.tool)) {
      return {
        allowed: false,
        reason: `Tool ${context.tool} is not allowlisted`,
        policyVersion: DEFAULT_POLICY_VERSION,
        enforced: ['tool-allowlist'],
      };
    }

    if (context.command && this.config.commandAllowlist) {
      if (!this.config.commandAllowlist.includes(context.command)) {
        return {
          allowed: false,
          reason: `Command ${context.command} is not allowlisted`,
          policyVersion: DEFAULT_POLICY_VERSION,
          enforced: ['command-allowlist'],
        };
      }
    }

    if (this.config.environmentRestrictions && context.environment) {
      const restricted = this.config.environmentRestrictions[context.environment] ?? [];
      if (restricted.includes(context.tool)) {
        return {
          allowed: false,
          reason: `Tool ${context.tool} is restricted in environment ${context.environment}`,
          policyVersion: DEFAULT_POLICY_VERSION,
          enforced: ['environment-restriction'],
        };
      }
    }

    if (context.target && this.config.targetAllowlist) {
      const targetHost = (() => {
        try {
          const url = new URL(context.target);
          return url.hostname;
        } catch (err) {
          return context.target;
        }
      })();
      if (!matchTarget(targetHost, this.config.targetAllowlist)) {
        return {
          allowed: false,
          reason: `Target ${targetHost} is not allowlisted`,
          policyVersion: DEFAULT_POLICY_VERSION,
          enforced: ['target-allowlist'],
        };
      }
    }

    const reason = context.labMode === true ? 'Allowed by policy' : 'Dry-run approval (lab mode disabled)';

    return {
      allowed: true,
      reason,
      policyVersion: DEFAULT_POLICY_VERSION,
      enforced: ['allowlist', 'rate-limit'],
    };
  }
}

export class PolicyAdapterRegistry {
  private adapters: Record<string, PolicyEngine> = {};

  register(name: string, engine: PolicyEngine) {
    this.adapters[name] = engine;
  }

  get(name: string): PolicyEngine | undefined {
    return this.adapters[name];
  }
}
