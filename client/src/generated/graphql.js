"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GW_TimelineEventsDocument = exports.GW_ThreatAnalysisDocument = exports.GW_HealthCheckDocument = exports.GW_ServerStatsQueryDocument = exports.GW_MockSavedSearchesDocument = exports.GW_PowerSearchEntitiesDocument = exports.GW_MockExportDataDocument = exports.GW_MockReportTemplatesDocument = exports.GW_MockPresenceDocument = exports.Gw_EntityDetailsDocument = exports.Gw_SearchEntitiesDocument = exports.Gw_GraphDataDocument = exports.GW_EntityDetailsDocument = exports.GW_SearchEntitiesDocument = exports.GW_GraphDataDocument = exports.GW_MockKShortestPathsDocument = exports.GW_MockGraphStreamingDocument = exports.GW_EntityEnrichmentDocument = exports.DB_InvestigationsDocument = exports.DB_ServerStatsDocument = exports.GW_MockCommentsDocument = exports.GW_ActivityFeedDataDocument = void 0;
exports.useGW_ActivityFeedDataQuery = useGW_ActivityFeedDataQuery;
exports.useActivityFeedDataLazyQuery = useActivityFeedDataLazyQuery;
exports.useActivityFeedDataSuspenseQuery = useActivityFeedDataSuspenseQuery;
exports.useGW_MockCommentsQuery = useGW_MockCommentsQuery;
exports.useMockCommentsLazyQuery = useMockCommentsLazyQuery;
exports.useMockCommentsSuspenseQuery = useMockCommentsSuspenseQuery;
exports.useDB_ServerStatsQuery = useDB_ServerStatsQuery;
exports.useServerStatsLazyQuery = useServerStatsLazyQuery;
exports.useServerStatsSuspenseQuery = useServerStatsSuspenseQuery;
exports.useDB_InvestigationsQuery = useDB_InvestigationsQuery;
exports.useInvestigationsLazyQuery = useInvestigationsLazyQuery;
exports.useInvestigationsSuspenseQuery = useInvestigationsSuspenseQuery;
exports.useGW_EntityEnrichmentQuery = useGW_EntityEnrichmentQuery;
exports.useEntityEnrichmentLazyQuery = useEntityEnrichmentLazyQuery;
exports.useEntityEnrichmentSuspenseQuery = useEntityEnrichmentSuspenseQuery;
exports.useGW_MockGraphStreamingQuery = useGW_MockGraphStreamingQuery;
exports.useMockGraphStreamingLazyQuery = useMockGraphStreamingLazyQuery;
exports.useMockGraphStreamingSuspenseQuery = useMockGraphStreamingSuspenseQuery;
exports.useGW_MockKShortestPathsQuery = useGW_MockKShortestPathsQuery;
exports.useMockKShortestPathsLazyQuery = useMockKShortestPathsLazyQuery;
exports.useMockKShortestPathsSuspenseQuery = useMockKShortestPathsSuspenseQuery;
exports.useGW_GraphDataQuery = useGW_GraphDataQuery;
exports.useGraphDataLazyQuery = useGraphDataLazyQuery;
exports.useGraphDataSuspenseQuery = useGraphDataSuspenseQuery;
exports.useGW_SearchEntitiesQuery = useGW_SearchEntitiesQuery;
exports.useSearchEntitiesLazyQuery = useSearchEntitiesLazyQuery;
exports.useSearchEntitiesSuspenseQuery = useSearchEntitiesSuspenseQuery;
exports.useGW_EntityDetailsQuery = useGW_EntityDetailsQuery;
exports.useEntityDetailsLazyQuery = useEntityDetailsLazyQuery;
exports.useEntityDetailsSuspenseQuery = useEntityDetailsSuspenseQuery;
exports.useGw_GraphDataQuery = useGw_GraphDataQuery;
exports.useGw_GraphDataLazyQuery = useGw_GraphDataLazyQuery;
exports.useGw_GraphDataSuspenseQuery = useGw_GraphDataSuspenseQuery;
exports.useGw_SearchEntitiesQuery = useGw_SearchEntitiesQuery;
exports.useGw_SearchEntitiesLazyQuery = useGw_SearchEntitiesLazyQuery;
exports.useGw_SearchEntitiesSuspenseQuery = useGw_SearchEntitiesSuspenseQuery;
exports.useGw_EntityDetailsQuery = useGw_EntityDetailsQuery;
exports.useGw_EntityDetailsLazyQuery = useGw_EntityDetailsLazyQuery;
exports.useGw_EntityDetailsSuspenseQuery = useGw_EntityDetailsSuspenseQuery;
exports.useGW_MockPresenceQuery = useGW_MockPresenceQuery;
exports.useMockPresenceLazyQuery = useMockPresenceLazyQuery;
exports.useMockPresenceSuspenseQuery = useMockPresenceSuspenseQuery;
exports.useGW_MockReportTemplatesQuery = useGW_MockReportTemplatesQuery;
exports.useMockReportTemplatesLazyQuery = useMockReportTemplatesLazyQuery;
exports.useMockReportTemplatesSuspenseQuery = useMockReportTemplatesSuspenseQuery;
exports.useGW_MockExportDataQuery = useGW_MockExportDataQuery;
exports.useMockExportDataLazyQuery = useMockExportDataLazyQuery;
exports.useMockExportDataSuspenseQuery = useMockExportDataSuspenseQuery;
exports.useGW_PowerSearchEntitiesQuery = useGW_PowerSearchEntitiesQuery;
exports.usePowerSearchEntitiesLazyQuery = usePowerSearchEntitiesLazyQuery;
exports.usePowerSearchEntitiesSuspenseQuery = usePowerSearchEntitiesSuspenseQuery;
exports.useGW_MockSavedSearchesQuery = useGW_MockSavedSearchesQuery;
exports.useMockSavedSearchesLazyQuery = useMockSavedSearchesLazyQuery;
exports.useMockSavedSearchesSuspenseQuery = useMockSavedSearchesSuspenseQuery;
exports.useGW_ServerStatsQuery = useGW_ServerStatsQuery;
exports.useServerStatsQueryLazyQuery = useServerStatsQueryLazyQuery;
exports.useServerStatsQuerySuspenseQuery = useServerStatsQuerySuspenseQuery;
exports.useGW_HealthCheckQuery = useGW_HealthCheckQuery;
exports.useHealthCheckLazyQuery = useHealthCheckLazyQuery;
exports.useHealthCheckSuspenseQuery = useHealthCheckSuspenseQuery;
exports.useGW_ThreatAnalysisQuery = useGW_ThreatAnalysisQuery;
exports.useThreatAnalysisLazyQuery = useThreatAnalysisLazyQuery;
exports.useThreatAnalysisSuspenseQuery = useThreatAnalysisSuspenseQuery;
exports.useGW_TimelineEventsQuery = useGW_TimelineEventsQuery;
exports.useTimelineEventsLazyQuery = useTimelineEventsLazyQuery;
exports.useTimelineEventsSuspenseQuery = useTimelineEventsSuspenseQuery;
/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * This file is generated by GraphQL Code Generator
 * To regenerate: pnpm graphql:codegen
 *
 * @ts-nocheck is used because this is generated code that may have type issues
 * based on the source GraphQL schema. Regenerate to fix type errors.
 */
// @ts-nocheck
const client_1 = require("@apollo/client");
const Apollo = __importStar(require("@apollo/client"));
const defaultOptions = {};
exports.GW_ActivityFeedDataDocument = (0, client_1.gql) `
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
function useGW_ActivityFeedDataQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GW_ActivityFeedDataDocument, options);
}
function useActivityFeedDataLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GW_ActivityFeedDataDocument, options);
}
function useActivityFeedDataSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.GW_ActivityFeedDataDocument, options);
}
exports.GW_MockCommentsDocument = (0, client_1.gql) `
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
function useGW_MockCommentsQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GW_MockCommentsDocument, options);
}
function useMockCommentsLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GW_MockCommentsDocument, options);
}
function useMockCommentsSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.GW_MockCommentsDocument, options);
}
exports.DB_ServerStatsDocument = (0, client_1.gql) `
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
function useDB_ServerStatsQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.DB_ServerStatsDocument, options);
}
function useServerStatsLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.DB_ServerStatsDocument, options);
}
function useServerStatsSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.DB_ServerStatsDocument, options);
}
exports.DB_InvestigationsDocument = (0, client_1.gql) `
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
function useDB_InvestigationsQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.DB_InvestigationsDocument, options);
}
function useInvestigationsLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.DB_InvestigationsDocument, options);
}
function useInvestigationsSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.DB_InvestigationsDocument, options);
}
exports.GW_EntityEnrichmentDocument = (0, client_1.gql) `
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
function useGW_EntityEnrichmentQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GW_EntityEnrichmentDocument, options);
}
function useEntityEnrichmentLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GW_EntityEnrichmentDocument, options);
}
function useEntityEnrichmentSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.GW_EntityEnrichmentDocument, options);
}
exports.GW_MockGraphStreamingDocument = (0, client_1.gql) `
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
function useGW_MockGraphStreamingQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GW_MockGraphStreamingDocument, options);
}
function useMockGraphStreamingLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GW_MockGraphStreamingDocument, options);
}
function useMockGraphStreamingSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.GW_MockGraphStreamingDocument, options);
}
exports.GW_MockKShortestPathsDocument = (0, client_1.gql) `
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
function useGW_MockKShortestPathsQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GW_MockKShortestPathsDocument, options);
}
function useMockKShortestPathsLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GW_MockKShortestPathsDocument, options);
}
function useMockKShortestPathsSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.GW_MockKShortestPathsDocument, options);
}
exports.GW_GraphDataDocument = (0, client_1.gql) `
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
function useGW_GraphDataQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GW_GraphDataDocument, options);
}
function useGraphDataLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GW_GraphDataDocument, options);
}
function useGraphDataSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.GW_GraphDataDocument, options);
}
exports.GW_SearchEntitiesDocument = (0, client_1.gql) `
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
function useGW_SearchEntitiesQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GW_SearchEntitiesDocument, options);
}
function useSearchEntitiesLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GW_SearchEntitiesDocument, options);
}
function useSearchEntitiesSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.GW_SearchEntitiesDocument, options);
}
exports.GW_EntityDetailsDocument = (0, client_1.gql) `
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
function useGW_EntityDetailsQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GW_EntityDetailsDocument, options);
}
function useEntityDetailsLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GW_EntityDetailsDocument, options);
}
function useEntityDetailsSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.GW_EntityDetailsDocument, options);
}
exports.Gw_GraphDataDocument = (0, client_1.gql) `
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
function useGw_GraphDataQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.Gw_GraphDataDocument, options);
}
function useGw_GraphDataLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.Gw_GraphDataDocument, options);
}
function useGw_GraphDataSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.Gw_GraphDataDocument, options);
}
exports.Gw_SearchEntitiesDocument = (0, client_1.gql) `
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
function useGw_SearchEntitiesQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.Gw_SearchEntitiesDocument, options);
}
function useGw_SearchEntitiesLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.Gw_SearchEntitiesDocument, options);
}
function useGw_SearchEntitiesSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.Gw_SearchEntitiesDocument, options);
}
exports.Gw_EntityDetailsDocument = (0, client_1.gql) `
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
function useGw_EntityDetailsQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.Gw_EntityDetailsDocument, options);
}
function useGw_EntityDetailsLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.Gw_EntityDetailsDocument, options);
}
function useGw_EntityDetailsSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.Gw_EntityDetailsDocument, options);
}
exports.GW_MockPresenceDocument = (0, client_1.gql) `
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
function useGW_MockPresenceQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GW_MockPresenceDocument, options);
}
function useMockPresenceLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GW_MockPresenceDocument, options);
}
function useMockPresenceSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.GW_MockPresenceDocument, options);
}
exports.GW_MockReportTemplatesDocument = (0, client_1.gql) `
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
function useGW_MockReportTemplatesQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GW_MockReportTemplatesDocument, options);
}
function useMockReportTemplatesLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GW_MockReportTemplatesDocument, options);
}
function useMockReportTemplatesSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.GW_MockReportTemplatesDocument, options);
}
exports.GW_MockExportDataDocument = (0, client_1.gql) `
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
function useGW_MockExportDataQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GW_MockExportDataDocument, options);
}
function useMockExportDataLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GW_MockExportDataDocument, options);
}
function useMockExportDataSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.GW_MockExportDataDocument, options);
}
exports.GW_PowerSearchEntitiesDocument = (0, client_1.gql) `
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
function useGW_PowerSearchEntitiesQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GW_PowerSearchEntitiesDocument, options);
}
function usePowerSearchEntitiesLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GW_PowerSearchEntitiesDocument, options);
}
function usePowerSearchEntitiesSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.GW_PowerSearchEntitiesDocument, options);
}
exports.GW_MockSavedSearchesDocument = (0, client_1.gql) `
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
function useGW_MockSavedSearchesQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GW_MockSavedSearchesDocument, options);
}
function useMockSavedSearchesLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GW_MockSavedSearchesDocument, options);
}
function useMockSavedSearchesSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.GW_MockSavedSearchesDocument, options);
}
exports.GW_ServerStatsQueryDocument = (0, client_1.gql) `
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
 * __useGWServerStatsQuery__
 *
 * To run a query within a React component, call `useGW_ServerStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGW_ServerStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGW_ServerStatsQuery({
 *   variables: {
 *   },
 * });
 */
function useGW_ServerStatsQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GW_ServerStatsQueryDocument, options);
}
function useServerStatsQueryLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GW_ServerStatsQueryDocument, options);
}
function useServerStatsQuerySuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.GW_ServerStatsQueryDocument, options);
}
exports.GW_HealthCheckDocument = (0, client_1.gql) `
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
function useGW_HealthCheckQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GW_HealthCheckDocument, options);
}
function useHealthCheckLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GW_HealthCheckDocument, options);
}
function useHealthCheckSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.GW_HealthCheckDocument, options);
}
exports.GW_ThreatAnalysisDocument = (0, client_1.gql) `
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
function useGW_ThreatAnalysisQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GW_ThreatAnalysisDocument, options);
}
function useThreatAnalysisLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GW_ThreatAnalysisDocument, options);
}
function useThreatAnalysisSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.GW_ThreatAnalysisDocument, options);
}
exports.GW_TimelineEventsDocument = (0, client_1.gql) `
  query TimelineEvents($investigationId: ID!, $startDate: String, $endDate: String) {
    timelineEvents(investigationId: $investigationId, startDate: $startDate, endDate: $endDate) {
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
function useGW_TimelineEventsQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useQuery(exports.GW_TimelineEventsDocument, options);
}
function useTimelineEventsLazyQuery(baseOptions) {
    const options = { ...defaultOptions, ...baseOptions };
    return Apollo.useLazyQuery(exports.GW_TimelineEventsDocument, options);
}
function useTimelineEventsSuspenseQuery(baseOptions) {
    const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
    return Apollo.useSuspenseQuery(exports.GW_TimelineEventsDocument, options);
}
// @ts-nocheck
