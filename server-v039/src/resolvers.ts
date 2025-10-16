import type { GraphQLResolveInfo } from 'graphql';
import { emitAudit } from './audit.js';

type Ctx = {
  actor: { id: string; role: string; tenant: string; region: string };
  context: { purpose: string; region: string };
  authz: ReturnType<typeof import('./opa.js').makeAuthz>;
  logger: any;
};

function opInput(info: GraphQLResolveInfo, variables: any, ctx: Ctx) {
  return {
    operation: {
      isMutation: info.parentType.name === 'Mutation',
      name: info.fieldName,
      variables,
    },
    actor: ctx.actor,
    tenant: variables?.tenant || 'ALL',
    context: ctx.context,
  };
}

export function createResolvers(logger: any) {
  return {
    Query: {
      health: () => ({ ok: true, message: 'alive' }),
      getFeatureFlags: (_: any, { tenant }: any) => ({
        attestJWS: true,
        attestPQ: false,
        adaptiveCanary: true,
        budgetV2: true,
        bftEco: true,
        zkProofs: true,
        cse: true,
      }),
      getCanaryWeights: (_: any, { tenant }: any) => ({
        p95: 0.5,
        error: 0.3,
        cost: 0.15,
        p99: 0.05,
      }),
      getSloThresholds: (_: any, { tenant }: any) => ({
        composite: 0.85,
        jwsFail: 0.001,
        budgetNoise: 0.05,
        graphqlP95: 350,
        aaLag: 120,
      }),
    },
    Mutation: {
      async setFeatureFlags(
        _: any,
        vars: any,
        ctx: Ctx,
        info: GraphQLResolveInfo,
      ) {
        const input = opInput(info, vars, ctx);
        const decision = await ctx.authz(input);
        if (!decision.allow || decision.deny?.length)
          throw new Error(`policy_denied:${decision.deny?.[0] || 'unknown'}`);
        const audit = await emitAudit(ctx, input);
        return { ok: true, audit };
      },
      async setCanaryWeights(
        _: any,
        vars: any,
        ctx: Ctx,
        info: GraphQLResolveInfo,
      ) {
        const input = opInput(info, vars, ctx);
        const decision = await ctx.authz(input);
        if (!decision.allow || decision.deny?.length)
          throw new Error(`policy_denied:${decision.deny?.[0] || 'unknown'}`);
        const audit = await emitAudit(ctx, input);
        return { ok: true, audit };
      },
      async setSloThresholds(
        _: any,
        vars: any,
        ctx: Ctx,
        info: GraphQLResolveInfo,
      ) {
        const input = opInput(info, vars, ctx);
        const decision = await ctx.authz(input);
        if (!decision.allow || decision.deny?.length)
          throw new Error(`policy_denied:${decision.deny?.[0] || 'unknown'}`);
        const audit = await emitAudit(ctx, input);
        return { ok: true, audit };
      },
      async proposeRemediation(
        _: any,
        vars: any,
        ctx: Ctx,
        info: GraphQLResolveInfo,
      ) {
        const input = opInput(info, vars, ctx);
        const decision = await ctx.authz(input);
        if (!decision.allow || decision.deny?.length)
          throw new Error(`policy_denied:${decision.deny?.[0] || 'unknown'}`);
        const audit = await emitAudit(ctx, input);
        return { ok: true, audit };
      },
      async canaryPromote(
        _: any,
        vars: any,
        ctx: Ctx,
        info: GraphQLResolveInfo,
      ) {
        const input = opInput(info, vars, ctx);
        const decision = await ctx.authz(input);
        if (!decision.allow || decision.deny?.length)
          throw new Error(`policy_denied:${decision.deny?.[0] || 'unknown'}`);
        const audit = await emitAudit(ctx, input);
        return { ok: true, audit };
      },
      async canaryHold(_: any, vars: any, ctx: Ctx, info: GraphQLResolveInfo) {
        const input = opInput(info, vars, ctx);
        const decision = await ctx.authz(input);
        if (!decision.allow || decision.deny?.length)
          throw new Error(`policy_denied:${decision.deny?.[0] || 'unknown'}`);
        const audit = await emitAudit(ctx, input);
        return { ok: true, audit };
      },
      async evidencePack(
        _: any,
        vars: any,
        ctx: Ctx,
        info: GraphQLResolveInfo,
      ) {
        const input = opInput(info, vars, ctx);
        const decision = await ctx.authz(input);
        if (!decision.allow || decision.deny?.length)
          throw new Error(`policy_denied:${decision.deny?.[0] || 'unknown'}`);
        const audit = await emitAudit(ctx, input);
        return {
          ok: true,
          evidenceId: audit.evidenceId,
          hash: 'sha256:deadbeef',
          sizeBytes: 4096,
          audit,
        };
      },
      async evidenceVerify(
        _: any,
        vars: any,
        ctx: Ctx,
        info: GraphQLResolveInfo,
      ) {
        const input = opInput(info, vars, ctx);
        const decision = await ctx.authz(input);
        if (!decision.allow || decision.deny?.length)
          throw new Error(`policy_denied:${decision.deny?.[0] || 'unknown'}`);
        const audit = await emitAudit(ctx, input);
        return { ok: true, audit };
      },
      async regulatorExport(
        _: any,
        vars: any,
        ctx: Ctx,
        info: GraphQLResolveInfo,
      ) {
        const input = opInput(info, vars, ctx);
        const decision = await ctx.authz(input);
        if (!decision.allow || decision.deny?.length)
          throw new Error(`policy_denied:${decision.deny?.[0] || 'unknown'}`);
        const audit = await emitAudit(ctx, input);
        return {
          ok: true,
          url: `/artifacts/${audit.evidenceId}.zip`,
          sizeBytes: 123456,
          audit,
        };
      },
      async podrRun(_: any, vars: any, ctx: Ctx, info: GraphQLResolveInfo) {
        const input = opInput(info, vars, ctx);
        const decision = await ctx.authz(input);
        if (!decision.allow || decision.deny?.length)
          throw new Error(`policy_denied:${decision.deny?.[0] || 'unknown'}`);
        const audit = await emitAudit(ctx, input);
        return { ok: true, audit };
      },
    },
  };
}
