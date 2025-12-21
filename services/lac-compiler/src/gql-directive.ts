import { defaultFieldResolver, GraphQLField } from 'graphql';

export const requiresAuthorityDirective = (roleName = 'DisclosureApprover') => ({
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    field.resolve = async function (src, args, ctx, info) {
      if (!ctx?.user?.roles?.includes(roleName)) throw new Error('FORBIDDEN');
      return resolve.call(this, src, args, ctx, info);
    };
  },
});
