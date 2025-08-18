const gql = require('graphql-tag');
const { copilotTypeDefs } = require('./schema.copilot');
const { graphTypeDefs } = require('./schema.graphops');
const { aiTypeDefs } = require('./schema.ai');
const { annotationsTypeDefs } = require('./schema.annotations'); // Import annotationsTypeDefs
const { publisherTypeDefs } = require('./schema.publisher');
const graphragTypes = require('./types/graphragTypes');

const base = gql`
  scalar JSON
  
  type Query { _empty: String }
  type Mutation { _empty: String }
  type Subscription { _empty: String }
`;

module.exports = { typeDefs: [base, copilotTypeDefs, graphTypeDefs, graphragTypes, aiTypeDefs, annotationsTypeDefs, publisherTypeDefs] };
