import { defaultFieldResolver, GraphQLSchema } from 'graphql';
import { allow, type ShieldMiddleware, type ShieldRule } from './shield.js';

const evaluateRule = async (
  rule: ShieldRule,
  parent: unknown,
  args: unknown,
  ctx: unknown,
  info: unknown,
): Promise<boolean> => {
  if (typeof rule === 'function') {
    return await rule(parent, args, ctx, info);
  }
  return Boolean(rule);
};

export function applyMiddleware(
  schema: GraphQLSchema,
  middleware: ShieldMiddleware,
): GraphQLSchema {
  const rules = middleware?.rules ?? {};
  const options = middleware?.options ?? {};
  const fallbackRule = options.fallbackRule ?? allow;
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
      const originalResolve = field.resolve ?? defaultFieldResolver;

      field.resolve = async (parent: any, args: any, ctx: any, info: any) => {
        try {
          const allowed = await evaluateRule(fieldRule, parent, args, ctx, info);
          if (!allowed) {
            throw fallbackError;
          }
        } catch (error) {
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
