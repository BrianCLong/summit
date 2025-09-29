import { defaultFieldResolver, GraphQLSchema } from 'graphql';
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';

/**
 * tenantScopedDirectiveTransformer enforces presence of tenantId in auth context
 * for any field annotated with @tenantScoped
 */
export function tenantScopedDirectiveTransformer(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const tenantDirective = getDirective(schema, fieldConfig, 'tenantScoped')?.[0];
      if (tenantDirective) {
        const { resolve = defaultFieldResolver } = fieldConfig;
        fieldConfig.resolve = async (source, args, context, info) => {
          const tenantId = context?.auth?.tenantId;
          if (!tenantId) {
            throw new Error('tenant_context_missing');
          }
          return resolve(source, args, context, info);
        };
        return fieldConfig;
      }
    }
  });
}
