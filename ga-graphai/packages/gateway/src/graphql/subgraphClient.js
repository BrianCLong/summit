const DEFAULT_TIMEOUT_MS = 2000;

function ensureFetch() {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is not available in this runtime');
  }
}

export class GraphSubgraphClient {
  constructor(options) {
    ensureFetch();
    this.url = options.url;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.logger = options.logger ?? console;
  }

  async fetchNode(id) {
    const payload = {
      query: `query GraphNode($id: ID!) {
        node(id: $id) {
          id
          labels
          properties
        }
      }`,
      variables: { id }
    };
    return this.execute(payload, data => data?.node, 'graphNode');
  }

  async fetchNeighborhood(input) {
    const payload = {
      query: `query GraphNeighborhood($nodeId: ID!, $direction: Direction!, $limit: Int!, $cursor: String, $labelFilters: [String!], $propertyFilters: [PropertyFilterInput!]) {
        nodeNeighborhood(
          nodeId: $nodeId,
          direction: $direction,
          limit: $limit,
          cursor: $cursor,
          labelFilters: $labelFilters,
          propertyFilters: $propertyFilters
        ) {
          node { id labels properties }
          neighbors { id labels properties }
          edges { id type startId endId properties }
          pageInfo { endCursor hasNextPage }
        }
      }`,
      variables: {
        nodeId: input.nodeId,
        direction: input.direction ?? 'BOTH',
        limit: input.limit ?? 25,
        cursor: input.cursor ?? null,
        labelFilters: input.labelFilters ?? [],
        propertyFilters: input.propertyFilters ?? []
      }
    };
    return this.execute(payload, data => data?.nodeNeighborhood, 'graphNeighborhood');
  }

  async fetchFilteredPaths(input) {
    const payload = {
      query: `query GraphFilteredPaths($input: PathInput!) {
        filteredPaths(input: $input) {
          paths {
            nodes { id labels properties }
            edges { id type startId endId properties }
          }
          pageInfo { endCursor hasNextPage }
        }
      }`,
      variables: {
        input: {
          startId: input.startId,
          direction: input.direction ?? 'OUT',
          maxHops: input.maxHops ?? 3,
          limit: input.limit ?? 10,
          cursor: input.cursor ?? null,
          labelFilters: input.labelFilters ?? [],
          relationshipTypes: input.relationshipTypes ?? [],
          propertyFilters: input.propertyFilters ?? []
        }
      }
    };
    return this.execute(payload, data => data?.filteredPaths, 'graphFilteredPaths');
  }

  async execute(payload, pick, operation) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const json = await response.json();
      if (!response.ok) {
        this.logger.warn({ status: response.status, body: json, operation }, 'graph_subgraph_http_error');
        throw new Error('GRAPH_SUBGRAPH_HTTP_ERROR');
      }
      if (Array.isArray(json.errors) && json.errors.length > 0) {
        this.logger.warn({ errors: json.errors, operation }, 'graph_subgraph_graphql_error');
        throw new Error('GRAPH_SUBGRAPH_GRAPHQL_ERROR');
      }
      return {
        data: pick(json.data ?? {}),
        cost: json.extensions?.cost ?? null
      };
    } catch (error) {
      this.logger.warn({ err: error, operation }, 'graph_subgraph_request_failed');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
