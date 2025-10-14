import { DetectorFinding } from './detectors';

export type PolicyAction = 'allow' | 'deny' | 'redact' | 'hash';

export interface PolicyDecision {
  action: PolicyAction;
  reason?: string;
  blockEvent?: boolean;
}

export interface PolicyPlugin {
  evaluate(fieldPath: string, value: unknown, findings: DetectorFinding[]): PolicyDecision | null;
}

const WILDCARD_REGEX = /[.+?^${}()|[\]\\]/g;

const toMatcher = (pattern: string): RegExp => {
  const escaped = pattern.replace(WILDCARD_REGEX, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
};

abstract class FieldPatternPlugin implements PolicyPlugin {
  private readonly matchers: RegExp[];

  constructor(
    private readonly action: PolicyAction,
    patterns: string[],
    private readonly options: { reason?: string; requireFindings?: boolean; blockEvent?: boolean } = {},
  ) {
    this.matchers = patterns.map(toMatcher);
  }

  evaluate(fieldPath: string, value: unknown, findings: DetectorFinding[]): PolicyDecision | null {
    if (this.options.requireFindings && findings.length === 0) {
      return null;
    }

    if (!this.matchers.some((matcher) => matcher.test(fieldPath))) {
      return null;
    }

    return {
      action: this.action,
      reason: this.options.reason,
      blockEvent: this.options.blockEvent,
    };
  }
}

export class AllowPlugin extends FieldPatternPlugin {
  constructor(patterns: string[] = ['**'], reason?: string) {
    super('allow', normalizePatterns(patterns), { reason });
  }
}

export class DenyPlugin extends FieldPatternPlugin {
  constructor(patterns: string[], reason?: string, blockEvent: boolean = true) {
    super('deny', normalizePatterns(patterns), { reason, blockEvent });
  }
}

export class RedactPlugin extends FieldPatternPlugin {
  constructor(patterns: string[], reason?: string) {
    super('redact', normalizePatterns(patterns), { reason });
  }
}

export class HashPlugin extends FieldPatternPlugin {
  constructor(patterns: string[], reason?: string) {
    super('hash', normalizePatterns(patterns), { reason });
  }
}

export class PIIRedactPlugin implements PolicyPlugin {
  constructor(private readonly action: PolicyAction = 'redact', private readonly reason: string = 'pii-detected') {}

  evaluate(fieldPath: string, value: unknown, findings: DetectorFinding[]): PolicyDecision | null {
    if (typeof value === 'string' && findings.length > 0) {
      return { action: this.action, reason: this.reason };
    }
    return null;
  }
}

export interface PolicyConfig {
  allow?: string[];
  deny?: string[];
  redact?: string[];
  hash?: string[];
  defaultAction?: PolicyAction;
}

export class PolicyEngine {
  constructor(private readonly plugins: PolicyPlugin[], private readonly defaultAction: PolicyAction = 'allow') {}

  decide(fieldPath: string, value: unknown, findings: DetectorFinding[]): PolicyDecision {
    for (const plugin of this.plugins) {
      const decision = plugin.evaluate(fieldPath, value, findings);
      if (decision) {
        return decision;
      }
    }
    return { action: this.defaultAction, reason: 'default-policy' };
  }
}

const normalizePatterns = (patterns: string[] = []): string[] => {
  if (patterns.length === 0) {
    return ['**'];
  }
  const expanded = new Set<string>();
  for (const pattern of patterns) {
    expanded.add(pattern);
    if (!pattern.includes('.') && !pattern.includes('*')) {
      expanded.add(`**.${pattern}`);
    }
  }
  return Array.from(expanded);
};

export const createPolicyPipeline = (config: PolicyConfig = {}): PolicyEngine => {
  const plugins: PolicyPlugin[] = [];

  if (config.deny && config.deny.length > 0) {
    plugins.push(new DenyPlugin(config.deny, 'denylist'));
  }

  if (config.hash && config.hash.length > 0) {
    plugins.push(new HashPlugin(config.hash, 'hashlist'));
  }

  if (config.redact && config.redact.length > 0) {
    plugins.push(new RedactPlugin(config.redact, 'redactlist'));
  }

  plugins.push(new PIIRedactPlugin());

  if (config.allow && config.allow.length > 0) {
    plugins.push(new AllowPlugin(config.allow, 'allowlist'));
  }

  return new PolicyEngine(plugins, config.defaultAction ?? 'allow');
};
