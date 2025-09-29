const gql = require('graphql-tag');
const { copilotTypeDefs } = require('./schema.copilot');
const { graphTypeDefs } = require('./schema.graphops');
const { aiTypeDefs } = require('./schema.ai');
const graphragTypes = require('./types/graphragTypes');
const { crudTypeDefs } = require('./schema/crudSchema.js'); // Import crudTypeDefs

const base = gql`
  scalar JSON
  
  type Query { _empty: String }
  type Mutation { _empty: String }
  type Subscription { _empty: String }
`;

module.exports = { typeDefs: [base, crudTypeDefs, copilotTypeDefs, graphTypeDefs, graphragTypes, aiTypeDefs] };
