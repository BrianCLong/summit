import { emitAudit } from '../audit.js';

export const v043Resolvers = {
  Query: {
    quantumBackends: async () => [
      { id: 'US', provider: 'aws-braket', geo: 'us-west-2', residencyTag: 'US' },
      { id: 'EU', provider: 'iqm', geo: 'eu-central-1', residencyTag: 'EU' }
    ],
    quantumQueue: async (_: any, { tenant, limit }: any) => [],
    qcBudgets: async (_: any, { tenant }: any) => ({ minutesMonthly: 100, minutesUsed: 0, surgeThreshold: 0.8, hardCeiling: 120 }),
    mixedModeCorrectness: async (_: any, { tenant, route }: any) => 0.995
  },
  Mutation: {
    qcBudgetsSet: async (_: any, vars: any, ctx: any) => {
      const input = { operation: { name: 'qcBudgetsSet', variables: vars }, actor: ctx.actor, context: { ...ctx.context, hitl: true } };
      const d = await ctx.authz(input); if (!d.allow || d.deny?.length) throw new Error(`policy_denied:${d.deny?.[0]||'unknown'}`);
      const audit = await emitAudit(ctx, input); return { ok: true, audit };
    },
    quantumSubmit: async (_: any, vars: any, ctx: any) => {
      const input = { operation: { name: 'quantumSubmit', variables: vars }, actor: ctx.actor, tenant: vars.tenant, context: ctx.context };
      const d = await ctx.authz(input); if (!d.allow || d.deny?.length) throw new Error(`policy_denied:${d.deny?.[0]||'unknown'}`);
      // Broker selection (placeholder) — route to emulator if QC unavailable
      const audit = await emitAudit(ctx, input); return { ok: true, audit };
    },
    quantumCancel: async (_: any, vars: any, ctx: any) => {
      const input = { operation: { name: 'quantumCancel', variables: vars }, actor: ctx.actor, context: ctx.context };
      const d = await ctx.authz(input); if (!d.allow || d.deny?.length) throw new Error(`policy_denied:${d.deny?.[0]||'unknown'}`);
      const audit = await emitAudit(ctx, input); return { ok: true, audit };
    },
    registerQcAttestor: async (_: any, vars: any, ctx: any) => {
      const input = { operation: { name: 'registerQcAttestor', variables: vars }, actor: ctx.actor, context: { ...ctx.context, purpose: 'audit' } };
      const d = await ctx.authz(input); if (!d.allow || d.deny?.length) throw new Error(`policy_denied:${d.deny?.[0]||'unknown'}`);
      const audit = await emitAudit(ctx, input); return { ok: true, audit };
    }
  }
};