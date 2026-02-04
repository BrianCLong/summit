import { gql } from 'graphql-tag';
import { coreTypeDefs } from '../schema.core.js';
import { copilotTypeDefs } from '../schema.copilot.js';
import { graphTypeDefs } from '../schema.graphops.js';
import { aiTypeDefs } from '../schema.ai.js';
import { annotationsTypeDefs } from '../schema.annotations.js';
import { graphragTypes } from '../types/graphragTypes.js';
import { crystalTypeDefs } from '../schema.crystal.js';
import evidenceTypeDefs from '../schema.evidence.js';
import evidenceOkTypeDefs from '../schema.evidenceOk.js';
import trustRiskTypeDefs from '../schema.trust-risk.js';
import provenanceTypeDefs from '../schema.provenance.js';
import { sprint28TypeDefs } from './sprint28.js';
import { ingestionTypeDefs } from './ingestion.js';
import { erTypeDefs } from '../schema.er.js';
import { foundryTypeDefs } from '../schema.foundry.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath((import.meta as any).url);
const __dirname = path.dirname(__filename);

// Load EW schema
const ewSchemaPath = path.join(__dirname, '../schemas/electronic-warfare.graphql');
const ewTypeDefs = fs.readFileSync(ewSchemaPath, 'utf8');

// Load Collaboration schema
const collabSchemaPath = path.join(__dirname, './collaboration.graphql');
const collabTypeDefs = fs.readFileSync(collabSchemaPath, 'utf8');

// Load Cognitive Security schema
const cogSecSchemaPath = path.join(__dirname, './cognitive-security.graphql');
const cogSecTypeDefs = fs.readFileSync(cogSecSchemaPath, 'utf8');

// Load Deduplication schema
const dedupSchemaPath = path.join(__dirname, '../schemas/deduplication.graphql');
const dedupTypeDefs = fs.readFileSync(dedupSchemaPath, 'utf8');

// Load Voice schema
const voiceSchemaPath = path.join(__dirname, '../schemas/voice.graphql');
const voiceTypeDefs = fs.readFileSync(voiceSchemaPath, 'utf8');

// Load OSINT schema
const osintSchemaPath = path.join(__dirname, '../schemas/osint.graphql');
const osintTypeDefs = fs.readFileSync(osintSchemaPath, 'utf8');

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
  ingestionTypeDefs,
  erTypeDefs,
  foundryTypeDefs,
  ewTypeDefs,
  collabTypeDefs,
  cogSecTypeDefs,
  dedupTypeDefs,
  voiceTypeDefs,
  osintTypeDefs,
];

export default typeDefs;

export const schema = typeDefs;
export const safeTypes: unknown[] = [];
