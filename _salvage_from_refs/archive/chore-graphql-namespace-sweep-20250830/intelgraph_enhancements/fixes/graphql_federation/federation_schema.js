
// schema.js (Apollo Federation Setup)

const { buildFederatedSchema } = require('@apollo/federation');

const schema = buildFederatedSchema([
  {
    typeDefs,
    resolvers,
  },
]);

module.exports = schema;
