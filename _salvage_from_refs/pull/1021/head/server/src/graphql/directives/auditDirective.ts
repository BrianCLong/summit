import { mapSchema, MapperKind, getDirective } from '@graphql-tools/utils';
import { defaultFieldResolver, GraphQLSchema } from 'graphql';
import { writeAuditLog } from '../../audit/auditLogger.js';
import { v4 as uuidv4 } from 'uuid';

export function auditDirectiveTransformer(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const directive = getDirective(schema, fieldConfig, 'audited')?.[0];
      if (directive) {
        const { resolve = defaultFieldResolver } = fieldConfig;
        fieldConfig.resolve = async function (source, args, context, info) {
          const requestId =
            context.req?.id || context.requestId || uuidv4();
          const user = context.user?.id || null;
          try {
            const result = await resolve.call(this, source, args, context, info);
            await writeAuditLog({
              user,
              action: info.fieldName,
              resource: info.parentType.name,
              before: context.audit?.before,
              after: result,
              decision: 'allow',
              reason: 'ok',
              requestId,
            });
            return result;
          } catch (err) {
            await writeAuditLog({
              user,
              action: info.fieldName,
              resource: info.parentType.name,
              before: context.audit?.before,
              after: undefined,
              decision: 'deny',
              reason: err instanceof Error ? err.message : 'error',
              requestId,
            });
            throw err;
          }
        };
        return fieldConfig;
      }
    },
  });
}
