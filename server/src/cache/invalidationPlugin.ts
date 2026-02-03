import type { ApolloServerPlugin } from '@apollo/server';
import { emitInvalidation } from './invalidation.js';

export type InvalidationMap = Record<string, string[]>;

const defaultMap: InvalidationMap = {
  createCase: ['counts:*', 'cases:*', 'investigations:*'],
  updateCase: ['counts:*', 'cases:*', 'investigations:*'],
  deleteCase: ['counts:*', 'cases:*', 'investigations:*'],

  createInvestigation: ['counts:*', 'investigations:*'],
  updateInvestigation: ['counts:*', 'investigations:*'],
  closeInvestigation: ['counts:*', 'investigations:*'],
  deleteInvestigation: ['counts:*', 'investigations:*'],

  createIOC: ['counts:*', 'iocs:*'],
  updateIOC: ['counts:*', 'iocs:*'],
  deleteIOC: ['counts:*', 'iocs:*'],
};

function rootMutationFields(operation: any): string[] {
  const sels = operation?.selectionSet?.selections || [];
  const names = new Set<string>();
  for (const s of sels) if (s?.name?.value) names.add(s.name.value);
  return [...names];
}

export function invalidationPlugin(
  map: InvalidationMap = defaultMap,
): ApolloServerPlugin {
  return {
    async requestDidStart() {
      let patterns: string[] = [];
      let mutate = false;
      return {
        async didResolveOperation(ctx: any) {
          try {
            if (ctx.operation?.operation !== 'mutation') return;
            const roots = rootMutationFields(ctx.operation);
            const hits = new Set<string>();
            for (const r of roots) (map[r] || []).forEach((p) => hits.add(p));
            if (hits.size) {
              mutate = true;
              patterns = [...hits];
            }
          } catch {}
        },
        async willSendResponse(ctx: any) {
          try {
            if (!mutate) return;
            const hasErrors =
              Array.isArray(ctx?.errors) && ctx.errors.length > 0;
            if (!hasErrors && patterns.length) await emitInvalidation(patterns);
          } catch {}
        },
      };
    },
  };
}
