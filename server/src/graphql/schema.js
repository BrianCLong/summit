const { gql } = require('apollo-server-express');
const { copilotTypeDefs } = require('./schema.copilot');

const base = gql`
  type Query { _empty: String }
  type Mutation { _empty: String }
`;

module.exports = { typeDefs: [base, copilotTypeDefs /*, existing*/] };
