import { gql } from 'graphql-tag';
const { copilotTypeDefs } = require('./schema.copilot.js');
const { graphTypeDefs } = require('./schema.graphops.js');
const { aiTypeDefs } = require('./schema.ai.js');
const { annotationsTypeDefs } = require('./schema.annotations.js');
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
const { healthTypeDefs } = require('./schema.health.js');
>>>>>>> main
>>>>>>> main
>>>>>>> main
>>>>>>> main
const graphragTypes = require('./types/graphragTypes.js');

const base = gql`
  scalar JSON

  type Query {
    _empty: String
  }
  type Mutation {
    _empty: String
  }
  type Subscription {
    _empty: String
  }
`;

export const typeDefs = [
  base,
  copilotTypeDefs,
  graphTypeDefs,
  graphragTypes,
  aiTypeDefs,
  annotationsTypeDefs,
  healthTypeDefs,
];
