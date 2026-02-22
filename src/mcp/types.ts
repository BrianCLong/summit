import { MCP_SPEC_VERSION } from './schema/version.js';

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

export interface JsonRpcSuccessResponse {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: unknown;
}

export interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  id: JsonRpcId;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;
export type JsonRpcMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;

// MCP Specific Types

export interface McpInitializeRequestParams {
  protocolVersion: string;
  capabilities: McpClientCapabilities;
  clientInfo: {
    name: string;
    version: string;
  };
}

export interface McpClientCapabilities {
  experimental?: Record<string, object>;
  roots?: {
    listChanged?: boolean;
  };
  sampling?: object;
}

export interface McpServerCapabilities {
  experimental?: Record<string, object>;
  logging?: object;
  prompts?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  tools?: {
    listChanged?: boolean;
  };
}

export interface McpInitializeResult {
  protocolVersion: string;
  capabilities: McpServerCapabilities;
  serverInfo: {
    name: string;
    version: string;
  };
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
  };
}

export interface McpListToolsResult {
  tools: McpTool[];
  nextCursor?: string;
}

export interface McpCallToolRequestParams {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface McpCallToolResult {
  content: Array<
    | {
        type: "text";
        text: string;
      }
    | {
        type: "image";
        data: string;
        mimeType: string;
      }
    | {
        type: "resource";
        resource: {
            uri: string;
            text?: string;
            blob?: string; // base64
            mimeType?: string;
        };
      }
  >;
  isError?: boolean;
}

// Error codes
export const JSONRPC_PARSE_ERROR = -32700;
export const JSONRPC_INVALID_REQUEST = -32600;
export const JSONRPC_METHOD_NOT_FOUND = -32601;
export const JSONRPC_INVALID_PARAMS = -32602;
export const JSONRPC_INTERNAL_ERROR = -32603;
