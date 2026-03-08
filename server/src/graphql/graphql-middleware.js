"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyMiddleware = applyMiddleware;
const graphql_1 = require("graphql");
const shield_js_1 = require("./shield.js");
const evaluateRule = async (rule, parent, args, ctx, info) => {
    if (typeof rule === 'function') {
        return await rule(parent, args, ctx, info);
    }
    return Boolean(rule);
};
function applyMiddleware(schema, middleware) {
    const rules = middleware?.rules ?? {};
    const options = middleware?.options ?? {};
    const fallbackRule = options.fallbackRule ?? shield_js_1.allow;
    const fallbackError = options.fallbackError ?? new Error('Not Authorised!');
    const allowExternalErrors = options.allowExternalErrors ?? false;
    const typeMap = schema.getTypeMap();
    for (const type of Object.values(typeMap)) {
        if (!('getFields' in type) || type.name.startsWith('__')) {
            continue;
        }
        const fields = type.getFields();
        const typeRules = rules[type.name] ?? {};
        for (const [fieldName, field] of Object.entries(fields)) {
            const fieldRule = typeRules[fieldName] ?? typeRules['*'] ?? fallbackRule;
            const originalResolve = field.resolve ?? graphql_1.defaultFieldResolver;
            field.resolve = async (parent, args, ctx, info) => {
                try {
                    const allowed = await evaluateRule(fieldRule, parent, args, ctx, info);
                    if (!allowed) {
                        throw fallbackError;
                    }
                }
                catch (error) {
                    if (allowExternalErrors && error instanceof Error) {
                        throw error;
                    }
                    throw fallbackError;
                }
                return originalResolve(parent, args, ctx, info);
            };
        }
    }
    return schema;
}
