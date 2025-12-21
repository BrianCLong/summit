import { GraphQLSchema, defaultFieldResolver, type GraphQLFieldResolver } from 'graphql';
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import type { GraphQLContext } from '../apollo-v5-server.js';

export function budgetDirective(directiveName = 'budget') {
  return {
    budgetDirectiveTypeDefs: `directive @${directiveName}(capUSD: Float!, tokenCeiling: Int!) on FIELD_DEFINITION`,
    budgetDirectiveTransformer: (schema: GraphQLSchema) =>
      mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
          const budget = getDirective(schema, fieldConfig, directiveName)?.[0];
          if (budget) {
            const { resolve = defaultFieldResolver } = fieldConfig;
            const originalResolve = resolve as GraphQLFieldResolver<any, GraphQLContext>;
            (fieldConfig as any).resolve = async (
              source: any,
              args: any,
              ctx: GraphQLContext,
              info: any,
            ) => {
              const capUSD = Number(budget.capUSD);
              const tokenCeiling = Number(budget.tokenCeiling);
              const ok = await ctx?.budget?.check?.({
                capUSD,
                tokenCeiling,
                field: info.fieldName,
              });
              if (!ok) {
                return {
                  status: 'BLOCKED_BY_BUDGET',
                  warnings: ['Budget exceeded'],
                  diff: null,
                  auditId: `audit-${Date.now()}`,
                };
              }
              return originalResolve(source, args, ctx, info);
            };
            return fieldConfig;
          }
          return fieldConfig;
        },
      }),
  };
}
