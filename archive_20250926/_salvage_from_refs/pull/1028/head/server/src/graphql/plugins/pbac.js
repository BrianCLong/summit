// Apollo Server plugin to enforce PBAC decisions at field level
const { GraphQLError } = require('graphql');
const { evaluate } = require('../../services/AccessControl');

function opName(info) {
  try {
    return info?.operation?.operation || 'query';
  } catch (_) { return 'query'; }
}

module.exports = function pbacPlugin() {
  return {
    async requestDidStart() {
      return {
        async executionDidStart() {
          return {
            async willResolveField({ source, args, contextValue, info }) {
              // Build a resource descriptor from type and field path
              const parentType = info.parentType?.name;
              const fieldName = info.fieldName;
              const path = `${parentType}.${fieldName}`;
              const action = `${opName(info)}:${path}`; // e.g., query:Entity.props
              const user = contextValue?.user || null;

              // Include basic resource attributes (args are often key filters)
              const resource = {
                type: parentType,
                field: fieldName,
                path,
                args,
              };

              const env = { tenant: process.env.TENANT || 'default' };
              try {
                const decision = await evaluate(action, user, resource, env);
                if (!decision?.allow) {
                  throw new GraphQLError('Forbidden', {
                    extensions: { code: 'FORBIDDEN', reason: decision?.reason || 'policy_denied' },
                  });
                }
              } catch (e) {
                if (e instanceof GraphQLError) throw e;
                // If AccessControl throws unexpectedly, default to deny-safe
                throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
              }
            },
          };
        },
      };
    },
  };
};

