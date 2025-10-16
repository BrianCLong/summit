import { GraphQLSchema, defaultFieldResolver } from 'graphql';
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';

export function budgetDirective(directiveName = 'budget') {
  return {
    budgetDirectiveTypeDefs: `directive @${directiveName}(capUSD: Float!, tokenCeiling: Int!) on FIELD_DEFINITION`,
    budgetDirectiveTransformer: (schema: GraphQLSchema) =>
      mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
          const budget = getDirective(schema, fieldConfig, directiveName)?.[0];
          if (budget) {
            const { resolve = defaultFieldResolver } = fieldConfig as any;
            (fieldConfig as any).resolve = async (
              source: any,
              args: any,
              ctx: any,
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
              return resolve(source, args, ctx, info);
            };
            return fieldConfig;
          }
          return fieldConfig;
        },
      }),
  };
}
