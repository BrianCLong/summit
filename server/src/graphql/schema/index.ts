import { gql } from 'graphql-tag';
import { coreTypeDefs } from '../schema.core.js';
import copilotModule from '../schema.copilot.js';
import graphModule from '../schema.graphops.js';
import aiModule from '../schema.ai.js';
import annotationsModule from '../schema.annotations.js';
import graphragTypesModule from '../types/graphragTypes.js';
import { crystalTypeDefs } from '../schema.crystal.js';

const { copilotTypeDefs } = copilotModule as { copilotTypeDefs: any };
const { graphTypeDefs } = graphModule as { graphTypeDefs: any };
const { aiTypeDefs } = aiModule as { aiTypeDefs: any };
const { annotationsTypeDefs } = annotationsModule as { annotationsTypeDefs: any };
const graphragTypes = (graphragTypesModule as any).default || graphragTypesModule;
const snapshotTypeDefs = gql`
  enum GraphSnapshotStorage {
    POSTGRES
    S3
  }

  type GraphSnapshot {
    id: ID!
    label: String
    description: String
    tenantId: String
    storage: GraphSnapshotStorage!
    compression: String!
    sizeBytes: Int!
    checksum: String!
    nodeCount: Int!
    relationshipCount: Int!
    createdAt: DateTime!
    lastRestoredAt: DateTime
    location: String
    formatVersion: String!
  }

  input CreateGraphSnapshotInput {
    label: String
    description: String
    tenantId: String
    storage: GraphSnapshotStorage
  }

  input RestoreGraphSnapshotInput {
    snapshotId: ID!
    tenantId: String
    clearExisting: Boolean
  }

  type RestoreGraphSnapshotPayload {
    snapshot: GraphSnapshot!
    restoredNodeCount: Int!
    restoredRelationshipCount: Int!
    message: String!
  }

  extend type Mutation {
    createGraphSnapshot(input: CreateGraphSnapshotInput!): GraphSnapshot!
    restoreGraphSnapshot(input: RestoreGraphSnapshotInput!): RestoreGraphSnapshotPayload!
  }
`;

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
  snapshotTypeDefs,
];

export default typeDefs;

export const schema = typeDefs;
export const safeTypes: unknown[] = [];
