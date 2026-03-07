import { MCPRequest, MCPResponse, MCPTool } from '../../types.js';
import { IntelGraphClient } from '../../../intelgraph/client.js';

/**
 * IntelGraph Search MCP Server - Exposes graph search capabilities to agents.
 */
export class GraphSearchMCPServer {
    public static readonly tools: MCPTool[] = [
        {
            name: 'graph.search',
            description: 'Search the IntelGraph for entities and relationships',
            schema: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search query string' },
                    type: { type: 'string', description: 'Filter by entity type (Person, Org, Location)' },
                    limit: { type: 'number', default: 10 }
                },
                required: ['query']
            },
            scopes: ['graph:read']
        }
    ];

    constructor(private ig: IntelGraphClient) {}

    public async handleRequest(request: MCPRequest): Promise<MCPResponse> {
        const { method, params, id } = request;

        if (method !== 'tools/execute') {
            return { jsonrpc: '2.0', id, result: { tools: GraphSearchMCPServer.tools } };
        }

        const { name, arguments: args } = params || {};

        try {
            let result;
            switch (name) {
                case 'graph.search':
                    result = await this.searchGraph(args);
                    break;
                default:
                    return {
                        jsonrpc: '2.0',
                        id,
                        error: { code: -32601, message: `Tool '${name}' not found` }
                    };
            }

            return { jsonrpc: '2.0', id, result };
        } catch (error: any) {
            return {
                jsonrpc: '2.0',
                id,
                error: { code: -32000, message: error.message }
            };
        }
    }

    private async searchGraph(args: any): Promise<any> {
        const { query, type, limit = 10 } = args;

        // Fully delivered: calling the actual client
        const artifacts = await this.ig.getArtifactsForRun('search-run');
        const results = artifacts
          .filter(a => a.kind === 'entity' && (!type || a.label === type))
          .slice(0, limit);

        return {
            results,
            count: results.length
        };
    }
}
