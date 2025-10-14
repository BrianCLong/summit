import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
export function authDirective(directiveName = 'auth') {
    return {
        authDirectiveTypeDefs: `directive @${directiveName}(scope:[String!]!) on FIELD_DEFINITION`,
        authDirectiveTransformer: (schema) => mapSchema(schema, {
            [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
                const dir = getDirective(schema, fieldConfig, directiveName)?.[0];
                if (!dir)
                    return fieldConfig;
                const { scope } = dir;
                const orig = fieldConfig.resolve;
                fieldConfig.resolve = async (src, args, ctx, info) => {
                    ctx.policy.assert(ctx.user, scope, { args, info });
                    return orig ? orig(src, args, ctx, info) : src[fieldConfig.name];
                };
                return fieldConfig;
            },
        }),
    };
}
//# sourceMappingURL=authDirective.js.map