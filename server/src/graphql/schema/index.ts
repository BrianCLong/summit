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
<<<<<<< HEAD
import * as fs from 'fs';
import * as path from 'path';
=======
<<<<<<< HEAD
import { sprint28TypeDefs } from './sprint28.js';
=======
import fs from 'fs';
import path from 'path';
>>>>>>> main
import { fileURLToPath } from 'url';
>>>>>>> main

const { copilotTypeDefs } = copilotModule as { copilotTypeDefs: any };
const { graphTypeDefs } = graphModule as { graphTypeDefs: any };
const { aiTypeDefs } = aiModule as { aiTypeDefs: any };
const { annotationsTypeDefs } = annotationsModule as {
  annotationsTypeDefs: any;
};
const graphragTypes =
  (graphragTypesModule as any).default || graphragTypesModule;

const __filename = fileURLToPath((import.meta as any).url);
const __dirname = path.dirname(__filename);

// Load EW schema
const ewSchemaPath = path.join(__dirname, '../schemas/electronic-warfare.graphql');
const ewTypeDefs = fs.readFileSync(ewSchemaPath, 'utf8');

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
<<<<<<< HEAD
  sprint28TypeDefs,
=======
  ewTypeDefs,
>>>>>>> main
];

export default typeDefs;

export const schema = typeDefs;
export const safeTypes: unknown[] = [];
