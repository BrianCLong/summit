// MCP (Model Context Protocol) Client for JSON-RPC 2.0 communication
// Handles persistent connections to MCP servers with auth and error handling

import WebSocket from 'ws';
import { randomUUID as uuid } from 'crypto';
import { MCPRequest, MCPResponse, MCPServerConfig, MCPTool } from '../types';
import logger from '../../config/logger.js';

export interface MCPClientOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

// Load allowed executor URLs from environment variable
const allowedExecutorUrls = process.env.MCP_ALLOWED_EXECUTOR_URLS
  ? process.env.MCP_ALLOWED_EXECUTOR_URLS.split(',').map((url) => url.trim())
  : [];

export class MCPClient {
  private connections: Map<string, WebSocket> = new Map();
  private pendingRequests: Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (reason: any) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();

  constructor(
    private servers: Record<string, MCPServerConfig>,
    private options: MCPClientOptions = {},
  ) {
    this.options = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...options,
    };
  }

  /**
   * Connect to an MCP server
   */
  public async connect(serverName: string): Promise<void> {
    const config = this.servers[serverName];
    if (!config) {
      throw new Error(`MCP server '${serverName}' not configured`);
    }

    // Enforce allowlist
    if (
      allowedExecutorUrls.length > 0 &&
      !allowedExecutorUrls.includes(config.url)
    ) {
      logger.error(
        `Attempted to connect to disallowed MCP server URL: ${config.url}`,
      );
      throw new Error(
        `Connection to '${config.url}' is not allowed by policy.`,
      );
    }

    if (this.connections.has(serverName)) {
      // Close existing connection
      this.connections.get(serverName)?.close();
    }

    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {};
      if (config.authToken) {
        headers.Authorization = `Bearer ${config.authToken}`;
      }

      // TODO: Implement certificate pinning here
      // const ws = new WebSocket(config.url, { headers, ca: [trustedCA], cert: clientCert, key: clientKey, rejectUnauthorized: true });
      const ws = new WebSocket(config.url, { headers });

      ws.once('open', () => {
        logger.info(`Connected to MCP server: ${serverName} (${config.url})`);
        // Audit pin state (placeholder for now)
        // writeAudit({ action: 'mcp_connect', resourceType: 'mcp_server', resourceId: serverName, details: { url: config.url, pinned: false, pin_status: 'not_implemented' } });
        this.connections.set(serverName, ws);
        resolve();
      });

      ws.once('error', (error) => {
        logger.error(
          `Failed to connect to MCP server ${serverName} (${config.url}):`,
          error,
        );
        reject(error);
      });

      ws.on('message', (data) => {
        this.handleMessage(data);
      });

      ws.on('close', () => {
        logger.info(
          `Disconnected from MCP server: ${serverName} (${config.url})`,
        );
        this.connections.delete(serverName);
        let attempt = 0;
        const retry = () => {
          const delay = Math.min(30000, 1000 * 2 ** attempt++);
          setTimeout(() => {
            this.connect(serverName).catch(() => retry()); // Re-attempt connection
          }, delay);
        };
        retry();
      });
    });
  }

  /**
   * Disconnect from an MCP server
   */
  public async disconnect(serverName: string): Promise<void> {
    const ws = this.connections.get(serverName);
    if (ws) {
      ws.close();
      this.connections.delete(serverName);
    }
  }

  /**
   * Disconnect from all servers
   */
  public async disconnectAll(): Promise<void> {
    const promises = Array.from(this.connections.keys()).map((serverName) =>
      this.disconnect(serverName),
    );
    await Promise.all(promises);
  }

  /**
   * Execute a tool on a specific MCP server
   */
  public async executeTool(
    serverName: string,
    toolName: string,
    args: Record<string, any>,
    userScopes?: string[],
  ): Promise<any> {
    const config = this.servers[serverName];
    if (!config) {
      throw new Error(`MCP server '${serverName}' not configured`);
    }

    // Check tool authorization
    const tool = config.tools.find((t) => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found on server '${serverName}'`);
    }

    if (tool.scopes && userScopes) {
      const hasRequiredScopes = tool.scopes.every((scope) =>
        userScopes.includes(scope),
      );
      if (!hasRequiredScopes) {
        throw new Error(
          `Insufficient scopes for tool '${toolName}'. Required: ${tool.scopes.join(', ')}`,
        );
      }
    }

    // Ensure connection exists
    if (!this.connections.has(serverName)) {
      await this.connect(serverName);
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: uuid(),
      method: 'tools/execute',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    return this.sendRequest(serverName, request);
  }

  /**
   * List available tools on a server
   */
  public async listTools(serverName: string): Promise<MCPTool[]> {
    const config = this.servers[serverName];
    if (!config) {
      throw new Error(`MCP server '${serverName}' not configured`);
    }

    // Return cached tools for now
    // In a full implementation, this would query the server
    return config.tools;
  }

  /**
   * Get server capabilities and info
   */
  public async getServerInfo(serverName: string): Promise<any> {
    if (!this.connections.has(serverName)) {
      await this.connect(serverName);
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: uuid(),
      method: 'server/info',
    };

    return this.sendRequest(serverName, request);
  }

  /**
   * Send a raw JSON-RPC request
   */
  private async sendRequest(
    serverName: string,
    request: MCPRequest,
  ): Promise<any> {
    const ws = this.connections.get(serverName);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error(`No active connection to server '${serverName}'`);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error(`Request timeout for ${request.method}`));
      }, this.options.timeout);

      this.pendingRequests.set(request.id, {
        resolve,
        reject,
        timeout,
      });

      ws.send(JSON.stringify(request), (error) => {
        if (error) {
          clearTimeout(timeout);
          this.pendingRequests.delete(request.id);
          reject(error);
        }
      });
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message: MCPResponse = JSON.parse(data.toString());

      const pending = this.pendingRequests.get(message.id);
      if (!pending) {
        logger.warn(`Received response for unknown request: ${message.id}`);
        return;
      }

      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.id);

      if (message.error) {
        pending.reject(new Error(`MCP Error: ${message.error.message}`));
      } else {
        pending.resolve(message.result);
      }
    } catch (error) {
      logger.error('Failed to parse MCP message:', error);
    }
  }

  /**
   * Check if connected to a server
   */
  public isConnected(serverName: string): boolean {
    const ws = this.connections.get(serverName);
    return ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection status for all servers
   */
  public getConnectionStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    Object.keys(this.servers).forEach((serverName) => {
      status[serverName] = this.isConnected(serverName);
    });
    return status;
  }
}

// MCP Server Registry - manages server configurations
export class MCPServerRegistry {
  private servers: Record<string, MCPServerConfig> = {};

  /**
   * Register an MCP server
   */
  public register(name: string, config: MCPServerConfig): void {
    this.servers[name] = { ...config, name };
  }

  /**
   * Unregister an MCP server
   */
  public unregister(name: string): void {
    delete this.servers[name];
  }

  /**
   * Get server configuration
   */
  public getServer(name: string): MCPServerConfig | undefined {
    return this.servers[name];
  }

  /**
   * List all registered servers
   */
  public listServers(): string[] {
    return Object.keys(this.servers);
  }

  /**
   * Get all server configurations
   */
  public getAllServers(): Record<string, MCPServerConfig> {
    return { ...this.servers };
  }

  /**
   * Find servers that have a specific tool
   */
  public findServersWithTool(toolName: string): string[] {
    return Object.entries(this.servers)
      .filter(([_, config]) =>
        config.tools.some((tool) => tool.name === toolName),
      )
      .map(([name, _]) => name);
  }
}

// Export singleton instances
export const mcpRegistry = new MCPServerRegistry();
export let mcpClient: MCPClient;

/**
 * Initialize the MCP client with server configurations
 */
export function initializeMCPClient(options?: MCPClientOptions): void {
  mcpClient = new MCPClient(mcpRegistry.getAllServers(), options);
}

/**
 * Convenience function to execute a tool across any server that has it
 */
export async function executeToolAnywhere(
  toolName: string,
  args: Record<string, any>,
  userScopes?: string[],
): Promise<{ serverName: string; result: any }> {
  const servers = mcpRegistry.findServersWithTool(toolName);
  if (servers.length === 0) {
    throw new Error(`Tool '${toolName}' not found on any registered server`);
  }

  // Try servers in order until one succeeds
  for (const serverName of servers) {
    try {
      const result = await mcpClient.executeTool(
        serverName,
        toolName,
        args,
        userScopes,
      );
      return { serverName, result };
    } catch (error) {
      console.warn(`Failed to execute ${toolName} on ${serverName}:`, error);
      // Continue to next server
    }
  }

  throw new Error(`Tool '${toolName}' failed on all available servers`);
}
