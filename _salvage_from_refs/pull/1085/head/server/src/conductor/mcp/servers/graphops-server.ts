// GraphOps MCP Server
// Provides graph operations (Cypher queries, algorithms) via MCP protocol

import WebSocket from 'ws';
import { v4 as uuid } from 'uuid';
import { MCPRequest, MCPResponse, MCPTool } from '../../types';

export interface GraphOpsConfig {
  neo4jUri: string;
  neo4jUser: string;
  neo4jPassword: string;
  port: number;
  authTokens: string[];
  rateLimits: {
    requestsPerSecond: number;
    requestsPerHour: number;
  };
}

export class GraphOpsServer {
  private server: WebSocket.Server;
  private neo4jDriver: any; // Neo4j driver instance
  private rateLimitCache = new Map<string, { count: number; resetTime: number }>();

  // Available tools
  private tools: MCPTool[] = [
    {
      name: "graph.query",
      description: "Execute parameterized Cypher queries against the tenant graph",
      schema: {
        type: "object",
        properties: {
          cypher: { 
            type: "string", 
            description: "Cypher query to execute" 
          },
          params: { 
            type: "object", 
            description: "Parameters for the query" 
          },
          tenantId: {
            type: "string",
            description: "Tenant ID for multi-tenant isolation"
          }
        },
        required: ["cypher"]
      },
      scopes: ["graph:read"]
    },
    {
      name: "graph.write",
      description: "Execute write operations (CREATE, UPDATE, DELETE)",
      schema: {
        type: "object",
        properties: {
          cypher: { type: "string" },
          params: { type: "object" },
          tenantId: { type: "string" }
        },
        required: ["cypher"]
      },
      scopes: ["graph:write"]
    },
    {
      name: "graph.alg",
      description: "Execute graph algorithms (PageRank, Community Detection, etc.)",
      schema: {
        type: "object",
        properties: {
          name: { 
            type: "string",
            enum: ["pagerank", "community", "shortestPath", "betweenness", "closeness"]
          },
          args: { 
            type: "object",
            description: "Algorithm-specific arguments"
          },
          tenantId: { type: "string" }
        },
        required: ["name"]
      },
      scopes: ["graph:compute"]
    },
    {
      name: "graph.schema",
      description: "Get or modify graph schema information",
      schema: {
        type: "object", 
        properties: {
          operation: {
            type: "string",
            enum: ["get", "constraints", "indexes"]
          },
          tenantId: { type: "string" }
        },
        required: ["operation"]
      },
      scopes: ["graph:read"]
    }
  ];

  constructor(private config: GraphOpsConfig) {
    this.server = new WebSocket.Server({ port: config.port });
    this.setupNeo4jDriver();
    this.setupWebSocketHandlers();
    console.log(`GraphOps MCP Server listening on port ${config.port}`);
  }

  private setupNeo4jDriver(): void {
    // Initialize Neo4j driver
    // This would use the actual neo4j-driver package
    console.log(`Connecting to Neo4j at ${this.config.neo4jUri}`);
    // this.neo4jDriver = neo4j.driver(
    //   this.config.neo4jUri,
    //   neo4j.auth.basic(this.config.neo4jUser, this.config.neo4jPassword)
    // );
  }

  private setupWebSocketHandlers(): void {
    this.server.on('connection', (ws: WebSocket, request) => {
      console.log('New MCP client connected to GraphOps server');

      // Authenticate connection
      const authToken = this.extractAuthToken(request);
      if (!this.isValidToken(authToken)) {
        ws.close(1008, 'Invalid authentication token');
        return;
      }

      ws.on('message', async (data) => {
        try {
          const message: MCPRequest = JSON.parse(data.toString());
          
          // Rate limiting
          if (!this.checkRateLimit(authToken)) {
            this.sendError(ws, message.id, -32000, 'Rate limit exceeded');
            return;
          }

          // Handle different MCP methods
          switch (message.method) {
            case 'server/info':
              this.handleServerInfo(ws, message);
              break;
            case 'tools/list':
              this.handleToolsList(ws, message);
              break;
            case 'tools/execute':
              await this.handleToolExecute(ws, message, authToken);
              break;
            default:
              this.sendError(ws, message.id, -32601, `Method '${message.method}' not found`);
          }
        } catch (error) {
          console.error('Error processing message:', error);
          this.sendError(ws, 'unknown', -32700, 'Parse error');
        }
      });

      ws.on('close', () => {
        console.log('MCP client disconnected from GraphOps server');
      });
    });
  }

  private extractAuthToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  private isValidToken(token: string | null): boolean {
    return token !== null && this.config.authTokens.includes(token);
  }

  private checkRateLimit(token: string): boolean {
    const now = Date.now();
    const key = token;
    const limit = this.rateLimitCache.get(key);

    if (!limit || now > limit.resetTime) {
      // Reset counter
      this.rateLimitCache.set(key, {
        count: 1,
        resetTime: now + 1000 // 1 second window
      });
      return true;
    }

    if (limit.count >= this.config.rateLimits.requestsPerSecond) {
      return false;
    }

    limit.count++;
    return true;
  }

  private handleServerInfo(ws: WebSocket, message: MCPRequest): void {
    const response: MCPResponse = {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        name: "GraphOps MCP Server",
        version: "1.0.0",
        description: "Neo4j graph operations via MCP",
        capabilities: {
          tools: true,
          resources: false,
          prompts: false
        }
      }
    };
    ws.send(JSON.stringify(response));
  }

  private handleToolsList(ws: WebSocket, message: MCPRequest): void {
    const response: MCPResponse = {
      jsonrpc: "2.0",
      id: message.id,
      result: {
        tools: this.tools
      }
    };
    ws.send(JSON.stringify(response));
  }

  private async handleToolExecute(ws: WebSocket, message: MCPRequest, token: string): Promise<void> {
    const { name, arguments: args } = message.params || {};
    
    if (!name) {
      this.sendError(ws, message.id, -32602, 'Missing tool name');
      return;
    }

    const tool = this.tools.find(t => t.name === name);
    if (!tool) {
      this.sendError(ws, message.id, -32601, `Tool '${name}' not found`);
      return;
    }

    try {
      let result;
      switch (name) {
        case 'graph.query':
          result = await this.executeQuery(args, false);
          break;
        case 'graph.write':
          result = await this.executeQuery(args, true);
          break;
        case 'graph.alg':
          result = await this.executeAlgorithm(args);
          break;
        case 'graph.schema':
          result = await this.getSchema(args);
          break;
        default:
          throw new Error(`Unimplemented tool: ${name}`);
      }

      const response: MCPResponse = {
        jsonrpc: "2.0",
        id: message.id,
        result
      };
      ws.send(JSON.stringify(response));

    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      this.sendError(ws, message.id, -32000, `Tool execution failed: ${error.message}`);
    }
  }

  private async executeQuery(args: any, isWrite: boolean = false): Promise<any> {
    const { cypher, params = {}, tenantId } = args;
    
    if (!cypher) {
      throw new Error('Cypher query is required');
    }

    // Add tenant isolation if specified
    const finalCypher = cypher;
    let finalParams = params;
    
    if (tenantId) {
      // Simple tenant isolation by adding WHERE clause
      // In production, this would be more sophisticated
      finalParams = { ...params, tenantId };
    }

    console.log(`Executing ${isWrite ? 'write' : 'read'} query:`, finalCypher);
    
    // Mock execution for now - replace with actual Neo4j driver call
    return {
      records: [
        { id: "1", type: "Person", properties: { name: "John Doe" } },
        { id: "2", type: "Organization", properties: { name: "ACME Corp" } }
      ],
      summary: {
        queryType: isWrite ? "w" : "r",
        counters: {
          nodesCreated: isWrite ? 1 : 0,
          nodesDeleted: 0,
          relationshipsCreated: isWrite ? 1 : 0,
          relationshipsDeleted: 0
        },
        executionTimeMs: 45
      }
    };
  }

  private async executeAlgorithm(args: any): Promise<any> {
    const { name, args: algArgs = {}, tenantId } = args;
    
    console.log(`Executing algorithm: ${name}`, algArgs);
    
    // Mock algorithm execution - replace with actual Neo4j GDS calls
    switch (name) {
      case 'pagerank':
        return {
          algorithm: 'pagerank',
          nodes: [
            { nodeId: "1", score: 0.85 },
            { nodeId: "2", score: 0.65 }
          ],
          executionTimeMs: 120,
          parameters: algArgs
        };
        
      case 'community':
        return {
          algorithm: 'community',
          communities: [
            { communityId: 1, nodeIds: ["1", "3", "5"] },
            { communityId: 2, nodeIds: ["2", "4", "6"] }
          ],
          executionTimeMs: 200,
          parameters: algArgs
        };
        
      case 'shortestPath':
        if (!algArgs.source || !algArgs.target) {
          throw new Error('Shortest path requires source and target nodes');
        }
        return {
          algorithm: 'shortestPath',
          path: [
            { nodeId: algArgs.source },
            { nodeId: "intermediate" },
            { nodeId: algArgs.target }
          ],
          totalCost: 2.5,
          executionTimeMs: 80
        };
        
      default:
        throw new Error(`Algorithm '${name}' not supported`);
    }
  }

  private async getSchema(args: any): Promise<any> {
    const { operation, tenantId } = args;
    
    console.log(`Getting schema info: ${operation}`);
    
    // Mock schema info - replace with actual Neo4j schema queries
    switch (operation) {
      case 'get':
        return {
          nodeLabels: ["Person", "Organization", "Event", "Location"],
          relationshipTypes: ["KNOWS", "WORKS_FOR", "LOCATED_AT", "PARTICIPATED_IN"],
          properties: {
            Person: ["name", "age", "email"],
            Organization: ["name", "type", "founded"]
          }
        };
        
      case 'constraints':
        return {
          constraints: [
            { 
              label: "Person", 
              property: "email", 
              type: "UNIQUE" 
            }
          ]
        };
        
      case 'indexes':
        return {
          indexes: [
            {
              label: "Person",
              properties: ["name"],
              type: "BTREE"
            }
          ]
        };
        
      default:
        throw new Error(`Schema operation '${operation}' not supported`);
    }
  }

  private sendError(ws: WebSocket, id: string, code: number, message: string): void {
    const response: MCPResponse = {
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message
      }
    };
    ws.send(JSON.stringify(response));
  }

  /**
   * Get server statistics
   */
  public getStats(): any {
    return {
      connectedClients: this.server.clients.size,
      rateLimitEntries: this.rateLimitCache.size,
      availableTools: this.tools.length
    };
  }

  /**
   * Shutdown the server
   */
  public async shutdown(): Promise<void> {
    console.log('Shutting down GraphOps MCP Server');
    
    // Close all connections
    this.server.clients.forEach(ws => {
      ws.close(1001, 'Server shutting down');
    });
    
    // Close Neo4j driver
    if (this.neo4jDriver) {
      await this.neo4jDriver.close();
    }
    
    // Close WebSocket server
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('GraphOps MCP Server shut down');
        resolve();
      });
    });
  }
}

// Export for use in main server
export default GraphOpsServer;