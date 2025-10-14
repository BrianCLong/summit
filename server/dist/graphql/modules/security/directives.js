import { defaultFieldResolver } from 'graphql';
import { getDirective, mapSchema, MapperKind } from '@graphql-tools/utils';
export const authDirectiveTypeDefs = `directive @authz on FIELD_DEFINITION`;
export function authDirectiveTransformer(schema) {
    return mapSchema(schema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
            const authz = getDirective(schema, fieldConfig, 'authz');
            if (authz) {
                const { resolve = defaultFieldResolver } = fieldConfig;
                fieldConfig.resolve = async function (source, args, context, info) {
                    // Authorization logic handled by Team 6
                    return resolve.call(this, source, args, context, info);
                };
                return fieldConfig;
            }
        },
    });
}
//# sourceMappingURL=directives.js.map