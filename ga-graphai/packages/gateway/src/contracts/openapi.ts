import type { OpenAPIV3_1 } from "openapi-types";

type GatewayOpenApi = OpenAPIV3_1.Document & { version: string };

export const gatewayOpenApiContract: GatewayOpenApi = {
  version: "2025.3.0",
  openapi: "3.1.0",
  info: {
    title: "GA GraphAI Gateway",
    version: "2025.3.0",
    description:
      "Unified gateway for search, policy-aware orchestration, and GraphQL execution. OpenAPI is the single source of truth for REST entrypoints.",
  },
  servers: [
    { url: "https://api.graphai.example.com", description: "Production" },
    { url: "https://staging-api.graphai.example.com", description: "Staging" },
  ],
  paths: {
    "/api/search/unified": {
      get: {
        operationId: "searchUnified",
        summary: "Unified search across connectors and knowledge graph.",
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Search query string.",
          },
          {
            name: "tenant_id",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Tenant identifier used to route policy and context.",
          },
          {
            name: "x-purpose",
            in: "header",
            required: false,
            schema: { type: "string" },
            description: "Purpose header to enforce policy controls.",
          },
          {
            name: "Accept-Version",
            in: "header",
            required: false,
            schema: { type: "string", enum: ["v1"] },
            description: "Explicit contract version to pin the response schema.",
          },
        ],
        responses: {
          "200": {
            description: "Successful unified search.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items", "trace_id"],
                  properties: {
                    trace_id: { type: "string" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["title", "source", "ranking_features"],
                        properties: {
                          title: { type: "string" },
                          source: { type: "string" },
                          snippet: { type: "string" },
                          ranking_features: {
                            type: "object",
                            additionalProperties: { type: "number" },
                          },
                        },
                      },
                    },
                  },
                },
                example: {
                  trace_id: "trace-123",
                  items: [
                    {
                      title: "Bridge operations",
                      source: "demo-index",
                      snippet: "Findings about bridges...",
                      ranking_features: { bm25: 0.92, semantic: 0.87 },
                    },
                  ],
                },
              },
            },
          },
        },
        tags: ["Search"],
      },
    },
    "/graphql": {
      post: {
        operationId: "graphqlGateway",
        summary: "GraphQL gateway endpoint",
        responses: {
          "200": {
            description: "GraphQL execution result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data"],
                  properties: {
                    data: { type: "object" },
                    errors: {
                      type: "array",
                      items: { type: "object" },
                    },
                  },
                },
                example: {
                  data: { models: [{ id: "gpt-4", family: "llm", modality: ["text"] }] },
                },
              },
            },
          },
        },
        tags: ["GraphQL"],
      },
    },
  },
  components: {
    schemas: {
      SearchResultItem: {
        type: "object",
        required: ["title", "source", "ranking_features"],
        properties: {
          title: { type: "string" },
          source: { type: "string" },
          snippet: { type: "string" },
          ranking_features: {
            type: "object",
            additionalProperties: { type: "number" },
          },
        },
      },
    },
  },
};
