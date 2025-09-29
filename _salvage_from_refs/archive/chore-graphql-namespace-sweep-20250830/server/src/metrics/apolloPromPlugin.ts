import type { ApolloServerPlugin } from '@apollo/server';
import type {
  GraphQLRequestContext,
  GraphQLRequestContextWillSendResponse,
} from '@apollo/server';
import { Counter, Histogram } from 'prom-client';
import { registry } from './registry.js';

const reqTotal = new Counter({
  name: 'apollo_request_total',
  help: 'Total GraphQL requests',
  // add tenant; keep status for success/error
  labelNames: ['operation', 'type', 'status', 'tenant'] as const,
  registers: [registry],
});

const reqErrors = new Counter({
  name: 'apollo_request_errors_total',
  help: 'Total GraphQL request errors',
  // also tag tenant & surface GraphQL error code for drilldown
  labelNames: ['operation', 'type', 'code', 'tenant'] as const,
  registers: [registry],
});

// Include tenant and status to slice latency; defaults to unknown when absent
const reqDur = new Histogram({
  name: 'apollo_request_duration_seconds',
  help: 'GraphQL request duration seconds',
  labelNames: ['operation', 'type', 'tenant', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// Bucketed resolver timings for hotspot analysis
const resDur = new Histogram({
  name: 'apollo_resolver_duration_seconds',
  help: 'Resolver duration seconds',
  labelNames: ['parent', 'field'] as const,
  buckets: [0.001, 0.003, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [registry],
});

function opName(ctx: GraphQLRequestContext): string {
  return ctx.operationName || 'anonymous';
}

function opType(
  ctx: GraphQLRequestContext,
): 'query' | 'mutation' | 'subscription' | 'unknown' {
  const t = ctx.operation?.operation;
  return t === 'query' || t === 'mutation' || t === 'subscription' ? t : 'unknown';
}

function tenantFromCtx(ctx: GraphQLRequestContext): string {
  try {
    // Prefer GraphQL context if present
    const fromCtx = (ctx.contextValue as any)?.tenant || (ctx.contextValue as any)?.tenantId;
    if (fromCtx) return String(fromCtx);
    // Fallback to HTTP header commonly used for multitenancy
    const hdr = ctx.request.http?.headers.get('x-tenant') || ctx.request.http?.headers.get('x-tenant-id');
    if (hdr) return String(hdr);
  } catch {}
  return 'unknown';
}

export function apolloPromPlugin(): ApolloServerPlugin {
  return {
    async requestDidStart(ctx) {
      const start = process.hrtime.bigint();
      const name = opName(ctx);
      const type = opType(ctx);
      const tenant = tenantFromCtx(ctx);

      return {
        async executionDidStart() {
          return {
            willResolveField({ info }) {
              const rStart = process.hrtime.bigint();
              return () => {
                const ns = Number(process.hrtime.bigint() - rStart);
                resDur.labels(info.parentType.name, info.fieldName).observe(ns / 1e9);
              };
            },
          };
        },

        async willSendResponse(rctx: GraphQLRequestContextWillSendResponse<any>) {
          const ns = Number(process.hrtime.bigint() - start);
          const hadErrors = Array.isArray(rctx.errors) && rctx.errors.length > 0;
          const status = hadErrors ? 'error' : 'success';

          reqDur.labels(name, type, tenant, status).observe(ns / 1e9);
          reqTotal.labels(name, type, status, tenant).inc();

          if (hadErrors) {
            for (const e of rctx.errors!) {
              const code = (e.extensions && (e.extensions as any).code) || 'UNKNOWN';
              reqErrors.labels(name, type, String(code), tenant).inc();
            }
          }
        },
      };
    },
  };
}
