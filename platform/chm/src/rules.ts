import { z } from 'zod';
import { ChmEventBus } from './events.js';
import {
  tagRuleSchema,
  type DocumentTag,
  type ExportContext,
  type ExportDecision,
  type TagRule
} from './config.js';

export interface RuleEngineOptions {
  rules: TagRule[];
  bus: ChmEventBus;
}

export class RuleEngine {
  private readonly rules: TagRule[];
  private readonly bus: ChmEventBus;

  constructor(options: RuleEngineOptions) {
    this.bus = options.bus;
    this.rules = options.rules.map((rule) => tagRuleSchema.parse(rule));
  }

  evaluate(tag: DocumentTag, context: ExportContext): ExportDecision {
    const rule = this.rules.find((candidate) => candidate.tag === tag.tag);
    if (!rule) {
      return { allowed: false, reason: `No export rule registered for ${tag.tag}` };
    }

    const residencyOk = rule.residency === context.residency;
    const licenseOk = rule.license === context.license || rule.license === 'exportable';
    const allowed = rule.exportable && residencyOk && licenseOk;

    if (!allowed) {
      const decision: ExportDecision = {
        allowed: false,
        reason: residencyOk
          ? licenseOk
            ? `Export blocked: policy ${rule.rationale}`
            : `Export blocked: license ${context.license} incompatible with ${rule.rationale}`
          : `Export blocked: residency ${context.residency} incompatible with ${rule.rationale}`,
        violatedRule: rule
      };
      this.bus.emitViolation(tag, context, decision.reason);
      return decision;
    }

    return { allowed: true, reason: `Export allowed via rule ${rule.tag}` };
  }

  upsert(rule: TagRule) {
    const parsed = tagRuleSchema.parse(rule);
    const existingIdx = this.rules.findIndex((candidate) => candidate.tag === parsed.tag);
    if (existingIdx >= 0) {
      this.rules.splice(existingIdx, 1, parsed);
      return;
    }
    this.rules.push(parsed);
  }

  serialize(): string {
    return JSON.stringify(this.rules, null, 2);
  }

  static fromSerialized(bus: ChmEventBus, payload: string): RuleEngine {
    const parsed = z.array(tagRuleSchema).parse(JSON.parse(payload));
    return new RuleEngine({ bus, rules: parsed });
  }
}
