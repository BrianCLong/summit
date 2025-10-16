import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from './policy.schema.json';

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);
const validate = ajv.compile(schema as any);

export type Decision = {
  allow: boolean;
  model?: string;
  denial?: string;
  reasons: Array<{ model: string; reason: string }>; // for Explain Route
};

export function decide(
  policy: any,
  req: { task: string; loa: number; risk?: string },
): Decision {
  if (!validate(policy)) {
    return { allow: false, denial: 'policy_invalid', reasons: [] };
  }
  const candidates = policy.models.map((m: any) => ({
    ...m,
    counters: { rpm: 0, tpm: 0, usd_today: 0, window_open: true },
  }));
  const rule = policy.rules.find(
    (r: any) =>
      (!r.match.task || r.match.task === req.task) &&
      (r.match.loa === undefined || r.match.loa >= req.loa),
  );
  if (!rule) return { allow: false, denial: 'no_matching_rule', reasons: [] };
  const { pickModel } = require('./scheduler');
  const { chosen, denied } = pickModel(
    candidates,
    rule.route.prefer,
    rule.route.fallback,
  );
  if (!chosen) {
    return {
      allow: false,
      denial: 'no_model_available',
      reasons: Object.entries(denied).map(([model, reason]) => ({
        model,
        reason,
      })),
    };
  }
  return {
    allow: true,
    model: chosen.name,
    reasons: Object.entries(denied).map(([model, reason]) => ({
      model,
      reason,
    })),
  };
}
