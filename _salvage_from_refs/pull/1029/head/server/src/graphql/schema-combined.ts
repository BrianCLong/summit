import { gql } from 'apollo-server-express';
import { copilotTypeDefs } from './schema.copilot.js';
import { graphTypeDefs } from './schema.graphops.js';
import { aiTypeDefs } from './schema.ai.js';
import graphragTypes from './types/graphragTypes.js';
import coreTypeDefs from './schema/core.js';

const base = gql`
  scalar JSON
  
  type Query { _empty: String }
  type Mutation { _empty: String }
  type Subscription { _empty: String }
`;

export const typeDefs = [base, coreTypeDefs, copilotTypeDefs, graphTypeDefs, graphragTypes, aiTypeDefs];
export { typeDefs };
