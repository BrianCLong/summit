import { gql } from 'apollo-server-express';
import { readFileSync } from 'fs';
import path from 'path';
const { copilotTypeDefs } = require('./schema.copilot.js');
const { graphTypeDefs } = require('./schema.graphops.js');
const { aiTypeDefs } = require('./schema.ai.js');
const graphragTypes = require('./types/graphragTypes.js');
const coreTypeDefs = require('./schema/core.js');
const threatTypeDefs = gql(
  readFileSync(path.join(__dirname, 'schema', 'threat.graphql'), 'utf8')
);

const base = gql`
  scalar JSON
  
  type Query { _empty: String }
  type Mutation { _empty: String }
  type Subscription { _empty: String }
`;

export const typeDefs = [
  base,
  coreTypeDefs,
  copilotTypeDefs,
  graphTypeDefs,
  graphragTypes,
  aiTypeDefs,
  threatTypeDefs,
];

