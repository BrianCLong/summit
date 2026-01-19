import { gql } from 'graphql-tag';

export const attributionTypeDefs = gql`
  enum AttributionIndicatorCategory {
    INFRASTRUCTURE
    TIMING
    CONTENT_FINGERPRINT
    LANGUAGE_MARKER
  }

  type AttributionEvidenceContribution {
    indicatorId: ID!
    category: AttributionIndicatorCategory!
    indicatorConfidence: Float!
    signalStrength: Float!
    weight: Float!
    contribution: Float!
    rationale: String
  }

  type SponsorHypothesis {
    sponsorId: ID!
    sponsorName: String!
    score: Float!
    confidence: Float!
    evidence: [AttributionEvidenceContribution!]!
    caveats: [String!]!
  }

  type AttributionCategoryCoverage {
    category: AttributionIndicatorCategory!
    indicatorCount: Int!
    weight: Float!
  }

  type AttributionCoverage {
    indicatorCount: Int!
    categoryCoverage: [AttributionCategoryCoverage!]!
  }

  type SponsorAttributionRanking {
    modelVersion: String!
    coverage: AttributionCoverage!
    hypotheses: [SponsorHypothesis!]!
  }

  type SponsorRankingDelta {
    sponsorId: ID!
    sponsorName: String!
    baselineRank: Int!
    scenarioRank: Int!
    deltaScore: Float!
    deltaConfidence: Float!
  }

  type SponsorAttributionScenarioResult {
    baseline: SponsorAttributionRanking!
    scenario: SponsorAttributionRanking!
    deltas: [SponsorRankingDelta!]!
  }

  input SponsorCandidateInput {
    id: ID!
    name: String!
    description: String
  }

  input AttributionIndicatorInput {
    id: ID!
    category: AttributionIndicatorCategory!
    description: String!
    confidence: Float!
    observedAt: DateTime
    metadata: JSON
  }

  input AttributionSignalInput {
    indicatorId: ID!
    sponsorId: ID!
    signalStrength: Float!
    rationale: String
  }

  input AttributionWeightsInput {
    infrastructure: Float
    timing: Float
    contentFingerprint: Float
    languageMarker: Float
  }

  input SponsorAttributionRequestInput {
    indicators: [AttributionIndicatorInput!]!
    candidates: [SponsorCandidateInput!]!
    signals: [AttributionSignalInput!]!
    weights: AttributionWeightsInput
  }

  extend type Query {
    sponsorAttribution(
      request: SponsorAttributionRequestInput!
    ): SponsorAttributionRanking!
    sponsorAttributionSandbox(
      request: SponsorAttributionRequestInput!
      scenarioWeights: AttributionWeightsInput!
    ): SponsorAttributionScenarioResult!
  }
`;
