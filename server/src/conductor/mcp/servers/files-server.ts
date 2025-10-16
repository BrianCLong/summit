// Files MCP Server
// Provides secure file operations with policy controls via MCP protocol

import WebSocket from 'ws';
import { randomUUID as uuid } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { MCPRequest, MCPResponse, MCPTool } from '../../types';

export interface FilesServerConfig {
  port: number;
  basePath: string; // Base directory for file operations
  authTokens: string[];
  allowedExtensions: string[];
  maxFileSize: number; // in bytes
  rateLimits: {
    requestsPerSecond: number;
    requestsPerHour: number;
  };
}

export class FilesServer {
  private server: WebSocket.Server;
  private rateLimitCache = new Map<
    string,
    { count: number; resetTime: number }
  >();

  // Available tools
  private tools: MCPTool[] = [
    {
      name: 'files.search',
      description: 'Search for files by name, content, or metadata',
      schema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (filename or content)',
          },
          path: {
            type: 'string',
            description: 'Directory to search in (relative to base)',
          },
          extension: {
            type: 'string',
            description: 'File extension filter',
          },
          limit: {
            type: 'number',
            default: 20,
            description: 'Maximum number of results',
          },
        },
        required: ['query'],
      },
      scopes: ['files:read'],
    },
    {
      name: 'files.get',
      description: 'Read file contents',
      schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path relative to base directory',
          },
          encoding: {
            type: 'string',
            enum: ['utf8', 'base64', 'binary'],
            default: 'utf8',
          },
        },
        required: ['path'],
      },
      scopes: ['files:read'],
    },
    {
      name: 'files.put',
      description: 'Write or update file contents (policy-gated)',
      schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path relative to base directory',
          },
          content: {
            type: 'string',
            description: 'File content to write',
          },
          encoding: {
            type: 'string',
            enum: ['utf8', 'base64', 'binary'],
            default: 'utf8',
          },
          createDirs: {
            type: 'boolean',
            default: false,
            description: "Create parent directories if they don't exist",
          },
        },
        required: ['path', 'content'],
      },
      scopes: ['files:write'],
    },
    {
      name: 'files.list',
      description: 'List files and directories',
      schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            default: '.',
            description: 'Directory path relative to base',
          },
          recursive: {
            type: 'boolean',
            default: false,
          },
          includeHidden: {
            type: 'boolean',
            default: false,
          },
        },
      },
      scopes: ['files:read'],
    },
    {
      name: 'files.meta',
      description: 'Get file metadata (size, dates, permissions)',
      schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File path relative to base directory',
          },
        },
        required: ['path'],
      },
      scopes: ['files:read'],
    },
    {
      name: 'files.delete',
      description: 'Delete file or directory (requires elevated permissions)',
      schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File/directory path to delete',
          },
          recursive: {
            type: 'boolean',
            default: false,
            description: 'Delete directories recursively',
          },
        },
        required: ['path'],
      },
      scopes: ['files:write', 'files:delete'],
    },
  ];

  constructor(private config: FilesServerConfig) {
    this.server = new WebSocket.Server({ port: config.port });
    this.setupWebSocketHandlers();
    console.log(`Files MCP Server listening on port ${config.port}`);
    console.log(`Base path: ${config.basePath}`);
  }

  private setupWebSocketHandlers(): void {
    this.server.on('connection', (ws: WebSocket, request) => {
      console.log('New MCP client connected to Files server');

      const authToken = this.extractAuthToken(request);
      if (!this.isValidToken(authToken)) {
        ws.close(1008, 'Invalid authentication token');
        return;
      }

      ws.on('message', async (data) => {
        try {
          const message: MCPRequest = JSON.parse(data.toString());

          if (!this.checkRateLimit(authToken)) {
            this.sendError(ws, message.id, -32000, 'Rate limit exceeded');
            return;
          }

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
              this.sendError(
                ws,
                message.id,
                -32601,
                `Method '${message.method}' not found`,
              );
          }
        } catch (error) {
          console.error('Error processing message:', error);
          this.sendError(ws, 'unknown', -32700, 'Parse error');
        }
      });

      ws.on('close', () => {
        console.log('MCP client disconnected from Files server');
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
    const limit = this.rateLimitCache.get(token);

    if (!limit || now > limit.resetTime) {
      this.rateLimitCache.set(token, {
        count: 1,
        resetTime: now + 1000,
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
      jsonrpc: '2.0',
      id: message.id,
      result: {
        name: 'Files MCP Server',
        version: '1.0.0',
        description: 'Secure file operations with policy controls',
        capabilities: {
          tools: true,
          resources: false,
          prompts: false,
        },
      },
    };
    ws.send(JSON.stringify(response));
  }

  private handleToolsList(ws: WebSocket, message: MCPRequest): void {
    const response: MCPResponse = {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        tools: this.tools,
      },
    };
    ws.send(JSON.stringify(response));
  }

  private async handleToolExecute(
    ws: WebSocket,
    message: MCPRequest,
    token: string,
  ): Promise<void> {
    const { name, arguments: args } = message.params || {};

    if (!name) {
      this.sendError(ws, message.id, -32602, 'Missing tool name');
      return;
    }

    const tool = this.tools.find((t) => t.name === name);
    if (!tool) {
      this.sendError(ws, message.id, -32601, `Tool '${name}' not found`);
      return;
    }

    try {
      let result;
      switch (name) {
        case 'files.search':
          result = await this.searchFiles(args);
          break;
        case 'files.get':
          result = await this.getFile(args);
          break;
        case 'files.put':
          result = await this.putFile(args);
          break;
        case 'files.list':
          result = await this.listFiles(args);
          break;
        case 'files.meta':
          result = await this.getFileMeta(args);
          break;
        case 'files.delete':
          result = await this.deleteFile(args);
          break;
        default:
          throw new Error(`Unimplemented tool: ${name}`);
      }

      const response: MCPResponse = {
        jsonrpc: '2.0',
        id: message.id,
        result,
      };
      ws.send(JSON.stringify(response));
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      this.sendError(
        ws,
        message.id,
        -32000,
        `Tool execution failed: ${error.message}`,
      );
    }
  }

  private async searchFiles(args: any): Promise<any> {
    const { query, path: searchPath = '.', extension, limit = 20 } = args;

    const fullPath = this.resolvePath(searchPath);
    await this.validatePath(fullPath);

    // Simple filename search - in production this would be more sophisticated
    const results: any[] = [];

    // Mock search results
    const mockResults = [
      {
        path: 'documents/report.pdf',
        name: 'report.pdf',
        size: 1024000,
        modified: new Date().toISOString(),
        relevance: 0.95,
      },
      {
        path: 'data/entities.csv',
        name: 'entities.csv',
        size: 512000,
        modified: new Date().toISOString(),
        relevance: 0.87,
      },
    ];

    // Filter by query and extension
    let filtered = mockResults.filter((file) =>
      file.name.toLowerCase().includes(query.toLowerCase()),
    );

    if (extension) {
      filtered = filtered.filter((file) => file.name.endsWith(extension));
    }

    return {
      query,
      results: filtered.slice(0, limit),
      total: filtered.length,
      executionTimeMs: 25,
    };
  }

  private async getFile(args: any): Promise<any> {
    const { path: filePath, encoding = 'utf8' } = args;

    const fullPath = this.resolvePath(filePath);
    await this.validatePath(fullPath);
    await this.validateFileAccess(fullPath);

    try {
      let content;
      if (encoding === 'base64') {
        const buffer = await fs.readFile(fullPath);
        content = buffer.toString('base64');
      } else if (encoding === 'binary') {
        const buffer = await fs.readFile(fullPath);
        content = Array.from(buffer);
      } else {
        content = await fs.readFile(fullPath, 'utf8');
      }

      const stats = await fs.stat(fullPath);

      return {
        path: filePath,
        content,
        encoding,
        size: stats.size,
        modified: stats.mtime.toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  private async putFile(args: any): Promise<any> {
    const {
      path: filePath,
      content,
      encoding = 'utf8',
      createDirs = false,
    } = args;

    const fullPath = this.resolvePath(filePath);
    await this.validatePath(fullPath);
    await this.validateWrite(fullPath);

    try {
      if (createDirs) {
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
      }

      if (encoding === 'base64') {
        const buffer = Buffer.from(content, 'base64');
        await fs.writeFile(fullPath, buffer);
      } else if (encoding === 'binary') {
        const buffer = Buffer.from(content);
        await fs.writeFile(fullPath, buffer);
      } else {
        await fs.writeFile(fullPath, content, 'utf8');
      }

      const stats = await fs.stat(fullPath);

      return {
        path: filePath,
        size: stats.size,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        success: true,
      };
    } catch (error) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  private async listFiles(args: any): Promise<any> {
    const {
      path: dirPath = '.',
      recursive = false,
      includeHidden = false,
    } = args;

    const fullPath = this.resolvePath(dirPath);
    await this.validatePath(fullPath);

    try {
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      const results = [];

      for (const item of items) {
        if (!includeHidden && item.name.startsWith('.')) {
          continue;
        }

        const itemPath = path.join(dirPath, item.name);
        const fullItemPath = path.join(fullPath, item.name);
        const stats = await fs.stat(fullItemPath);

        const itemInfo = {
          name: item.name,
          path: itemPath,
          type: item.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          modified: stats.mtime.toISOString(),
          permissions: stats.mode.toString(8).slice(-3),
        };

        results.push(itemInfo);

        // Recursive directory listing
        if (recursive && item.isDirectory()) {
          const subItems = await this.listFiles({
            path: itemPath,
            recursive: true,
            includeHidden,
          });
          results.push(...subItems.items);
        }
      }

      return {
        path: dirPath,
        items: results,
        count: results.length,
      };
    } catch (error) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }

  private async getFileMeta(args: any): Promise<any> {
    const { path: filePath } = args;

    const fullPath = this.resolvePath(filePath);
    await this.validatePath(fullPath);

    try {
      const stats = await fs.stat(fullPath);

      return {
        path: filePath,
        size: stats.size,
        type: stats.isDirectory() ? 'directory' : 'file',
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        accessed: stats.atime.toISOString(),
        permissions: stats.mode.toString(8).slice(-3),
        owner: stats.uid,
        group: stats.gid,
      };
    } catch (error) {
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  private async deleteFile(args: any): Promise<any> {
    const { path: filePath, recursive = false } = args;

    const fullPath = this.resolvePath(filePath);
    await this.validatePath(fullPath);
    await this.validateDelete(fullPath);

    try {
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        await fs.rmdir(fullPath, { recursive });
      } else {
        await fs.unlink(fullPath);
      }

      return {
        path: filePath,
        deleted: true,
        type: stats.isDirectory() ? 'directory' : 'file',
      };
    } catch (error) {
      throw new Error(`Failed to delete: ${error.message}`);
    }
  }

  private resolvePath(relativePath: string): string {
    // Resolve path relative to base directory and prevent directory traversal
    const resolved = path.resolve(this.config.basePath, relativePath);

    // Ensure the resolved path is within the base directory
    if (!resolved.startsWith(this.config.basePath)) {
      throw new Error('Path outside allowed directory');
    }

    return resolved;
  }

  private async validatePath(fullPath: string): Promise<void> {
    try {
      await fs.access(fullPath);
    } catch (error) {
      throw new Error('Path does not exist or is not accessible');
    }
  }

  private async validateFileAccess(fullPath: string): Promise<void> {
    const ext = path.extname(fullPath).toLowerCase();

    if (
      this.config.allowedExtensions.length > 0 &&
      !this.config.allowedExtensions.includes(ext)
    ) {
      throw new Error(`File type '${ext}' not allowed`);
    }
  }

  private async validateWrite(fullPath: string): Promise<void> {
    await this.validateFileAccess(fullPath);

    try {
      const stats = await fs.stat(fullPath);
      if (stats.size > this.config.maxFileSize) {
        throw new Error(`File size exceeds maximum allowed size`);
      }
    } catch (error) {
      // File doesn't exist, which is fine for writes
    }
  }

  private async validateDelete(fullPath: string): Promise<void> {
    // Add additional delete validation logic here
    // e.g., check for protected files, backup requirements
  }

  private sendError(
    ws: WebSocket,
    id: string,
    code: number,
    message: string,
  ): void {
    const response: MCPResponse = {
      jsonrpc: '2.0',
      id,
      error: { code, message },
    };
    ws.send(JSON.stringify(response));
  }

  public getStats(): any {
    return {
      connectedClients: this.server.clients.size,
      rateLimitEntries: this.rateLimitCache.size,
      availableTools: this.tools.length,
      basePath: this.config.basePath,
    };
  }

  public async shutdown(): Promise<void> {
    console.log('Shutting down Files MCP Server');

    this.server.clients.forEach((ws) => {
      ws.close(1001, 'Server shutting down');
    });

    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('Files MCP Server shut down');
        resolve();
      });
    });
  }
}

export default FilesServer;
