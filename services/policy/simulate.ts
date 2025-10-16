import { opaEval } from './opa';
export async function simulate(s: any) {
  const opa = await opaEval({
    kind: 'plan',
    changes: s.changes,
    context: s.context,
  });
  const cost = predictCost(s.changes, s.context);
  return {
    opa,
    cost,
    pass: opa.denies === 0 && cost.usd <= s.context.budgets.usd,
  };
}
