import { gql } from 'graphql-tag';
import { coreTypeDefs } from '../schema.core.js';
import copilotModule from '../schema.copilot.js';
import graphModule from '../schema.graphops.js';
import aiModule from '../schema.ai.js';
import annotationsModule from '../schema.annotations.js';
import graphragTypesModule from '../types/graphragTypes.js';
import { crystalTypeDefs } from '../schema.crystal.js';
import evidenceTypeDefs from '../schema.evidence.js';
import evidenceOkTypeDefs from '../schema.evidenceOk.js';
import trustRiskTypeDefs from '../schema.trust-risk.js';
import provenanceTypeDefs from '../schema.provenance.js';
import { sprint28TypeDefs } from './sprint28.js';

const { copilotTypeDefs } = copilotModule as { copilotTypeDefs: any };
const { graphTypeDefs } = graphModule as { graphTypeDefs: any };
const { aiTypeDefs } = aiModule as { aiTypeDefs: any };
const { annotationsTypeDefs } = annotationsModule as {
  annotationsTypeDefs: any;
};
const graphragTypes =
  (graphragTypesModule as any).default || graphragTypesModule;

const base = gql`
  scalar JSON
  scalar DateTime

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
  coreTypeDefs,
  copilotTypeDefs,
  graphTypeDefs,
  graphragTypes,
  aiTypeDefs,
  annotationsTypeDefs,
  crystalTypeDefs,
  evidenceTypeDefs,
  evidenceOkTypeDefs,
  trustRiskTypeDefs,
  provenanceTypeDefs,
  sprint28TypeDefs,
];

export default typeDefs;

export const schema = typeDefs;
export const safeTypes: unknown[] = [];
