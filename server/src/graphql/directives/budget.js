"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.budgetDirective = budgetDirective;
// @ts-nocheck
const graphql_1 = require("graphql");
const utils_1 = require("@graphql-tools/utils");
function budgetDirective(directiveName = 'budget') {
    return {
        budgetDirectiveTypeDefs: `directive @${directiveName}(capUSD: Float!, tokenCeiling: Int!) on FIELD_DEFINITION`,
        budgetDirectiveTransformer: (schema) => (0, utils_1.mapSchema)(schema, {
            [utils_1.MapperKind.OBJECT_FIELD]: (fieldConfig) => {
                const budget = (0, utils_1.getDirective)(schema, fieldConfig, directiveName)?.[0];
                if (budget) {
                    const { resolve = graphql_1.defaultFieldResolver } = fieldConfig;
                    const originalResolve = resolve;
                    fieldConfig.resolve = async (source, args, ctx, info) => {
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
