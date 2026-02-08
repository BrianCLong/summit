import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type OsintLicense {
    name: String!
    url: String
    permissions: [String]
    limitations: [String]
  }

  type OsintProvenance {
    source: String!
    method: String!
    confidence_score: Float
    last_verified: String
  }

  type OsintPrivacy {
    has_pii: Boolean!
    retention_policy: String
    audit_required: Boolean
  }

  type OsintAsset {
    asset_id: String!
    name: String!
    description: String
    tags: [String]
    license: OsintLicense!
    provenance: OsintProvenance!
    privacy: OsintPrivacy!
    shareability: String!
    created_at: String!
    updated_at: String!
  }

  extend type Query {
    osintAssets(tag: String, license: String, shareability: String): [OsintAsset]
    osintAsset(id: String!): OsintAsset
  }

  extend type Mutation {
    registerOsintAsset(input: RegisterOsintAssetInput!): OsintAsset
  }

  input RegisterOsintAssetInput {
    asset_id: String!
    name: String!
    # ... other fields
  }
`;

export const resolvers = {
  Query: {
    osintAssets: async (_: any, args: any) => {
      // Import store dynamically or use context
      const { catalogStore } = await import('../../../connectors/osint-catalog/catalogStore.js');
      return catalogStore.searchAssets(args);
    },
    osintAsset: async (_: any, { id }: any) => {
      const { catalogStore } = await import('../../../connectors/osint-catalog/catalogStore.js');
      return catalogStore.getAsset(id);
    }
  },
  Mutation: {
    registerOsintAsset: async (_: any, { input }: any) => {
      const { catalogStore } = await import('../../../connectors/osint-catalog/catalogStore.js');
      await catalogStore.addAsset(input);
      return input;
    }
  }
};
