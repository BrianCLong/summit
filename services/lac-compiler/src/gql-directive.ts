import {
  defaultFieldResolver,
  GraphQLField,
  GraphQLSchema,
  isObjectType,
} from 'graphql';

export const requiresAuthorityDirective = (roleName = 'DisclosureApprover') => ({
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    field.resolve = async function (src, args, ctx, info) {
      if (!ctx?.user?.roles?.includes(roleName)) throw new Error('FORBIDDEN');
      return resolve.call(this, src, args, ctx, info);
    };
  },
});

export function applyRequiresAuthorityDirective(schema: GraphQLSchema, roleName = 'DisclosureApprover') {
  const types = schema.getTypeMap();
  Object.values(types).forEach((type) => {
    if (!isObjectType(type) || type.name.startsWith('__')) return;
    const fields = type.getFields();
    Object.values(fields).forEach((field) => {
      const hasDirective = field.astNode?.directives?.some((d) => d.name.value === 'requiresAuthority');
      if (!hasDirective) return;
      const { resolve = defaultFieldResolver } = field;
      field.resolve = async function (src, args, ctx, info) {
        const roles = ctx?.user?.roles ?? [];
        if (!Array.isArray(roles) || !roles.includes(roleName)) throw new Error('FORBIDDEN');
        return resolve.call(this, src, args, ctx, info);
      };
    });
  });
  return schema;
}
