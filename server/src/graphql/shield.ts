export type RuleFn = (
  parent: unknown,
  args: unknown,
  ctx: unknown,
  info: unknown,
) => boolean | Promise<boolean>;

export type ShieldRule = RuleFn | boolean;

export type ShieldRules = Record<string, Record<string, ShieldRule>>;

export type ShieldOptions = {
  fallbackRule?: ShieldRule;
  fallbackError?: Error;
  allowExternalErrors?: boolean;
  debug?: boolean;
};

export type ShieldMiddleware = {
  rules: ShieldRules;
  options: ShieldOptions;
};

const evaluateRule = async (
  rule: ShieldRule,
  parent: unknown,
  args: unknown,
  ctx: unknown,
  info: unknown,
): Promise<boolean> => {
  if (typeof rule === 'function') {
    return await rule(parent, args, ctx, info);
  }
  return Boolean(rule);
};

export const allow = true;

export const rule = (_options?: { cache?: string }) => {
  return (fn: RuleFn) => fn;
};

export const and = (...rules: ShieldRule[]): RuleFn => {
  return async (parent, args, ctx, info) => {
    for (const rule of rules) {
      if (!(await evaluateRule(rule, parent, args, ctx, info))) {
        return false;
      }
    }
    return true;
  };
};

export const or = (...rules: ShieldRule[]): RuleFn => {
  return async (parent, args, ctx, info) => {
    for (const rule of rules) {
      if (await evaluateRule(rule, parent, args, ctx, info)) {
        return true;
      }
    }
    return false;
  };
};

export const not = (ruleToInvert: ShieldRule): RuleFn => {
  return async (parent, args, ctx, info) => {
    return !(await evaluateRule(ruleToInvert, parent, args, ctx, info));
  };
};

export const shield = (
  rules: ShieldRules,
  options: ShieldOptions = {},
): ShieldMiddleware => ({
  rules,
  options,
});
