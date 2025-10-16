type Flag = {
  key: string;
  enabled: boolean;
  rules?: Array<{ if: string; then: boolean }>;
};
const flags: Record<string, Flag> = {};
export function getFlag(key: string, ctx: Record<string, any> = {}) {
  const f = flags[key];
  if (!f) return false;
  if (!f.rules || f.rules.length === 0) return f.enabled;
  for (const r of f.rules) {
    if (evalExpr(r.if, ctx)) return r.then;
  }
  return f.enabled;
}
function evalExpr(expr: string, ctx: any) {
  return Function('ctx', `with(ctx){ return (${expr}); }`)(ctx);
}
