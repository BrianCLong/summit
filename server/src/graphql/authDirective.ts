import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import { defaultFieldResolver, GraphQLSchema, GraphQLError } from 'graphql';
import AuthService from '../services/AuthService.js';

const authService = new AuthService();

export function authDirectiveTransformer(schema: GraphQLSchema, directiveName = 'auth') {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
      const authDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
      if (authDirective) {
        const { requires } = authDirective;
        if (requires) {
          const { resolve = defaultFieldResolver } = fieldConfig;
          fieldConfig.resolve = async function (source, args, context, info) {
            const user = context.user;
            if (!user) {
              throw new GraphQLError('Not authenticated', {
                extensions: { code: 'UNAUTHENTICATED' },
              });
            }

            // Check permission
            // user object from context matches AuthService User interface
            if (!authService.hasPermission(user, requires)) {
               throw new GraphQLError(`Not authorized. Requires permission: ${requires}`, {
                extensions: { code: 'FORBIDDEN' },
              });
            }

            return resolve(source, args, context, info);
          };
          return fieldConfig;
        }
      }
      return fieldConfig;
    },
  });
}
