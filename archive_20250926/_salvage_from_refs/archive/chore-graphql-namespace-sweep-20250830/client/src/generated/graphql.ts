import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  JSON: { input: any; output: any; }
};

export type AnomalyDetection = {
  __typename?: 'AnomalyDetection';
  anomaly_type: Scalars['String']['output'];
  baseline_deviation: Scalars['Float']['output'];
  contributing_factors: Array<Scalars['String']['output']>;
  description: Scalars['String']['output'];
  entity_id: Scalars['ID']['output'];
  severity: Scalars['Float']['output'];
  timestamp: Scalars['String']['output'];
};

export type AttackPath = {
  __typename?: 'AttackPath';
  difficulty: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  likelihood: Scalars['Float']['output'];
  mitigations: Array<Scalars['String']['output']>;
  sourceId: Scalars['ID']['output'];
  steps: Array<AttackStep>;
  targetId: Scalars['ID']['output'];
};

export type AttackStep = {
  __typename?: 'AttackStep';
  description: Scalars['String']['output'];
  detection: Array<Scalars['String']['output']>;
  requirements: Array<Scalars['String']['output']>;
  step: Scalars['Int']['output'];
  technique: Scalars['String']['output'];
};

export type BehavioralAnalysis = {
  __typename?: 'BehavioralAnalysis';
  behavioral_score: Scalars['Float']['output'];
  pattern_stability: Scalars['Float']['output'];
  patterns: Array<BehavioralPattern>;
};

export type BehavioralPattern = {
  __typename?: 'BehavioralPattern';
  confidence: Scalars['Float']['output'];
  description: Scalars['String']['output'];
  frequency: Scalars['Float']['output'];
  pattern_type: Scalars['String']['output'];
  time_window: Scalars['String']['output'];
};

export type CorrelationResult = {
  __typename?: 'CorrelationResult';
  commonAttributes: Array<Scalars['String']['output']>;
  correlationScore: Scalars['Float']['output'];
  recommendations: Array<Scalars['String']['output']>;
  sharedConnections: Array<Node>;
  temporalOverlap: Scalars['Boolean']['output'];
};

export type DatabaseStatus = {
  __typename?: 'DatabaseStatus';
  neo4j: Scalars['String']['output'];
  postgres: Scalars['String']['output'];
  redis: Scalars['String']['output'];
};

export type Edge = {
  __typename?: 'Edge';
  attack_ttps?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  capec_ttps?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  confidence?: Maybe<Scalars['Float']['output']>;
  createdAt: Scalars['String']['output'];
  createdBy?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  fromEntityId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  investigationId?: Maybe<Scalars['ID']['output']>;
  label: Scalars['String']['output'];
  properties?: Maybe<Scalars['JSON']['output']>;
  since?: Maybe<Scalars['String']['output']>;
  source?: Maybe<Scalars['String']['output']>;
  toEntityId: Scalars['ID']['output'];
  type: Scalars['String']['output'];
  until?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
  updatedBy?: Maybe<Scalars['String']['output']>;
};

export type EnrichmentData = {
  __typename?: 'EnrichmentData';
  entityId: Scalars['ID']['output'];
  externalSources: Array<ExternalSource>;
  geolocation?: Maybe<Geolocation>;
  lastEnriched: Scalars['String']['output'];
  relatedEntities: Array<Node>;
  reputation: ReputationData;
};

export type EntityCluster = {
  __typename?: 'EntityCluster';
  centerEntity: Scalars['ID']['output'];
  characteristics: Array<Scalars['String']['output']>;
  cluster_type: Scalars['String']['output'];
  entities: Array<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  similarity_score: Scalars['Float']['output'];
};

export type ExternalSource = {
  __typename?: 'ExternalSource';
  confidence: Scalars['Float']['output'];
  data: Scalars['JSON']['output'];
  lastUpdated: Scalars['String']['output'];
  source: Scalars['String']['output'];
};

export type Geolocation = {
  __typename?: 'Geolocation';
  accuracy?: Maybe<Scalars['Float']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  latitude?: Maybe<Scalars['Float']['output']>;
  longitude?: Maybe<Scalars['Float']['output']>;
};

export type GraphData = {
  __typename?: 'GraphData';
  edgeCount: Scalars['Int']['output'];
  edges: Array<Edge>;
  nodeCount: Scalars['Int']['output'];
  nodes: Array<Node>;
};

export type GraphMetrics = {
  __typename?: 'GraphMetrics';
  average_path_length: Scalars['Float']['output'];
  centrality_scores: Scalars['JSON']['output'];
  clustering_coefficient: Scalars['Float']['output'];
  community_modularity: Scalars['Float']['output'];
  influence_scores: Scalars['JSON']['output'];
  network_density: Scalars['Float']['output'];
};

export type Investigation = {
  __typename?: 'Investigation';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  edgeCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  nodeCount: Scalars['Int']['output'];
  status: Scalars['String']['output'];
};

export type MlPrediction = {
  __typename?: 'MLPrediction';
  confidence: Scalars['Float']['output'];
  probability: Scalars['Float']['output'];
  reasoning: Array<Scalars['String']['output']>;
  risk_level: Scalars['String']['output'];
};

export type MitreAttack = {
  __typename?: 'MitreAttack';
  confidence: Scalars['Float']['output'];
  description: Scalars['String']['output'];
  severity: Scalars['String']['output'];
  tactic: Scalars['String']['output'];
  technique: Scalars['String']['output'];
};

export type MitreMatrixEntry = {
  __typename?: 'MitreMatrixEntry';
  coverage: Scalars['Float']['output'];
  tactic: Scalars['String']['output'];
  techniques: Array<Scalars['String']['output']>;
};

export type Node = {
  __typename?: 'Node';
  actor_links?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  attack_ttps?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  capec_ttps?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  confidence?: Maybe<Scalars['Float']['output']>;
  createdAt: Scalars['String']['output'];
  createdBy?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  investigationId?: Maybe<Scalars['ID']['output']>;
  label: Scalars['String']['output'];
  properties?: Maybe<Scalars['JSON']['output']>;
  source?: Maybe<Scalars['String']['output']>;
  triage_score?: Maybe<Scalars['Float']['output']>;
  type: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  updatedBy?: Maybe<Scalars['String']['output']>;
};

export type Query = {
  __typename?: 'Query';
  analyzeBehavioralPatterns: BehavioralAnalysis;
  analyzeGraphMetrics: GraphMetrics;
  attackPathways: Array<AttackPath>;
  calculateRiskScore: MlPrediction;
  clusterEntities: Array<EntityCluster>;
  correlateEntities: CorrelationResult;
  detectAnomalies: Array<AnomalyDetection>;
  entityEnrichment: EnrichmentData;
  getEntityDetails?: Maybe<Node>;
  getInvestigations: Array<Investigation>;
  graphData?: Maybe<GraphData>;
  health?: Maybe<Scalars['String']['output']>;
  hello?: Maybe<Scalars['String']['output']>;
  predictRelationships: Array<RelationshipPrediction>;
  riskAssessment: RiskAssessment;
  searchEntities: Array<Node>;
  serverStats: ServerStats;
  threatAnalysis: ThreatAnalysis;
  timelineEvents: Array<TimelineEvent>;
};


export type QueryAnalyzeBehavioralPatternsArgs = {
  entityId: Scalars['ID']['input'];
};


export type QueryAnalyzeGraphMetricsArgs = {
  investigationId: Scalars['ID']['input'];
};


export type QueryAttackPathwaysArgs = {
  sourceId: Scalars['ID']['input'];
  targetId: Scalars['ID']['input'];
};


export type QueryCalculateRiskScoreArgs = {
  entityId: Scalars['ID']['input'];
};


export type QueryClusterEntitiesArgs = {
  investigationId: Scalars['ID']['input'];
};


export type QueryCorrelateEntitiesArgs = {
  entityIds: Array<Scalars['ID']['input']>;
};


export type QueryDetectAnomaliesArgs = {
  investigationId: Scalars['ID']['input'];
};


export type QueryEntityEnrichmentArgs = {
  entityId: Scalars['ID']['input'];
};


export type QueryGetEntityDetailsArgs = {
  entityId: Scalars['ID']['input'];
};


export type QueryGraphDataArgs = {
  investigationId: Scalars['ID']['input'];
};


export type QueryPredictRelationshipsArgs = {
  candidateIds: Array<Scalars['ID']['input']>;
  entityId: Scalars['ID']['input'];
};


export type QueryRiskAssessmentArgs = {
  investigationId: Scalars['ID']['input'];
};


export type QuerySearchEntitiesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QueryThreatAnalysisArgs = {
  entityId: Scalars['ID']['input'];
};


export type QueryTimelineEventsArgs = {
  endDate?: InputMaybe<Scalars['String']['input']>;
  investigationId: Scalars['ID']['input'];
  startDate?: InputMaybe<Scalars['String']['input']>;
};

export type RelationshipPrediction = {
  __typename?: 'RelationshipPrediction';
  confidence: Scalars['Float']['output'];
  predicted_relationship: Scalars['String']['output'];
  reasoning: Array<Scalars['String']['output']>;
  target_entity: Scalars['ID']['output'];
};

export type ReputationData = {
  __typename?: 'ReputationData';
  category: Scalars['String']['output'];
  lastChecked: Scalars['String']['output'];
  score: Scalars['Float']['output'];
  sources: Array<Scalars['String']['output']>;
};

export type RiskAssessment = {
  __typename?: 'RiskAssessment';
  investigationId: Scalars['ID']['output'];
  mitreMatrix: Array<MitreMatrixEntry>;
  overallRisk: Scalars['Float']['output'];
  recommendations: Array<Scalars['String']['output']>;
  riskFactors: Array<RiskFactor>;
  timeline: Array<RiskTimelineEntry>;
};

export type RiskFactor = {
  __typename?: 'RiskFactor';
  description: Scalars['String']['output'];
  factor: Scalars['String']['output'];
  impact: Scalars['Float']['output'];
  likelihood: Scalars['Float']['output'];
};

export type RiskTimelineEntry = {
  __typename?: 'RiskTimelineEntry';
  events: Array<Scalars['String']['output']>;
  riskLevel: Scalars['Float']['output'];
  timestamp: Scalars['String']['output'];
};

export type ServerStats = {
  __typename?: 'ServerStats';
  databaseStatus: DatabaseStatus;
  totalEntities: Scalars['Int']['output'];
  totalInvestigations: Scalars['Int']['output'];
  totalRelationships: Scalars['Int']['output'];
  uptime: Scalars['String']['output'];
};

export type ThreatAnalysis = {
  __typename?: 'ThreatAnalysis';
  entityId: Scalars['ID']['output'];
  lastUpdated: Scalars['String']['output'];
  mitreAttacks: Array<MitreAttack>;
  recommendations: Array<Scalars['String']['output']>;
  riskScore: Scalars['Float']['output'];
  threatLevel: Scalars['String']['output'];
  vulnerabilities: Array<Vulnerability>;
};

export type TimelineEvent = {
  __typename?: 'TimelineEvent';
  description: Scalars['String']['output'];
  entityId: Scalars['ID']['output'];
  eventType: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  metadata?: Maybe<Scalars['JSON']['output']>;
  severity: Scalars['String']['output'];
  source: Scalars['String']['output'];
  timestamp: Scalars['String']['output'];
};

export type Vulnerability = {
  __typename?: 'Vulnerability';
  cve: Scalars['String']['output'];
  description: Scalars['String']['output'];
  exploitable: Scalars['Boolean']['output'];
  patchAvailable: Scalars['Boolean']['output'];
  severity: Scalars['String']['output'];
};

export type ActivityFeedDataQueryVariables = Exact<{ [key: string]: never; }>;


export type ActivityFeedDataQuery = { __typename?: 'Query', serverStats: { __typename?: 'ServerStats', uptime: string, totalInvestigations: number, totalEntities: number } };

export type MockCommentsQueryVariables = Exact<{
  targetId: Scalars['ID']['input'];
}>;


export type MockCommentsQuery = { __typename?: 'Query', serverStats: { __typename?: 'ServerStats', uptime: string } };

export type ServerStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type ServerStatsQuery = { __typename?: 'Query', serverStats: { __typename?: 'ServerStats', uptime: string, totalInvestigations: number, totalEntities: number, totalRelationships: number, databaseStatus: { __typename?: 'DatabaseStatus', redis: string, postgres: string, neo4j: string } } };

export type InvestigationsQueryVariables = Exact<{ [key: string]: never; }>;


export type InvestigationsQuery = { __typename?: 'Query', getInvestigations: Array<{ __typename?: 'Investigation', id: string, name: string, description?: string | null, status: string, createdAt: string, nodeCount: number, edgeCount: number }> };

export type EntityEnrichmentQueryVariables = Exact<{
  entityId: Scalars['ID']['input'];
}>;


export type EntityEnrichmentQuery = { __typename?: 'Query', entityEnrichment: { __typename?: 'EnrichmentData', entityId: string, lastEnriched: string, externalSources: Array<{ __typename?: 'ExternalSource', source: string, data: any, confidence: number, lastUpdated: string }>, geolocation?: { __typename?: 'Geolocation', country?: string | null, city?: string | null, latitude?: number | null, longitude?: number | null, accuracy?: number | null } | null, reputation: { __typename?: 'ReputationData', score: number, category: string, sources: Array<string>, lastChecked: string }, relatedEntities: Array<{ __typename?: 'Node', id: string, type: string, label: string, description?: string | null }> } };

export type MockGraphStreamingQueryVariables = Exact<{
  nodeId: Scalars['ID']['input'];
}>;


export type MockGraphStreamingQuery = { __typename?: 'Query', graphData?: { __typename?: 'GraphData', nodes: Array<{ __typename?: 'Node', id: string, label: string, type: string, properties?: any | null }>, edges: Array<{ __typename?: 'Edge', id: string, source?: string | null, type: string }> } | null };

export type MockKShortestPathsQueryVariables = Exact<{
  sourceId: Scalars['ID']['input'];
  targetId: Scalars['ID']['input'];
}>;


export type MockKShortestPathsQuery = { __typename?: 'Query', graphData?: { __typename?: 'GraphData', nodes: Array<{ __typename?: 'Node', id: string, label: string, type: string }>, edges: Array<{ __typename?: 'Edge', id: string, source?: string | null, type: string }> } | null };

export type GraphDataQueryVariables = Exact<{
  investigationId: Scalars['ID']['input'];
}>;


export type GraphDataQuery = { __typename?: 'Query', graphData?: { __typename?: 'GraphData', nodeCount: number, edgeCount: number, nodes: Array<{ __typename?: 'Node', id: string, type: string, label: string, description?: string | null, properties?: any | null, confidence?: number | null, source?: string | null, investigationId?: string | null }>, edges: Array<{ __typename?: 'Edge', id: string, type: string, label: string, description?: string | null, properties?: any | null, confidence?: number | null, source?: string | null, fromEntityId: string, toEntityId: string, investigationId?: string | null }> } | null };

export type SearchEntitiesQueryVariables = Exact<{
  query: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SearchEntitiesQuery = { __typename?: 'Query', searchEntities: Array<{ __typename?: 'Node', id: string, type: string, label: string, description?: string | null, properties?: any | null, confidence?: number | null, source?: string | null, investigationId?: string | null }> };

export type EntityDetailsQueryVariables = Exact<{
  entityId: Scalars['ID']['input'];
}>;


export type EntityDetailsQuery = { __typename?: 'Query', getEntityDetails?: { __typename?: 'Node', id: string, type: string, label: string, description?: string | null, properties?: any | null, confidence?: number | null, source?: string | null, investigationId?: string | null, createdBy?: string | null, updatedBy?: string | null, createdAt: string, updatedAt: string, attack_ttps?: Array<string | null> | null, capec_ttps?: Array<string | null> | null, triage_score?: number | null, actor_links?: Array<string | null> | null } | null };

export type Gw_GraphDataQueryVariables = Exact<{
  investigationId: Scalars['ID']['input'];
}>;


export type Gw_GraphDataQuery = { __typename?: 'Query', graphData?: { __typename?: 'GraphData', nodeCount: number, edgeCount: number, nodes: Array<{ __typename?: 'Node', id: string, type: string, label: string, description?: string | null, properties?: any | null, confidence?: number | null, source?: string | null }>, edges: Array<{ __typename?: 'Edge', id: string, type: string, label: string, description?: string | null, properties?: any | null, confidence?: number | null, source?: string | null, fromEntityId: string, toEntityId: string }> } | null };

export type Gw_SearchEntitiesQueryVariables = Exact<{
  query: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type Gw_SearchEntitiesQuery = { __typename?: 'Query', searchEntities: Array<{ __typename?: 'Node', id: string, type: string, label: string, description?: string | null, properties?: any | null, confidence?: number | null, source?: string | null, investigationId?: string | null }> };

export type Gw_EntityDetailsQueryVariables = Exact<{
  entityId: Scalars['ID']['input'];
}>;


export type Gw_EntityDetailsQuery = { __typename?: 'Query', getEntityDetails?: { __typename?: 'Node', id: string, type: string, label: string, description?: string | null, properties?: any | null, confidence?: number | null, source?: string | null, investigationId?: string | null, createdBy?: string | null, updatedBy?: string | null, createdAt: string, updatedAt: string, attack_ttps?: Array<string | null> | null, capec_ttps?: Array<string | null> | null, triage_score?: number | null, actor_links?: Array<string | null> | null } | null };

export type MockPresenceQueryVariables = Exact<{
  caseId?: InputMaybe<Scalars['ID']['input']>;
}>;


export type MockPresenceQuery = { __typename?: 'Query', serverStats: { __typename?: 'ServerStats', uptime: string } };

export type MockReportTemplatesQueryVariables = Exact<{ [key: string]: never; }>;


export type MockReportTemplatesQuery = { __typename?: 'Query', serverStats: { __typename?: 'ServerStats', uptime: string, totalInvestigations: number } };

export type MockExportDataQueryVariables = Exact<{
  investigationId: Scalars['ID']['input'];
}>;


export type MockExportDataQuery = { __typename?: 'Query', serverStats: { __typename?: 'ServerStats', uptime: string } };

export type PowerSearchEntitiesQueryVariables = Exact<{
  query: Scalars['String']['input'];
}>;


export type PowerSearchEntitiesQuery = { __typename?: 'Query', searchEntities: Array<{ __typename?: 'Node', id: string, label: string, type: string, properties?: any | null }> };

export type MockSavedSearchesQueryVariables = Exact<{ [key: string]: never; }>;


export type MockSavedSearchesQuery = { __typename?: 'Query', serverStats: { __typename?: 'ServerStats', uptime: string, totalInvestigations: number } };

export type ServerStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type ServerStatsQuery = { __typename?: 'Query', serverStats: { __typename?: 'ServerStats', uptime: string, totalInvestigations: number, totalEntities: number, totalRelationships: number, databaseStatus: { __typename?: 'DatabaseStatus', redis: string, postgres: string, neo4j: string } } };

export type HealthCheckQueryVariables = Exact<{ [key: string]: never; }>;


export type HealthCheckQuery = { __typename?: 'Query', health?: string | null };

export type ThreatAnalysisQueryVariables = Exact<{
  entityId: Scalars['ID']['input'];
}>;


export type ThreatAnalysisQuery = { __typename?: 'Query', threatAnalysis: { __typename?: 'ThreatAnalysis', entityId: string, riskScore: number, threatLevel: string, recommendations: Array<string>, lastUpdated: string, mitreAttacks: Array<{ __typename?: 'MitreAttack', technique: string, tactic: string, description: string, severity: string, confidence: number }>, vulnerabilities: Array<{ __typename?: 'Vulnerability', cve: string, severity: string, description: string, exploitable: boolean, patchAvailable: boolean }> } };

export type TimelineEventsQueryVariables = Exact<{
  investigationId: Scalars['ID']['input'];
  startDate?: InputMaybe<Scalars['String']['input']>;
  endDate?: InputMaybe<Scalars['String']['input']>;
}>;


export type TimelineEventsQuery = { __typename?: 'Query', timelineEvents: Array<{ __typename?: 'TimelineEvent', id: string, timestamp: string, eventType: string, entityId: string, description: string, severity: string, source: string, metadata?: any | null }> };


export const GW_ActivityFeedDataDocument = gql`
    query ActivityFeedData {
  serverStats {
    uptime
    totalInvestigations
    totalEntities
  }
}
    `;

/**
 * __useActivityFeedDataQuery__
 *
 * To run a query within a React component, call `useGW_ActivityFeedDataQuery` and pass it any options that fit your needs.
 * When your component renders, `useGW_ActivityFeedDataQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGW_ActivityFeedDataQuery({
 *   variables: {
 *   },
 * });
 */
export function useGW_ActivityFeedDataQuery(baseOptions?: Apollo.QueryHookOptions<ActivityFeedDataQuery, ActivityFeedDataQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ActivityFeedDataQuery, ActivityFeedDataQueryVariables>(GW_ActivityFeedDataDocument, options);
      }
export function useActivityFeedDataLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ActivityFeedDataQuery, ActivityFeedDataQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ActivityFeedDataQuery, ActivityFeedDataQueryVariables>(GW_ActivityFeedDataDocument, options);
        }
export function useActivityFeedDataSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ActivityFeedDataQuery, ActivityFeedDataQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ActivityFeedDataQuery, ActivityFeedDataQueryVariables>(GW_ActivityFeedDataDocument, options);
        }
export type ActivityFeedDataQueryHookResult = ReturnType<typeof useGW_ActivityFeedDataQuery>;
export type ActivityFeedDataLazyQueryHookResult = ReturnType<typeof useActivityFeedDataLazyQuery>;
export type ActivityFeedDataSuspenseQueryHookResult = ReturnType<typeof useActivityFeedDataSuspenseQuery>;
export type ActivityFeedDataQueryResult = Apollo.QueryResult<ActivityFeedDataQuery, ActivityFeedDataQueryVariables>;
export const GW_MockCommentsDocument = gql`
    query MockComments($targetId: ID!) {
  serverStats {
    uptime
  }
}
    `;

/**
 * __useMockCommentsQuery__
 *
 * To run a query within a React component, call `useGW_MockCommentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGW_MockCommentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGW_MockCommentsQuery({
 *   variables: {
 *      targetId: // value for 'targetId'
 *   },
 * });
 */
export function useGW_MockCommentsQuery(baseOptions: Apollo.QueryHookOptions<MockCommentsQuery, MockCommentsQueryVariables> & ({ variables: MockCommentsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MockCommentsQuery, MockCommentsQueryVariables>(GW_MockCommentsDocument, options);
      }
export function useMockCommentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MockCommentsQuery, MockCommentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MockCommentsQuery, MockCommentsQueryVariables>(GW_MockCommentsDocument, options);
        }
export function useMockCommentsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MockCommentsQuery, MockCommentsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MockCommentsQuery, MockCommentsQueryVariables>(GW_MockCommentsDocument, options);
        }
export type MockCommentsQueryHookResult = ReturnType<typeof useGW_MockCommentsQuery>;
export type MockCommentsLazyQueryHookResult = ReturnType<typeof useMockCommentsLazyQuery>;
export type MockCommentsSuspenseQueryHookResult = ReturnType<typeof useMockCommentsSuspenseQuery>;
export type MockCommentsQueryResult = Apollo.QueryResult<MockCommentsQuery, MockCommentsQueryVariables>;
export const DB_ServerStatsDocument = gql`
    query ServerStats {
  serverStats {
    uptime
    totalInvestigations
    totalEntities
    totalRelationships
    databaseStatus {
      redis
      postgres
      neo4j
    }
  }
}
    `;

/**
 * __useServerStatsQuery__
 *
 * To run a query within a React component, call `useDB_ServerStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDB_ServerStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDB_ServerStatsQuery({
 *   variables: {
 *   },
 * });
 */
export function useDB_ServerStatsQuery(baseOptions?: Apollo.QueryHookOptions<ServerStatsQuery, ServerStatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServerStatsQuery, ServerStatsQueryVariables>(DB_ServerStatsDocument, options);
      }
export function useServerStatsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServerStatsQuery, ServerStatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServerStatsQuery, ServerStatsQueryVariables>(DB_ServerStatsDocument, options);
        }
export function useServerStatsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ServerStatsQuery, ServerStatsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ServerStatsQuery, ServerStatsQueryVariables>(DB_ServerStatsDocument, options);
        }
export type ServerStatsQueryHookResult = ReturnType<typeof useDB_ServerStatsQuery>;
export type ServerStatsLazyQueryHookResult = ReturnType<typeof useServerStatsLazyQuery>;
export type ServerStatsSuspenseQueryHookResult = ReturnType<typeof useServerStatsSuspenseQuery>;
export type ServerStatsQueryResult = Apollo.QueryResult<ServerStatsQuery, ServerStatsQueryVariables>;
export const DB_InvestigationsDocument = gql`
    query Investigations {
  getInvestigations {
    id
    name
    description
    status
    createdAt
    nodeCount
    edgeCount
  }
}
    `;

/**
 * __useInvestigationsQuery__
 *
 * To run a query within a React component, call `useDB_InvestigationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDB_InvestigationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDB_InvestigationsQuery({
 *   variables: {
 *   },
 * });
 */
export function useDB_InvestigationsQuery(baseOptions?: Apollo.QueryHookOptions<InvestigationsQuery, InvestigationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<InvestigationsQuery, InvestigationsQueryVariables>(DB_InvestigationsDocument, options);
      }
export function useInvestigationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<InvestigationsQuery, InvestigationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<InvestigationsQuery, InvestigationsQueryVariables>(DB_InvestigationsDocument, options);
        }
export function useInvestigationsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<InvestigationsQuery, InvestigationsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<InvestigationsQuery, InvestigationsQueryVariables>(DB_InvestigationsDocument, options);
        }
export type InvestigationsQueryHookResult = ReturnType<typeof useDB_InvestigationsQuery>;
export type InvestigationsLazyQueryHookResult = ReturnType<typeof useInvestigationsLazyQuery>;
export type InvestigationsSuspenseQueryHookResult = ReturnType<typeof useInvestigationsSuspenseQuery>;
export type InvestigationsQueryResult = Apollo.QueryResult<InvestigationsQuery, InvestigationsQueryVariables>;
export const GW_EntityEnrichmentDocument = gql`
    query EntityEnrichment($entityId: ID!) {
  entityEnrichment(entityId: $entityId) {
    entityId
    externalSources {
      source
      data
      confidence
      lastUpdated
    }
    geolocation {
      country
      city
      latitude
      longitude
      accuracy
    }
    reputation {
      score
      category
      sources
      lastChecked
    }
    relatedEntities {
      id
      type
      label
      description
    }
    lastEnriched
  }
}
    `;

/**
 * __useEntityEnrichmentQuery__
 *
 * To run a query within a React component, call `useGW_EntityEnrichmentQuery` and pass it any options that fit your needs.
 * When your component renders, `useGW_EntityEnrichmentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGW_EntityEnrichmentQuery({
 *   variables: {
 *      entityId: // value for 'entityId'
 *   },
 * });
 */
export function useGW_EntityEnrichmentQuery(baseOptions: Apollo.QueryHookOptions<EntityEnrichmentQuery, EntityEnrichmentQueryVariables> & ({ variables: EntityEnrichmentQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<EntityEnrichmentQuery, EntityEnrichmentQueryVariables>(GW_EntityEnrichmentDocument, options);
      }
export function useEntityEnrichmentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<EntityEnrichmentQuery, EntityEnrichmentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<EntityEnrichmentQuery, EntityEnrichmentQueryVariables>(GW_EntityEnrichmentDocument, options);
        }
export function useEntityEnrichmentSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<EntityEnrichmentQuery, EntityEnrichmentQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<EntityEnrichmentQuery, EntityEnrichmentQueryVariables>(GW_EntityEnrichmentDocument, options);
        }
export type EntityEnrichmentQueryHookResult = ReturnType<typeof useGW_EntityEnrichmentQuery>;
export type EntityEnrichmentLazyQueryHookResult = ReturnType<typeof useEntityEnrichmentLazyQuery>;
export type EntityEnrichmentSuspenseQueryHookResult = ReturnType<typeof useEntityEnrichmentSuspenseQuery>;
export type EntityEnrichmentQueryResult = Apollo.QueryResult<EntityEnrichmentQuery, EntityEnrichmentQueryVariables>;
export const GW_MockGraphStreamingDocument = gql`
    query MockGraphStreaming($nodeId: ID!) {
  graphData(investigationId: $nodeId) {
    nodes {
      id
      label
      type
      properties
    }
    edges {
      id
      source
      type
    }
  }
}
    `;

/**
 * __useMockGraphStreamingQuery__
 *
 * To run a query within a React component, call `useGW_MockGraphStreamingQuery` and pass it any options that fit your needs.
 * When your component renders, `useGW_MockGraphStreamingQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGW_MockGraphStreamingQuery({
 *   variables: {
 *      nodeId: // value for 'nodeId'
 *   },
 * });
 */
export function useGW_MockGraphStreamingQuery(baseOptions: Apollo.QueryHookOptions<MockGraphStreamingQuery, MockGraphStreamingQueryVariables> & ({ variables: MockGraphStreamingQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MockGraphStreamingQuery, MockGraphStreamingQueryVariables>(GW_MockGraphStreamingDocument, options);
      }
export function useMockGraphStreamingLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MockGraphStreamingQuery, MockGraphStreamingQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MockGraphStreamingQuery, MockGraphStreamingQueryVariables>(GW_MockGraphStreamingDocument, options);
        }
export function useMockGraphStreamingSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MockGraphStreamingQuery, MockGraphStreamingQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MockGraphStreamingQuery, MockGraphStreamingQueryVariables>(GW_MockGraphStreamingDocument, options);
        }
export type MockGraphStreamingQueryHookResult = ReturnType<typeof useGW_MockGraphStreamingQuery>;
export type MockGraphStreamingLazyQueryHookResult = ReturnType<typeof useMockGraphStreamingLazyQuery>;
export type MockGraphStreamingSuspenseQueryHookResult = ReturnType<typeof useMockGraphStreamingSuspenseQuery>;
export type MockGraphStreamingQueryResult = Apollo.QueryResult<MockGraphStreamingQuery, MockGraphStreamingQueryVariables>;
export const GW_MockKShortestPathsDocument = gql`
    query MockKShortestPaths($sourceId: ID!, $targetId: ID!) {
  graphData(investigationId: $sourceId) {
    nodes {
      id
      label
      type
    }
    edges {
      id
      source
      type
    }
  }
}
    `;

/**
 * __useMockKShortestPathsQuery__
 *
 * To run a query within a React component, call `useGW_MockKShortestPathsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGW_MockKShortestPathsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGW_MockKShortestPathsQuery({
 *   variables: {
 *      sourceId: // value for 'sourceId'
 *      targetId: // value for 'targetId'
 *   },
 * });
 */
export function useGW_MockKShortestPathsQuery(baseOptions: Apollo.QueryHookOptions<MockKShortestPathsQuery, MockKShortestPathsQueryVariables> & ({ variables: MockKShortestPathsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MockKShortestPathsQuery, MockKShortestPathsQueryVariables>(GW_MockKShortestPathsDocument, options);
      }
export function useMockKShortestPathsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MockKShortestPathsQuery, MockKShortestPathsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MockKShortestPathsQuery, MockKShortestPathsQueryVariables>(GW_MockKShortestPathsDocument, options);
        }
export function useMockKShortestPathsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MockKShortestPathsQuery, MockKShortestPathsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MockKShortestPathsQuery, MockKShortestPathsQueryVariables>(GW_MockKShortestPathsDocument, options);
        }
export type MockKShortestPathsQueryHookResult = ReturnType<typeof useGW_MockKShortestPathsQuery>;
export type MockKShortestPathsLazyQueryHookResult = ReturnType<typeof useMockKShortestPathsLazyQuery>;
export type MockKShortestPathsSuspenseQueryHookResult = ReturnType<typeof useMockKShortestPathsSuspenseQuery>;
export type MockKShortestPathsQueryResult = Apollo.QueryResult<MockKShortestPathsQuery, MockKShortestPathsQueryVariables>;
export const GW_GraphDataDocument = gql`
    query GraphData($investigationId: ID!) {
  graphData(investigationId: $investigationId) {
    nodes {
      id
      type
      label
      description
      properties
      confidence
      source
      investigationId
    }
    edges {
      id
      type
      label
      description
      properties
      confidence
      source
      fromEntityId
      toEntityId
      investigationId
    }
    nodeCount
    edgeCount
  }
}
    `;

/**
 * __useGraphDataQuery__
 *
 * To run a query within a React component, call `useGW_GraphDataQuery` and pass it any options that fit your needs.
 * When your component renders, `useGW_GraphDataQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGW_GraphDataQuery({
 *   variables: {
 *      investigationId: // value for 'investigationId'
 *   },
 * });
 */
export function useGW_GraphDataQuery(baseOptions: Apollo.QueryHookOptions<GraphDataQuery, GraphDataQueryVariables> & ({ variables: GraphDataQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GraphDataQuery, GraphDataQueryVariables>(GW_GraphDataDocument, options);
      }
export function useGraphDataLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GraphDataQuery, GraphDataQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GraphDataQuery, GraphDataQueryVariables>(GW_GraphDataDocument, options);
        }
export function useGraphDataSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GraphDataQuery, GraphDataQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GraphDataQuery, GraphDataQueryVariables>(GW_GraphDataDocument, options);
        }
export type GraphDataQueryHookResult = ReturnType<typeof useGW_GraphDataQuery>;
export type GraphDataLazyQueryHookResult = ReturnType<typeof useGraphDataLazyQuery>;
export type GraphDataSuspenseQueryHookResult = ReturnType<typeof useGraphDataSuspenseQuery>;
export type GraphDataQueryResult = Apollo.QueryResult<GraphDataQuery, GraphDataQueryVariables>;
export const GW_SearchEntitiesDocument = gql`
    query SearchEntities($query: String!, $limit: Int = 10) {
  searchEntities(query: $query, limit: $limit) {
    id
    type
    label
    description
    properties
    confidence
    source
    investigationId
  }
}
    `;

/**
 * __useSearchEntitiesQuery__
 *
 * To run a query within a React component, call `useGW_SearchEntitiesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGW_SearchEntitiesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGW_SearchEntitiesQuery({
 *   variables: {
 *      query: // value for 'query'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGW_SearchEntitiesQuery(baseOptions: Apollo.QueryHookOptions<SearchEntitiesQuery, SearchEntitiesQueryVariables> & ({ variables: SearchEntitiesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchEntitiesQuery, SearchEntitiesQueryVariables>(GW_SearchEntitiesDocument, options);
      }
export function useSearchEntitiesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchEntitiesQuery, SearchEntitiesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchEntitiesQuery, SearchEntitiesQueryVariables>(GW_SearchEntitiesDocument, options);
        }
export function useSearchEntitiesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SearchEntitiesQuery, SearchEntitiesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SearchEntitiesQuery, SearchEntitiesQueryVariables>(GW_SearchEntitiesDocument, options);
        }
export type SearchEntitiesQueryHookResult = ReturnType<typeof useGW_SearchEntitiesQuery>;
export type SearchEntitiesLazyQueryHookResult = ReturnType<typeof useSearchEntitiesLazyQuery>;
export type SearchEntitiesSuspenseQueryHookResult = ReturnType<typeof useSearchEntitiesSuspenseQuery>;
export type SearchEntitiesQueryResult = Apollo.QueryResult<SearchEntitiesQuery, SearchEntitiesQueryVariables>;
export const GW_EntityDetailsDocument = gql`
    query EntityDetails($entityId: ID!) {
  getEntityDetails(entityId: $entityId) {
    id
    type
    label
    description
    properties
    confidence
    source
    investigationId
    createdBy
    updatedBy
    createdAt
    updatedAt
    attack_ttps
    capec_ttps
    triage_score
    actor_links
  }
}
    `;

/**
 * __useEntityDetailsQuery__
 *
 * To run a query within a React component, call `useGW_EntityDetailsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGW_EntityDetailsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGW_EntityDetailsQuery({
 *   variables: {
 *      entityId: // value for 'entityId'
 *   },
 * });
 */
export function useGW_EntityDetailsQuery(baseOptions: Apollo.QueryHookOptions<EntityDetailsQuery, EntityDetailsQueryVariables> & ({ variables: EntityDetailsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<EntityDetailsQuery, EntityDetailsQueryVariables>(GW_EntityDetailsDocument, options);
      }
export function useEntityDetailsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<EntityDetailsQuery, EntityDetailsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<EntityDetailsQuery, EntityDetailsQueryVariables>(GW_EntityDetailsDocument, options);
        }
export function useEntityDetailsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<EntityDetailsQuery, EntityDetailsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<EntityDetailsQuery, EntityDetailsQueryVariables>(GW_EntityDetailsDocument, options);
        }
export type EntityDetailsQueryHookResult = ReturnType<typeof useGW_EntityDetailsQuery>;
export type EntityDetailsLazyQueryHookResult = ReturnType<typeof useEntityDetailsLazyQuery>;
export type EntityDetailsSuspenseQueryHookResult = ReturnType<typeof useEntityDetailsSuspenseQuery>;
export type EntityDetailsQueryResult = Apollo.QueryResult<EntityDetailsQuery, EntityDetailsQueryVariables>;
export const Gw_GraphDataDocument = gql`
    query GW_GraphData($investigationId: ID!) {
  graphData(investigationId: $investigationId) {
    nodes {
      id
      type
      label
      description
      properties
      confidence
      source
    }
    edges {
      id
      type
      label
      description
      properties
      confidence
      source
      fromEntityId
      toEntityId
    }
    nodeCount
    edgeCount
  }
}
    `;

/**
 * __useGw_GraphDataQuery__
 *
 * To run a query within a React component, call `useGw_GraphDataQuery` and pass it any options that fit your needs.
 * When your component renders, `useGw_GraphDataQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGw_GraphDataQuery({
 *   variables: {
 *      investigationId: // value for 'investigationId'
 *   },
 * });
 */
export function useGw_GraphDataQuery(baseOptions: Apollo.QueryHookOptions<Gw_GraphDataQuery, Gw_GraphDataQueryVariables> & ({ variables: Gw_GraphDataQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Gw_GraphDataQuery, Gw_GraphDataQueryVariables>(Gw_GraphDataDocument, options);
      }
export function useGw_GraphDataLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Gw_GraphDataQuery, Gw_GraphDataQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Gw_GraphDataQuery, Gw_GraphDataQueryVariables>(Gw_GraphDataDocument, options);
        }
export function useGw_GraphDataSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Gw_GraphDataQuery, Gw_GraphDataQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Gw_GraphDataQuery, Gw_GraphDataQueryVariables>(Gw_GraphDataDocument, options);
        }
export type Gw_GraphDataQueryHookResult = ReturnType<typeof useGw_GraphDataQuery>;
export type Gw_GraphDataLazyQueryHookResult = ReturnType<typeof useGw_GraphDataLazyQuery>;
export type Gw_GraphDataSuspenseQueryHookResult = ReturnType<typeof useGw_GraphDataSuspenseQuery>;
export type Gw_GraphDataQueryResult = Apollo.QueryResult<Gw_GraphDataQuery, Gw_GraphDataQueryVariables>;
export const Gw_SearchEntitiesDocument = gql`
    query GW_SearchEntities($query: String!, $limit: Int = 25) {
  searchEntities(query: $query, limit: $limit) {
    id
    type
    label
    description
    properties
    confidence
    source
    investigationId
  }
}
    `;

/**
 * __useGw_SearchEntitiesQuery__
 *
 * To run a query within a React component, call `useGw_SearchEntitiesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGw_SearchEntitiesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGw_SearchEntitiesQuery({
 *   variables: {
 *      query: // value for 'query'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGw_SearchEntitiesQuery(baseOptions: Apollo.QueryHookOptions<Gw_SearchEntitiesQuery, Gw_SearchEntitiesQueryVariables> & ({ variables: Gw_SearchEntitiesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Gw_SearchEntitiesQuery, Gw_SearchEntitiesQueryVariables>(Gw_SearchEntitiesDocument, options);
      }
export function useGw_SearchEntitiesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Gw_SearchEntitiesQuery, Gw_SearchEntitiesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Gw_SearchEntitiesQuery, Gw_SearchEntitiesQueryVariables>(Gw_SearchEntitiesDocument, options);
        }
export function useGw_SearchEntitiesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Gw_SearchEntitiesQuery, Gw_SearchEntitiesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Gw_SearchEntitiesQuery, Gw_SearchEntitiesQueryVariables>(Gw_SearchEntitiesDocument, options);
        }
export type Gw_SearchEntitiesQueryHookResult = ReturnType<typeof useGw_SearchEntitiesQuery>;
export type Gw_SearchEntitiesLazyQueryHookResult = ReturnType<typeof useGw_SearchEntitiesLazyQuery>;
export type Gw_SearchEntitiesSuspenseQueryHookResult = ReturnType<typeof useGw_SearchEntitiesSuspenseQuery>;
export type Gw_SearchEntitiesQueryResult = Apollo.QueryResult<Gw_SearchEntitiesQuery, Gw_SearchEntitiesQueryVariables>;
export const Gw_EntityDetailsDocument = gql`
    query GW_EntityDetails($entityId: ID!) {
  getEntityDetails(entityId: $entityId) {
    id
    type
    label
    description
    properties
    confidence
    source
    investigationId
    createdBy
    updatedBy
    createdAt
    updatedAt
    attack_ttps
    capec_ttps
    triage_score
    actor_links
  }
}
    `;

/**
 * __useGw_EntityDetailsQuery__
 *
 * To run a query within a React component, call `useGw_EntityDetailsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGw_EntityDetailsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGw_EntityDetailsQuery({
 *   variables: {
 *      entityId: // value for 'entityId'
 *   },
 * });
 */
export function useGw_EntityDetailsQuery(baseOptions: Apollo.QueryHookOptions<Gw_EntityDetailsQuery, Gw_EntityDetailsQueryVariables> & ({ variables: Gw_EntityDetailsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Gw_EntityDetailsQuery, Gw_EntityDetailsQueryVariables>(Gw_EntityDetailsDocument, options);
      }
export function useGw_EntityDetailsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Gw_EntityDetailsQuery, Gw_EntityDetailsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Gw_EntityDetailsQuery, Gw_EntityDetailsQueryVariables>(Gw_EntityDetailsDocument, options);
        }
export function useGw_EntityDetailsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Gw_EntityDetailsQuery, Gw_EntityDetailsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Gw_EntityDetailsQuery, Gw_EntityDetailsQueryVariables>(Gw_EntityDetailsDocument, options);
        }
export type Gw_EntityDetailsQueryHookResult = ReturnType<typeof useGw_EntityDetailsQuery>;
export type Gw_EntityDetailsLazyQueryHookResult = ReturnType<typeof useGw_EntityDetailsLazyQuery>;
export type Gw_EntityDetailsSuspenseQueryHookResult = ReturnType<typeof useGw_EntityDetailsSuspenseQuery>;
export type Gw_EntityDetailsQueryResult = Apollo.QueryResult<Gw_EntityDetailsQuery, Gw_EntityDetailsQueryVariables>;
export const GW_MockPresenceDocument = gql`
    query MockPresence($caseId: ID) {
  serverStats {
    uptime
  }
}
    `;

/**
 * __useMockPresenceQuery__
 *
 * To run a query within a React component, call `useGW_MockPresenceQuery` and pass it any options that fit your needs.
 * When your component renders, `useGW_MockPresenceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGW_MockPresenceQuery({
 *   variables: {
 *      caseId: // value for 'caseId'
 *   },
 * });
 */
export function useGW_MockPresenceQuery(baseOptions?: Apollo.QueryHookOptions<MockPresenceQuery, MockPresenceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MockPresenceQuery, MockPresenceQueryVariables>(GW_MockPresenceDocument, options);
      }
export function useMockPresenceLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MockPresenceQuery, MockPresenceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MockPresenceQuery, MockPresenceQueryVariables>(GW_MockPresenceDocument, options);
        }
export function useMockPresenceSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MockPresenceQuery, MockPresenceQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MockPresenceQuery, MockPresenceQueryVariables>(GW_MockPresenceDocument, options);
        }
export type MockPresenceQueryHookResult = ReturnType<typeof useGW_MockPresenceQuery>;
export type MockPresenceLazyQueryHookResult = ReturnType<typeof useMockPresenceLazyQuery>;
export type MockPresenceSuspenseQueryHookResult = ReturnType<typeof useMockPresenceSuspenseQuery>;
export type MockPresenceQueryResult = Apollo.QueryResult<MockPresenceQuery, MockPresenceQueryVariables>;
export const GW_MockReportTemplatesDocument = gql`
    query MockReportTemplates {
  serverStats {
    uptime
    totalInvestigations
  }
}
    `;

/**
 * __useMockReportTemplatesQuery__
 *
 * To run a query within a React component, call `useGW_MockReportTemplatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGW_MockReportTemplatesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGW_MockReportTemplatesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGW_MockReportTemplatesQuery(baseOptions?: Apollo.QueryHookOptions<MockReportTemplatesQuery, MockReportTemplatesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MockReportTemplatesQuery, MockReportTemplatesQueryVariables>(GW_MockReportTemplatesDocument, options);
      }
export function useMockReportTemplatesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MockReportTemplatesQuery, MockReportTemplatesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MockReportTemplatesQuery, MockReportTemplatesQueryVariables>(GW_MockReportTemplatesDocument, options);
        }
export function useMockReportTemplatesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MockReportTemplatesQuery, MockReportTemplatesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MockReportTemplatesQuery, MockReportTemplatesQueryVariables>(GW_MockReportTemplatesDocument, options);
        }
export type MockReportTemplatesQueryHookResult = ReturnType<typeof useGW_MockReportTemplatesQuery>;
export type MockReportTemplatesLazyQueryHookResult = ReturnType<typeof useMockReportTemplatesLazyQuery>;
export type MockReportTemplatesSuspenseQueryHookResult = ReturnType<typeof useMockReportTemplatesSuspenseQuery>;
export type MockReportTemplatesQueryResult = Apollo.QueryResult<MockReportTemplatesQuery, MockReportTemplatesQueryVariables>;
export const GW_MockExportDataDocument = gql`
    query MockExportData($investigationId: ID!) {
  serverStats {
    uptime
  }
}
    `;

/**
 * __useMockExportDataQuery__
 *
 * To run a query within a React component, call `useGW_MockExportDataQuery` and pass it any options that fit your needs.
 * When your component renders, `useGW_MockExportDataQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGW_MockExportDataQuery({
 *   variables: {
 *      investigationId: // value for 'investigationId'
 *   },
 * });
 */
export function useGW_MockExportDataQuery(baseOptions: Apollo.QueryHookOptions<MockExportDataQuery, MockExportDataQueryVariables> & ({ variables: MockExportDataQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MockExportDataQuery, MockExportDataQueryVariables>(GW_MockExportDataDocument, options);
      }
export function useMockExportDataLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MockExportDataQuery, MockExportDataQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MockExportDataQuery, MockExportDataQueryVariables>(GW_MockExportDataDocument, options);
        }
export function useMockExportDataSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MockExportDataQuery, MockExportDataQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MockExportDataQuery, MockExportDataQueryVariables>(GW_MockExportDataDocument, options);
        }
export type MockExportDataQueryHookResult = ReturnType<typeof useGW_MockExportDataQuery>;
export type MockExportDataLazyQueryHookResult = ReturnType<typeof useMockExportDataLazyQuery>;
export type MockExportDataSuspenseQueryHookResult = ReturnType<typeof useMockExportDataSuspenseQuery>;
export type MockExportDataQueryResult = Apollo.QueryResult<MockExportDataQuery, MockExportDataQueryVariables>;
export const GW_PowerSearchEntitiesDocument = gql`
    query PowerSearchEntities($query: String!) {
  searchEntities(query: $query) {
    id
    label
    type
    properties
  }
}
    `;

/**
 * __usePowerSearchEntitiesQuery__
 *
 * To run a query within a React component, call `useGW_PowerSearchEntitiesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGW_PowerSearchEntitiesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGW_PowerSearchEntitiesQuery({
 *   variables: {
 *      query: // value for 'query'
 *   },
 * });
 */
export function useGW_PowerSearchEntitiesQuery(baseOptions: Apollo.QueryHookOptions<PowerSearchEntitiesQuery, PowerSearchEntitiesQueryVariables> & ({ variables: PowerSearchEntitiesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PowerSearchEntitiesQuery, PowerSearchEntitiesQueryVariables>(GW_PowerSearchEntitiesDocument, options);
      }
export function usePowerSearchEntitiesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PowerSearchEntitiesQuery, PowerSearchEntitiesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PowerSearchEntitiesQuery, PowerSearchEntitiesQueryVariables>(GW_PowerSearchEntitiesDocument, options);
        }
export function usePowerSearchEntitiesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PowerSearchEntitiesQuery, PowerSearchEntitiesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PowerSearchEntitiesQuery, PowerSearchEntitiesQueryVariables>(GW_PowerSearchEntitiesDocument, options);
        }
export type PowerSearchEntitiesQueryHookResult = ReturnType<typeof useGW_PowerSearchEntitiesQuery>;
export type PowerSearchEntitiesLazyQueryHookResult = ReturnType<typeof usePowerSearchEntitiesLazyQuery>;
export type PowerSearchEntitiesSuspenseQueryHookResult = ReturnType<typeof usePowerSearchEntitiesSuspenseQuery>;
export type PowerSearchEntitiesQueryResult = Apollo.QueryResult<PowerSearchEntitiesQuery, PowerSearchEntitiesQueryVariables>;
export const GW_MockSavedSearchesDocument = gql`
    query MockSavedSearches {
  serverStats {
    uptime
    totalInvestigations
  }
}
    `;

/**
 * __useMockSavedSearchesQuery__
 *
 * To run a query within a React component, call `useGW_MockSavedSearchesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGW_MockSavedSearchesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGW_MockSavedSearchesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGW_MockSavedSearchesQuery(baseOptions?: Apollo.QueryHookOptions<MockSavedSearchesQuery, MockSavedSearchesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MockSavedSearchesQuery, MockSavedSearchesQueryVariables>(GW_MockSavedSearchesDocument, options);
      }
export function useMockSavedSearchesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MockSavedSearchesQuery, MockSavedSearchesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MockSavedSearchesQuery, MockSavedSearchesQueryVariables>(GW_MockSavedSearchesDocument, options);
        }
export function useMockSavedSearchesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MockSavedSearchesQuery, MockSavedSearchesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MockSavedSearchesQuery, MockSavedSearchesQueryVariables>(GW_MockSavedSearchesDocument, options);
        }
export type MockSavedSearchesQueryHookResult = ReturnType<typeof useGW_MockSavedSearchesQuery>;
export type MockSavedSearchesLazyQueryHookResult = ReturnType<typeof useMockSavedSearchesLazyQuery>;
export type MockSavedSearchesSuspenseQueryHookResult = ReturnType<typeof useMockSavedSearchesSuspenseQuery>;
export type MockSavedSearchesQueryResult = Apollo.QueryResult<MockSavedSearchesQuery, MockSavedSearchesQueryVariables>;
export const GW_ServerStatsQueryDocument = gql`
    query ServerStatsQuery {
  serverStats {
    uptime
    totalInvestigations
    totalEntities
    totalRelationships
    databaseStatus {
      redis
      postgres
      neo4j
    }
  }
}
    `;

/**
 * __useServerStatsQuery__
 *
 * To run a query within a React component, call `useDB_ServerStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDB_ServerStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDB_ServerStatsQuery({
 *   variables: {
 *   },
 * });
 */
export function useDB_ServerStatsQuery(baseOptions?: Apollo.QueryHookOptions<ServerStatsQuery, ServerStatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ServerStatsQuery, ServerStatsQueryVariables>(GW_ServerStatsQueryDocument, options);
      }
export function useServerStatsQueryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ServerStatsQuery, ServerStatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ServerStatsQuery, ServerStatsQueryVariables>(GW_ServerStatsQueryDocument, options);
        }
export function useServerStatsQuerySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ServerStatsQuery, ServerStatsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ServerStatsQuery, ServerStatsQueryVariables>(GW_ServerStatsQueryDocument, options);
        }
export type ServerStatsQueryHookResult = ReturnType<typeof useDB_ServerStatsQuery>;
export type ServerStatsQueryLazyQueryHookResult = ReturnType<typeof useServerStatsQueryLazyQuery>;
export type ServerStatsQuerySuspenseQueryHookResult = ReturnType<typeof useServerStatsQuerySuspenseQuery>;
export type ServerStatsQueryQueryResult = Apollo.QueryResult<ServerStatsQuery, ServerStatsQueryVariables>;
export const GW_HealthCheckDocument = gql`
    query HealthCheck {
  health
}
    `;

/**
 * __useHealthCheckQuery__
 *
 * To run a query within a React component, call `useGW_HealthCheckQuery` and pass it any options that fit your needs.
 * When your component renders, `useGW_HealthCheckQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGW_HealthCheckQuery({
 *   variables: {
 *   },
 * });
 */
export function useGW_HealthCheckQuery(baseOptions?: Apollo.QueryHookOptions<HealthCheckQuery, HealthCheckQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<HealthCheckQuery, HealthCheckQueryVariables>(GW_HealthCheckDocument, options);
      }
export function useHealthCheckLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<HealthCheckQuery, HealthCheckQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<HealthCheckQuery, HealthCheckQueryVariables>(GW_HealthCheckDocument, options);
        }
export function useHealthCheckSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<HealthCheckQuery, HealthCheckQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<HealthCheckQuery, HealthCheckQueryVariables>(GW_HealthCheckDocument, options);
        }
export type HealthCheckQueryHookResult = ReturnType<typeof useGW_HealthCheckQuery>;
export type HealthCheckLazyQueryHookResult = ReturnType<typeof useHealthCheckLazyQuery>;
export type HealthCheckSuspenseQueryHookResult = ReturnType<typeof useHealthCheckSuspenseQuery>;
export type HealthCheckQueryResult = Apollo.QueryResult<HealthCheckQuery, HealthCheckQueryVariables>;
export const GW_ThreatAnalysisDocument = gql`
    query ThreatAnalysis($entityId: ID!) {
  threatAnalysis(entityId: $entityId) {
    entityId
    riskScore
    threatLevel
    mitreAttacks {
      technique
      tactic
      description
      severity
      confidence
    }
    vulnerabilities {
      cve
      severity
      description
      exploitable
      patchAvailable
    }
    recommendations
    lastUpdated
  }
}
    `;

/**
 * __useThreatAnalysisQuery__
 *
 * To run a query within a React component, call `useGW_ThreatAnalysisQuery` and pass it any options that fit your needs.
 * When your component renders, `useGW_ThreatAnalysisQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGW_ThreatAnalysisQuery({
 *   variables: {
 *      entityId: // value for 'entityId'
 *   },
 * });
 */
export function useGW_ThreatAnalysisQuery(baseOptions: Apollo.QueryHookOptions<ThreatAnalysisQuery, ThreatAnalysisQueryVariables> & ({ variables: ThreatAnalysisQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ThreatAnalysisQuery, ThreatAnalysisQueryVariables>(GW_ThreatAnalysisDocument, options);
      }
export function useThreatAnalysisLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ThreatAnalysisQuery, ThreatAnalysisQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ThreatAnalysisQuery, ThreatAnalysisQueryVariables>(GW_ThreatAnalysisDocument, options);
        }
export function useThreatAnalysisSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ThreatAnalysisQuery, ThreatAnalysisQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ThreatAnalysisQuery, ThreatAnalysisQueryVariables>(GW_ThreatAnalysisDocument, options);
        }
export type ThreatAnalysisQueryHookResult = ReturnType<typeof useGW_ThreatAnalysisQuery>;
export type ThreatAnalysisLazyQueryHookResult = ReturnType<typeof useThreatAnalysisLazyQuery>;
export type ThreatAnalysisSuspenseQueryHookResult = ReturnType<typeof useThreatAnalysisSuspenseQuery>;
export type ThreatAnalysisQueryResult = Apollo.QueryResult<ThreatAnalysisQuery, ThreatAnalysisQueryVariables>;
export const GW_TimelineEventsDocument = gql`
    query TimelineEvents($investigationId: ID!, $startDate: String, $endDate: String) {
  timelineEvents(
    investigationId: $investigationId
    startDate: $startDate
    endDate: $endDate
  ) {
    id
    timestamp
    eventType
    entityId
    description
    severity
    source
    metadata
  }
}
    `;

/**
 * __useTimelineEventsQuery__
 *
 * To run a query within a React component, call `useGW_TimelineEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGW_TimelineEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGW_TimelineEventsQuery({
 *   variables: {
 *      investigationId: // value for 'investigationId'
 *      startDate: // value for 'startDate'
 *      endDate: // value for 'endDate'
 *   },
 * });
 */
export function useGW_TimelineEventsQuery(baseOptions: Apollo.QueryHookOptions<TimelineEventsQuery, TimelineEventsQueryVariables> & ({ variables: TimelineEventsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TimelineEventsQuery, TimelineEventsQueryVariables>(GW_TimelineEventsDocument, options);
      }
export function useTimelineEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TimelineEventsQuery, TimelineEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TimelineEventsQuery, TimelineEventsQueryVariables>(GW_TimelineEventsDocument, options);
        }
export function useTimelineEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TimelineEventsQuery, TimelineEventsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TimelineEventsQuery, TimelineEventsQueryVariables>(GW_TimelineEventsDocument, options);
        }
export type TimelineEventsQueryHookResult = ReturnType<typeof useGW_TimelineEventsQuery>;
export type TimelineEventsLazyQueryHookResult = ReturnType<typeof useTimelineEventsLazyQuery>;
export type TimelineEventsSuspenseQueryHookResult = ReturnType<typeof useTimelineEventsSuspenseQuery>;
export type TimelineEventsQueryResult = Apollo.QueryResult<TimelineEventsQuery, TimelineEventsQueryVariables>;