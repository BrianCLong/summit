import {
    McpInitializeResult,
    McpListToolsResult,
    McpCallToolResult
  } from '../types.js';

export class HttpSseClient {
    constructor(private url: string) {
        if (process.env.MCP_ENABLE_HTTP_SSE !== 'true') {
            throw new Error('HTTP/SSE transport is disabled. Set MCP_ENABLE_HTTP_SSE=true to enable.');
        }
    }

    public async initialize(): Promise<McpInitializeResult> {
        throw new Error('Not implemented');
    }

    public async listTools(): Promise<McpListToolsResult> {
        throw new Error('Not implemented');
    }

    public async callTool(name: string, args: Record<string, unknown>): Promise<McpCallToolResult> {
        throw new Error('Not implemented');
    }

    public close() {
        // no-op
    }
}
