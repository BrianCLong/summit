import { gql } from 'graphql-tag';

export const ioResilienceTypeDefs = gql`
  type IOEvent {
    id: ID!
    observed_at: DateTime!
    platform: String
    locale: String
    topic: String
    story_id: String
    detector: String
    confidence: Float
    severity: Int
    reach_estimate: Int
    url: String
    account_handle: String
    cluster_id: String
    is_authority_impersonation: Boolean
    is_synthetic_media: Boolean
    jurisdiction: String
    raw_ref: String
    threat_vector: String
    risk_score: Float
    anomaly_score: Float
    forecast_horizon_minutes: Int
    predicted_reach: Int
    provenance_confidence: Float
    actions: [IOAction!]!
    media: [IOMedia!]!
    provenance: [IOProvenanceAssertion!]!
    forecasts: [IOForecast!]!
  }

  type IOAction {
    id: ID!
    event_id: ID!
    action_type: String
    initiated_at: DateTime
    completed_at: DateTime
    status: String
    provider: String
    ticket_id: String
    outcome: String
  }

  type IOMedia {
    id: ID!
    event_id: ID!
    media_type: String
    sha256: String
    c2pa_present: Boolean
    provenance_score: Float
  }

  type IOProvenanceAssertion {
    id: ID!
    event_id: ID!
    source: String
    assertion_type: String
    verified: Boolean
    verified_by: String
    verified_at: DateTime
    signature_hash: String
    c2pa_manifest_url: String
    score: Float
    notes: String
  }

  type IOForecast {
    id: ID!
    cluster_id: String
    story_id: String
    horizon_minutes: Int!
    predicted_risk: Float
    predicted_reach: Int
    confidence_interval: Float
    model_version: String
    generated_at: DateTime!
    valid_from: DateTime!
    valid_to: DateTime
    rationale: String
    expires_at: DateTime
  }

  type IOMetricPoint {
    bucket: DateTime!
    median_ttd: Int!
    median_ttm: Int!
  }

  type IOTakedownSummary {
    provider: String!
    queued: Int!
    sent: Int!
    acknowledged: Int!
    complete: Int!
    oldest_outstanding: String
  }

  type IOClusterRollup {
    cluster_id: String!
    topic: String
    items: Int!
    actors: Int!
    reach: Int!
    avg_severity: Float
    first_seen: DateTime
    last_seen: DateTime
  }

  type IORiskOutlookPoint {
    story_id: String
    horizon_minutes: Int!
    predicted_risk: Float!
    predicted_reach: Int
    confidence_interval: Float
    model_version: String
    generated_at: DateTime!
    expires_at: DateTime
  }

  type IOProvenanceCoverage {
    story_id: String
    verified_count: Int!
    pending_count: Int!
    average_score: Float!
    last_verified_at: DateTime
    gap_flag: Boolean!
  }

  input NewIOEventInput {
    observed_at: DateTime!
    platform: String
    locale: String
    topic: String
    story_id: String
    detector: String
    confidence: Float
    severity: Int
    reach_estimate: Int
    url: String
    account_handle: String
    cluster_id: String
    is_authority_impersonation: Boolean
    is_synthetic_media: Boolean
    jurisdiction: String
    raw_ref: String
    threat_vector: String
    risk_score: Float
    anomaly_score: Float
    forecast_horizon_minutes: Int
    predicted_reach: Int
    provenance_confidence: Float
  }

  input NewIOActionInput {
    event_id: ID!
    action_type: String!
    initiated_at: DateTime
    provider: String
    ticket_id: String
    outcome: String
  }

  input NewIOForecastInput {
    cluster_id: String
    story_id: String
    horizon_minutes: Int!
    predicted_risk: Float
    predicted_reach: Int
    confidence_interval: Float
    model_version: String
    generated_at: DateTime
    valid_from: DateTime!
    valid_to: DateTime
    rationale: String
  }

  input NewIOProvenanceInput {
    event_id: ID!
    source: String
    assertion_type: String
    verified: Boolean
    verified_by: String
    verified_at: DateTime
    signature_hash: String
    c2pa_manifest_url: String
    score: Float
    notes: String
  }

  type Query {
    ioEvent(id: ID!): IOEvent
    ioEvents(limit: Int = 100, topic: String, story_id: String, severityGte: Int, threatVector: String): [IOEvent!]!
    ioTTDTTM(hours: Int = 24): [IOMetricPoint!]!
    ioTakedownAging: [IOTakedownSummary!]!
    ioClusterRollup(hours: Int = 72): [IOClusterRollup!]!
    ioForecasts(hours: Int = 24, story_id: String, cluster_id: String): [IOForecast!]!
    ioRiskOutlook(hours: Int = 24, story_id: String): [IORiskOutlookPoint!]!
    ioProvenanceCoverage(hours: Int = 24, story_id: String): [IOProvenanceCoverage!]!
  }

  type Mutation {
    createIOEvent(input: NewIOEventInput!): IOEvent!
    createIOAction(input: NewIOActionInput!): IOAction!
    completeIOAction(id: ID!): IOAction!
    createIOForecast(input: NewIOForecastInput!): IOForecast!
    createIOProvenanceAssertion(input: NewIOProvenanceInput!): IOProvenanceAssertion!
  }
`;

export default ioResilienceTypeDefs;
