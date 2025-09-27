export const typeDefs = `#graphql
  scalar JSON

  type SearchHighlight {
    field: String!
    snippets: [String!]!
  }

  type SearchRelatedNode {
    id: ID!
    type: String!
    properties: JSON
  }

  type SearchRun {
    runId: ID!
    status: String
    startedAt: String
    runbook: String
    tenant: String
    relevanceScore: Float
    highlights: [SearchHighlight!]!
    relatedNodes: [SearchRelatedNode!]!
    source: JSON
  }

  type SearchResultSet {
    total: Int!
    took: Int!
    timedOut: Boolean!
    results: [SearchRun!]!
    suggestions: [String!]
    facets: JSON
  }

  input DateRangeInput {
    field: String
    from: String
    to: String
  }

  input AdvancedSearchInput {
    tenantId: String!
    query: String
    statuses: [String!]
    stepTypes: [String!]
    dateRange: DateRangeInput
    nodeTypes: [String!]
    minRelevance: Float
    limit: Int
    offset: Int
  }

  type Query {
    advancedSearch(input: AdvancedSearchInput!): SearchResultSet!
  }
`;
