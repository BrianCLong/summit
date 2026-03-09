import { spawn, ChildProcess } from 'child_process';
import * as readline from 'readline';
import {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcMessage,
  McpInitializeRequestParams,
  McpInitializeResult,
  McpCallToolRequestParams,
  McpCallToolResult,
  McpListToolsResult
} from '../types.js';
import { MCP_SPEC_VERSION } from '../schema/version.js';

export class StdioClient {
  private process: ChildProcess;
  private pendingRequests = new Map<string | number, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private nextId = 1;
  private isClosed = false;

  constructor(command: string, args: string[] = [], env?: Record<string, string>) {
    this.process = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.process.on('error', (err) => {
      console.error('MCP Client Process Error:', err);
      this.close();
    });

    this.process.on('exit', (code) => {
      if (!this.isClosed) {
        // console.warn(`MCP Client exited with code ${code}`);
        this.close();
      }
    });

    // Handle stderr
    this.process.stderr?.on('data', (data) => {
      // console.error(`MCP Stderr: ${data.toString()}`);
    });

    // Handle stdout (newline delimited JSON-RPC)
    const rl = readline.createInterface({
      input: this.process.stdout!,
      terminal: false
    });

    rl.on('line', (line) => {
      if (!line.trim()) return;
      try {
        const msg = JSON.parse(line);
        this.handleMessage(msg);
      } catch (e) {
        // console.error('Failed to parse MCP message:', line, e);
      }
    });
  }

  private handleMessage(msg: JsonRpcMessage) {
    if ('id' in msg && msg.id !== null && msg.id !== undefined) {
        const response = msg as JsonRpcResponse;
        if ('result' in response || 'error' in response) {
             const pending = this.pendingRequests.get(response.id!);
             if (pending) {
                this.pendingRequests.delete(response.id!);
                if ('error' in response) {
                  pending.reject(new Error(response.error.message));
                } else {
                  pending.resolve(response.result);
                }
             }
        }
    } else if ('method' in msg) {
      // Notification or Request from server
    }
  }

  public async request<T>(method: string, params?: unknown): Promise<T> {
    if (this.isClosed) throw new Error('Client is closed');
    const id = this.nextId++;
    const req: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      const json = JSON.stringify(req);
      if (this.process.stdin?.writable) {
        this.process.stdin.write(json + '\n');
      } else {
        this.pendingRequests.delete(id);
        reject(new Error('Stdin not writable'));
      }
    });
  }

  public async initialize(): Promise<McpInitializeResult> {
    const params: McpInitializeRequestParams = {
      protocolVersion: MCP_SPEC_VERSION,
      capabilities: {
        roots: { listChanged: false },
        sampling: {}
      },
      clientInfo: {
        name: 'summit-mcp-client',
        version: '1.0.0'
      }
    };
    return this.request<McpInitializeResult>('initialize', params);
  }

  public async listTools(): Promise<McpListToolsResult> {
    return this.request<McpListToolsResult>('tools/list');
  }

  public async callTool(name: string, args: Record<string, unknown>): Promise<McpCallToolResult> {
    const params: McpCallToolRequestParams = {
      name,
      arguments: args
    };
    return this.request<McpCallToolResult>('tools/call', params);
  }

  public close() {
    this.isClosed = true;
    this.process.kill();
    for (const [_, { reject }] of this.pendingRequests) {
      reject(new Error('Client closed'));
    }
    this.pendingRequests.clear();
  }
}
