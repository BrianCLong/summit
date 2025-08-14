const { gql } = require('apollo-server-express');
const { copilotTypeDefs } = require('./schema.copilot');
const { graphTypeDefs } = require('./schema.graphops');

const base = gql`
  type Query { _empty: String }
  type Mutation { _empty: String }
`;

module.exports = { typeDefs: [base, copilotTypeDefs, graphTypeDefs /*, existing*/] };
