/**
 * Prov-Ledger Gateway Adapter
 * Provides provenance/claims functionality via stitched GraphQL schema
 * Auto-loaded by gateway from adapters/prov-ledger/
 */

const PROV_LEDGER_URL = process.env.PROV_LEDGER_URL || 'http://localhost:4010';

// ============================================================================
// GraphQL Schema Extension
// ============================================================================

export const typeDefs = `#graphql
  extend type Query {
    """
    Get a claim by ID
    """
    claim(id: ID!): Claim

    """
    Get provenance chain for a claim
    """
    provenanceChain(claimId: ID!): [ProvenanceChain!]!

    """
    Get contradictions between claims
    """
    contradictions(claimIds: [ID!]!, minConfidence: Float): ContradictionGraph!

    """
    Get disclosure bundle for a case
    """
    disclosureBundle(caseId: ID!): DisclosureBundle!

    """
    Get export manifest
    """
    exportManifest: Manifest!
  }

  extend type Mutation {
    """
    Register a new claim
    """
    registerClaim(input: CreateClaimInput!): Claim!

    """
    Register evidence
    """
    registerEvidence(input: CreateEvidenceInput!): Evidence!

    """
    Parse raw content into a structured claim
    """
    parseClaim(rawContent: String!, contentType: String): ParsedClaimResult!
  }

  type Claim {
    id: ID!
    content: JSON!
    hash: String!
    signature: String
    metadata: JSON
    sourceRef: String
    licenseId: String
    policyLabels: [String!]!
    createdAt: DateTime!
  }

  type Evidence {
    id: ID!
    caseId: String
    sourceRef: String!
    checksum: String!
    checksumAlgorithm: String!
    contentType: String
    fileSize: Int
    transformChain: [TransformStep!]!
    licenseId: String
    policyLabels: [String!]!
    authorityId: String
    createdAt: DateTime!
    metadata: JSON
  }

  type TransformStep {
    transformType: String!
    timestamp: DateTime!
    actorId: String!
    config: JSON
  }

  type ProvenanceChain {
    id: ID!
    claimId: ID!
    transforms: [String!]!
    sources: [String!]!
    lineage: JSON!
    createdAt: DateTime!
  }

  type ContradictionGraph {
    nodes: [ContradictionNode!]!
    edges: [ContradictionEdge!]!
    summary: ContradictionSummary!
  }

  type ContradictionNode {
    claimId: ID!
    claimHash: String!
    claimSummary: JSON!
    contradictionCount: Int!
  }

  type ContradictionEdge {
    sourceClaimId: ID!
    targetClaimId: ID!
    type: ContradictionType!
    confidence: Float!
    explanation: String!
    conflictingFields: [String!]!
  }

  enum ContradictionType {
    TEMPORAL_CONFLICT
    FACTUAL_CONFLICT
    ENTITY_CONFLICT
    CAUSAL_CONFLICT
    SOURCE_CONFLICT
    LOGICAL_INCONSISTENCY
  }

  type ContradictionSummary {
    totalClaims: Int!
    totalContradictions: Int!
    criticalContradictions: Int!
    byType: JSON!
    graphCoherenceScore: Float!
  }

  type DisclosureBundle {
    caseId: ID!
    version: String!
    evidence: [BundleEvidence!]!
    hashTree: [String!]!
    merkleRoot: String!
    generatedAt: DateTime!
  }

  type BundleEvidence {
    id: ID!
    sourceRef: String!
    checksum: String!
    transformChain: [TransformStep!]!
  }

  type Manifest {
    version: String!
    claims: [ManifestClaim!]!
    hashChain: String!
    signature: String
    generatedAt: DateTime!
  }

  type ManifestClaim {
    id: ID!
    hash: String!
    transforms: [String!]!
  }

  type ParsedClaimResult {
    parsedClaim: ParsedClaim!
    warnings: [String!]!
    confidence: Float!
  }

  type ParsedClaim {
    claimType: String!
    structuredContent: JSON!
    entities: [ExtractedEntity!]!
    temporalAssertions: [TemporalAssertion!]!
    sourceCitations: [String!]!
    sentiment: String
    sentimentScore: Float
  }

  type ExtractedEntity {
    entityType: String!
    value: String!
    startOffset: Int!
    endOffset: Int!
    confidence: Float!
  }

  type TemporalAssertion {
    assertionType: String!
    startTime: DateTime
    endTime: DateTime
    relativeExpression: String
    confidence: Float!
  }

  input CreateClaimInput {
    content: JSON!
    signature: String
    metadata: JSON
    sourceRef: String
    licenseId: String
    policyLabels: [String!]
  }

  input CreateEvidenceInput {
    caseId: String
    sourceRef: String!
    checksum: String
    checksumAlgorithm: String
    contentType: String
    fileSize: Int
    transformChain: [TransformStepInput!]
    licenseId: String
    policyLabels: [String!]
    metadata: JSON
  }

  input TransformStepInput {
    transformType: String!
    timestamp: DateTime!
    actorId: String!
    config: JSON
  }

  scalar JSON
  scalar DateTime
`;

// ============================================================================
// Resolvers
// ============================================================================

export const resolvers = {
  Query: {
    claim: async (_: any, args: { id: string }, context: any) => {
      const response = await fetch(`${PROV_LEDGER_URL}/claims/${args.id}`, {
        headers: {
          'x-authority-id': context.user?.id || 'anonymous',
          'x-reason-for-access': 'graphql-query',
        },
      });
      if (!response.ok) return null;
      return response.json();
    },

    provenanceChain: async (_: any, args: { claimId: string }, context: any) => {
      const response = await fetch(
        `${PROV_LEDGER_URL}/provenance?claimId=${args.claimId}`,
        {
          headers: {
            'x-authority-id': context.user?.id || 'anonymous',
            'x-reason-for-access': 'graphql-query',
          },
        },
      );
      return response.json();
    },

    contradictions: async (
      _: any,
      args: { claimIds: string[]; minConfidence?: number },
      context: any,
    ) => {
      const response = await fetch(`${PROV_LEDGER_URL}/claims/contradictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-authority-id': context.user?.id || 'anonymous',
          'x-reason-for-access': 'contradiction-analysis',
        },
        body: JSON.stringify({
          claimIds: args.claimIds,
          minConfidence: args.minConfidence || 0.5,
        }),
      });
      return response.json();
    },

    disclosureBundle: async (_: any, args: { caseId: string }, context: any) => {
      const response = await fetch(`${PROV_LEDGER_URL}/bundles/${args.caseId}`, {
        headers: {
          'x-authority-id': context.user?.id || 'anonymous',
          'x-reason-for-access': 'disclosure-export',
        },
      });
      return response.json();
    },

    exportManifest: async (_: any, __: any, context: any) => {
      const response = await fetch(`${PROV_LEDGER_URL}/export/manifest`, {
        headers: {
          'x-authority-id': context.user?.id || 'anonymous',
          'x-reason-for-access': 'manifest-export',
        },
      });
      return response.json();
    },
  },

  Mutation: {
    registerClaim: async (_: any, args: { input: any }, context: any) => {
      const response = await fetch(`${PROV_LEDGER_URL}/claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-authority-id': context.user?.id || 'anonymous',
          'x-reason-for-access': 'claim-registration',
        },
        body: JSON.stringify(args.input),
      });
      return response.json();
    },

    registerEvidence: async (_: any, args: { input: any }, context: any) => {
      const response = await fetch(`${PROV_LEDGER_URL}/evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-authority-id': context.user?.id || 'anonymous',
          'x-reason-for-access': 'evidence-registration',
        },
        body: JSON.stringify(args.input),
      });
      return response.json();
    },

    parseClaim: async (
      _: any,
      args: { rawContent: string; contentType?: string },
      context: any,
    ) => {
      const response = await fetch(`${PROV_LEDGER_URL}/claims/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-authority-id': context.user?.id || 'anonymous',
          'x-reason-for-access': 'claim-parsing',
        },
        body: JSON.stringify({
          rawContent: args.rawContent,
          contentType: args.contentType || 'text/plain',
        }),
      });
      return response.json();
    },
  },
};

// ============================================================================
// Gateway Plugin Export
// ============================================================================

export const gatewayPlugin = {
  name: 'prov-ledger',
  version: '1.0.0',
  typeDefs,
  resolvers,
};

export default gatewayPlugin;
