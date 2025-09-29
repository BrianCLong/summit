const { gql } = require('apollo-server-express');
const { copilotTypeDefs } = require('./schema.copilot');
const { graphTypeDefs } = require('./schema.graphops');
const { aiTypeDefs } = require('./schema.ai');
const graphragTypes = require('./types/graphragTypes');
const coreTypeDefs = require('./schema/core');

const base = gql`
  scalar JSON
  
  type Query { _empty: String }
  type Mutation { _empty: String }
  type Subscription { _empty: String }
`;

module.exports = { typeDefs: [base, coreTypeDefs, copilotTypeDefs, graphTypeDefs, graphragTypes, aiTypeDefs] };
