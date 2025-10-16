import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { DEFAULT_CAPS, getModelById, normalizeCaps } from 'common-types';
import { evaluateLicense } from './license.js';
import { CostMeter } from './cost-meter.js';

const CONTEXT_ARGS = [
  'requiresMultimodal',
  'language',
  'budget',
  'gpu',
  'approvals',
  'acceptance_blocked',
  'attachments',
];

function normalizeExpression(expression) {
  return expression.replace(/\band\b/g, '&&').replace(/\bor\b/g, '||');
}

function compileRule(rule) {
  if (!rule?.when) {
    return null;
  }
  const expression = normalizeExpression(rule.when);
  const fn = new Function(...CONTEXT_ARGS, `return (${expression});`);
  return {
    choose: rule.choose,
    when: rule.when,
    test(context) {
      return Boolean(
        fn(
          context.requiresMultimodal,
          context.language,
          context.budget,
          context.gpu,
          context.approvals,
          context.acceptance_blocked,
          context.attachments,
        ),
      );
    },
  };
}

function compileRules(rules = []) {
  return rules.map((rule) => compileRule(rule)).filter((rule) => rule !== null);
}

function buildContext(request, caps) {
  const remainingBudget =
    caps.hardUsd > 0 ? Math.max(0, caps.hardUsd - (request.meterUsd ?? 0)) : 0;
  return {
    requiresMultimodal: Boolean(request.requiresMultimodal),
    language: request.language ?? 'en',
    budget: { remaining_usd: Number(remainingBudget.toFixed(6)) },
    gpu: { busy_ratio: request.gpuBusyRatio ?? 0 },
    approvals: { allow_paid: Boolean(request.allowPaid) },
    acceptance_blocked: Boolean(request.acceptanceBlocked),
    attachments: request.attachments ?? [],
  };
}

export class PolicyEngine {
  constructor(policyDoc, options = {}) {
    this.policyDoc = policyDoc ?? {};
    this.defaultModelId = this.policyDoc.default ?? 'mixtral-8x22b-instruct';
    this.rules = compileRules(this.policyDoc.rules ?? []);
    this.capsDefaults = { ...DEFAULT_CAPS, ...(this.policyDoc.caps ?? {}) };
    this.licenses = this.policyDoc.licenses ?? {};
    this.meter = options.meter ?? new CostMeter();
  }

  static fromYaml(yamlContent, options) {
    const doc = parse(yamlContent);
    return new PolicyEngine(doc, options);
  }

  static fromFile(path, options) {
    const content = readFileSync(path, 'utf8');
    return PolicyEngine.fromYaml(content, options);
  }

  describe() {
    return {
      default: this.defaultModelId,
      rules: this.rules.map((rule) => rule.when),
      caps: this.capsDefaults,
      licenses: this.licenses,
    };
  }

  decide(request) {
    const caps = normalizeCaps({ ...this.capsDefaults, ...request.caps });
    const context = buildContext(request, caps);

    let chosen = this.defaultModelId;
    let appliedRule = null;
    for (const rule of this.rules) {
      if (rule.test(context)) {
        chosen = rule.choose;
        appliedRule = rule.when;
        break;
      }
    }

    const model = getModelById(chosen);
    if (!model) {
      return {
        status: 'deny',
        reason: 'MODEL_NOT_FOUND',
        attemptedModel: chosen,
        caps,
      };
    }

    const licenseVerdict = evaluateLicense(model.license, this.licenses, {
      allowPaid: context.approvals.allow_paid,
    });
    if (licenseVerdict.status === 'deny') {
      return { status: 'deny', reason: licenseVerdict.reason, model, caps };
    }

    if (!model.local && caps.hardUsd <= 0) {
      return { status: 'deny', reason: 'CAP_DENY_PAID_MODEL', model, caps };
    }

    return {
      status: 'allow',
      model,
      caps,
      appliedRule,
      context,
    };
  }

  /**
   * Evaluate cost impact and update the meter when allowed.
   * @param {string} key
   * @param {{usd: number, tokensIn: number, tokensOut: number}}
   * @param {{hardUsd: number, softPct: number, tokenCap: number}}
   * @returns {{status: 'allow' | 'deny', reason?: string, softHit?: boolean, projected: {usd: number, tokens: number}}}
   */
  enforceCost(key, cost, caps) {
    const tokens = (cost.tokensIn ?? 0) + (cost.tokensOut ?? 0);
    const evaluation = this.meter.evaluate(key, caps, {
      usd: cost.usd ?? 0,
      tokens,
    });
    if (evaluation.status === 'allow') {
      this.meter.commit(key, { usd: cost.usd ?? 0, tokens });
    }
    return evaluation;
  }
}
