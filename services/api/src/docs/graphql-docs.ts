/**
 * GraphQL Schema Documentation Enhancement
 *
 * Provides automated documentation generation for GraphQL schema
 * with descriptions and usage examples
 *
 * MIT License - Copyright (c) 2025 IntelGraph
 */

import { typeDefs } from '../graphql/schema.js';
import { print } from 'graphql';
import type { Router, Request, Response } from 'express';
import { Router as ExpressRouter } from 'express';

export const graphqlDocsRouter = ExpressRouter() as Router;

/**
 * GraphQL Schema Documentation with Examples
 */
const GRAPHQL_DOCS = {
  overview: {
    title: 'IntelGraph GraphQL API',
    description: `
      The IntelGraph GraphQL API provides powerful graph analytics and intelligence analysis capabilities.

      ## Key Features:
      - **Entity Management**: Create, update, and query graph entities (people, organizations, locations, etc.)
      - **Relationship Mapping**: Build and analyze connections between entities
      - **Investigation Management**: Organize entities into investigations with hypotheses and timelines
      - **Advanced Analytics**: Centrality analysis, community detection, pathfinding algorithms
      - **AI Copilot**: Natural language query generation and intelligent assistance
      - **Real-time Updates**: WebSocket subscriptions for live data changes

      ## Authentication:
      All GraphQL requests require JWT Bearer token authentication via the Authorization header.

      ## Endpoint:
      POST /graphql

      ## Content-Type:
      application/json
    `,
  },

  examples: {
    queries: [
      {
        name: 'Get Entity by ID',
        description: 'Retrieve a single entity with its relationships',
        query: `query GetEntity($id: ID!) {
  entity(id: $id) {
    id
    type
    name
    description
    properties
    confidence
    createdAt
    outgoingRelationships {
      id
      type
      target {
        id
        name
        type
      }
    }
    incomingRelationships {
      id
      type
      source {
        id
        name
        type
      }
    }
    centrality {
      betweenness
      closeness
      degree
      eigenvector
      pagerank
    }
  }
}`,
        variables: {
          id: 'entity123',
        },
      },
      {
        name: 'Search Entities',
        description: 'Full-text search across entities with filtering',
        query: `query SearchEntities($query: String!, $filter: EntityFilter) {
  searchEntities(query: $query, filter: $filter) {
    id
    type
    name
    description
    confidence
    createdAt
  }
}`,
        variables: {
          query: 'John Doe',
          filter: {
            types: ['PERSON', 'ORGANIZATION'],
            confidence: { min: 0.7 },
          },
        },
      },
      {
        name: 'Find Paths Between Entities',
        description: 'Discover connections between two entities using graph algorithms',
        query: `query FindPaths($input: PathfindingInput!) {
  findPaths(input: $input) {
    paths {
      nodes {
        id
        name
        type
      }
      relationships {
        id
        type
      }
      length
      score
    }
    executionTime
    totalPaths
  }
}`,
        variables: {
          input: {
            sourceId: 'person1',
            targetId: 'person2',
            algorithm: 'SHORTEST_PATH',
            maxDepth: 6,
          },
        },
      },
      {
        name: 'Centrality Analysis',
        description: 'Analyze entity importance in the graph',
        query: `query CentralityAnalysis($entityIds: [ID!]) {
  centralityAnalysis(entityIds: $entityIds) {
    id
    name
    type
    centrality {
      betweenness
      closeness
      degree
      eigenvector
      pagerank
    }
  }
}`,
        variables: {
          entityIds: ['e1', 'e2', 'e3'],
        },
      },
      {
        name: 'Community Detection',
        description: 'Discover communities/clusters in the graph',
        query: `query CommunityDetection($entityIds: [ID!], $algorithm: String) {
  communityDetection(entityIds: $entityIds, algorithm: $algorithm)
}`,
        variables: {
          entityIds: [],
          algorithm: 'louvain',
        },
      },
      {
        name: 'AI Copilot Query Generation',
        description: 'Generate queries from natural language',
        query: `query GenerateQuery($naturalLanguage: String!) {
  generateQuery(naturalLanguage: $naturalLanguage) {
    id
    naturalLanguage
    generatedQuery
    queryType
    confidence
    explanation
    preview
  }
}`,
        variables: {
          naturalLanguage: 'Show me all people connected to organization XYZ',
        },
      },
      {
        name: 'Ask Copilot',
        description: 'Ask questions about your investigation data',
        query: `query AskCopilot($question: String!, $context: [ID!]) {
  askCopilot(question: $question, context: $context) {
    answer
    confidence
    citations {
      text
      source {
        name
        type
      }
      relevance
    }
    followUpQuestions
  }
}`,
        variables: {
          question: 'What are the key connections in this investigation?',
          context: ['inv123'],
        },
      },
      {
        name: 'Get Investigation',
        description: 'Retrieve investigation with all associated data',
        query: `query GetInvestigation($id: ID!) {
  investigation(id: $id) {
    id
    name
    description
    status
    priority
    createdAt
    assignedTo {
      id
      email
      name
    }
    entities {
      id
      name
      type
    }
    relationships {
      id
      type
      source {
        id
        name
      }
      target {
        id
        name
      }
    }
    hypotheses {
      id
      title
      confidence
      status
    }
    timeline {
      id
      timestamp
      title
      description
    }
    summary {
      entityCount
      relationshipCount
      keyFindings
      riskScore
    }
  }
}`,
        variables: {
          id: 'inv123',
        },
      },
    ],

    mutations: [
      {
        name: 'Create Entity',
        description: 'Create a new entity in the graph',
        query: `mutation CreateEntity($input: CreateEntityInput!) {
  createEntity(input: $input) {
    id
    type
    name
    description
    properties
    confidence
    createdAt
    createdBy {
      id
      email
    }
  }
}`,
        variables: {
          input: {
            type: 'PERSON',
            name: 'John Doe',
            description: 'Subject of investigation',
            properties: {
              dateOfBirth: '1980-01-01',
              nationality: 'US',
            },
            confidence: 0.95,
            sourceIds: ['source1'],
          },
        },
      },
      {
        name: 'Create Relationship',
        description: 'Create a relationship between two entities',
        query: `mutation CreateRelationship($input: CreateRelationshipInput!) {
  createRelationship(input: $input) {
    id
    type
    source {
      id
      name
    }
    target {
      id
      name
    }
    properties
    confidence
    createdAt
  }
}`,
        variables: {
          input: {
            type: 'WORKS_FOR',
            sourceId: 'person1',
            targetId: 'org1',
            properties: {
              position: 'CEO',
              startDate: '2020-01-01',
            },
            confidence: 1.0,
            sourceIds: ['source1'],
          },
        },
      },
      {
        name: 'Create Investigation',
        description: 'Start a new investigation',
        query: `mutation CreateInvestigation($input: CreateInvestigationInput!) {
  createInvestigation(input: $input) {
    id
    name
    description
    status
    priority
    createdAt
    assignedTo {
      id
      email
    }
  }
}`,
        variables: {
          input: {
            name: 'Financial Fraud Investigation',
            description: 'Investigating suspicious transaction patterns',
            priority: 'HIGH',
            assignedTo: ['user1', 'user2'],
          },
        },
      },
      {
        name: 'Create Hypothesis',
        description: 'Add a hypothesis to an investigation',
        query: `mutation CreateHypothesis($investigationId: ID!, $title: String!, $description: String!) {
  createHypothesis(
    investigationId: $investigationId
    title: $title
    description: $description
  ) {
    id
    title
    description
    confidence
    status
    createdAt
    createdBy {
      email
    }
  }
}`,
        variables: {
          investigationId: 'inv123',
          title: 'Subject is involved in money laundering',
          description: 'Multiple suspicious transactions to offshore accounts',
        },
      },
      {
        name: 'Bulk Create Entities',
        description: 'Create multiple entities in a single operation',
        query: `mutation BulkCreateEntities($entities: [CreateEntityInput!]!) {
  bulkCreateEntities(entities: $entities) {
    id
    name
    type
    confidence
  }
}`,
        variables: {
          entities: [
            {
              type: 'PERSON',
              name: 'Alice Smith',
              confidence: 0.9,
              sourceIds: ['source1'],
            },
            {
              type: 'ORGANIZATION',
              name: 'Acme Corp',
              confidence: 0.95,
              sourceIds: ['source1'],
            },
          ],
        },
      },
      {
        name: 'Update Entity',
        description: 'Update entity properties',
        query: `mutation UpdateEntity($id: ID!, $input: UpdateEntityInput!) {
  updateEntity(id: $id, input: $input) {
    id
    name
    description
    properties
    confidence
    updatedAt
  }
}`,
        variables: {
          id: 'entity123',
          input: {
            description: 'Updated description',
            confidence: 0.98,
            properties: {
              verified: true,
            },
          },
        },
      },
      {
        name: 'Merge Entities',
        description: 'Merge duplicate entities into one',
        query: `mutation MergeEntities($sourceId: ID!, $targetId: ID!) {
  mergeEntities(sourceId: $sourceId, targetId: $targetId) {
    id
    name
    type
    properties
    confidence
  }
}`,
        variables: {
          sourceId: 'entity1',
          targetId: 'entity2',
        },
      },
    ],

    subscriptions: [
      {
        name: 'Entity Updates',
        description: 'Subscribe to entity changes in real-time',
        query: `subscription EntityUpdated($investigationId: ID) {
  entityUpdated(investigationId: $investigationId) {
    id
    type
    name
    updatedAt
  }
}`,
        variables: {
          investigationId: 'inv123',
        },
      },
      {
        name: 'Relationship Updates',
        description: 'Subscribe to relationship changes',
        query: `subscription RelationshipUpdated($investigationId: ID) {
  relationshipUpdated(investigationId: $investigationId) {
    id
    type
    source {
      id
      name
    }
    target {
      id
      name
    }
    updatedAt
  }
}`,
        variables: {
          investigationId: 'inv123',
        },
      },
      {
        name: 'Investigation Updates',
        description: 'Subscribe to investigation status changes',
        query: `subscription InvestigationUpdated($id: ID!) {
  investigationUpdated(id: $id) {
    id
    name
    status
    updatedAt
  }
}`,
        variables: {
          id: 'inv123',
        },
      },
      {
        name: 'Analysis Completion',
        description: 'Subscribe to analytics job completion events',
        query: `subscription AnalysisCompleted($jobId: ID!) {
  analysisCompleted(jobId: $jobId)
}`,
        variables: {
          jobId: 'job123',
        },
      },
    ],
  },

  bestPractices: [
    {
      title: 'Use Persisted Queries',
      description: 'For production applications, use persisted queries to improve security and performance. Register your queries ahead of time and reference them by ID.',
    },
    {
      title: 'Request Only What You Need',
      description: 'GraphQL allows you to request exactly the fields you need. Avoid over-fetching by carefully selecting fields.',
    },
    {
      title: 'Leverage Fragments',
      description: 'Use GraphQL fragments to reuse common field selections across queries.',
    },
    {
      title: 'Handle Errors Gracefully',
      description: 'GraphQL can return partial results. Always check both the data and errors fields in responses.',
    },
    {
      title: 'Use Variables',
      description: 'Always use variables for dynamic values instead of string interpolation to prevent injection attacks.',
    },
    {
      title: 'Monitor Query Complexity',
      description: 'Be aware of query complexity limits. Deeply nested queries may be rejected by the server.',
    },
  ],
};

/**
 * Serve GraphQL documentation JSON
 */
graphqlDocsRouter.get('/graphql-docs', (_req: Request, res: Response) => {
  res.json(GRAPHQL_DOCS);
});

/**
 * Serve GraphQL schema SDL
 */
graphqlDocsRouter.get('/graphql-schema', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(print(typeDefs));
});

/**
 * Serve GraphQL Playground/Explorer HTML
 */
graphqlDocsRouter.get('/graphql-playground', (_req: Request, res: Response) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>IntelGraph GraphQL Playground</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    #embedded-sandbox {
      height: 100vh;
      width: 100%;
    }
  </style>
</head>
<body>
  <div id="embedded-sandbox"></div>
  <script src="https://embeddable-sandbox.cdn.apollographql.com/_latest/embeddable-sandbox.umd.production.min.js"></script>
  <script>
    new window.EmbeddedSandbox({
      target: '#embedded-sandbox',
      initialEndpoint: '${_req.protocol}://${_req.get('host')}/graphql',
      includeCookies: true,
      document: \`
# Welcome to IntelGraph GraphQL Playground
#
# Type queries in the editor on the left and click the Play button to execute.
# Press Ctrl-Space for autocomplete suggestions.

# Example: Get an entity by ID
query GetEntity {
  entity(id: "example-id") {
    id
    name
    type
    description
  }
}
\`
    });
  </script>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export default graphqlDocsRouter;
