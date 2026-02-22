import WebSocket from 'ws';
import type {
  ClientTransportSession,
  TransportConnectOptions,
  TransportEnvelope,
  TransportSendOptions,
  TransportCloseInfo,
} from './types.js';
import type { MCPRequest, MCPResponse, MCPServerConfig } from '../../types/index.js';

const DEFAULT_CONNECT_TIMEOUT_MS = 10000;

function resolveDeadlineTimeout(options?: TransportConnectOptions): number | null {
  if (!options?.deadline) {
    return null;
  }
  if (options.deadline.timeoutMs) {
    return options.deadline.timeoutMs;
  }
  if (options.deadline.deadline) {
    const diff = options.deadline.deadline.getTime() - Date.now();
    return Math.max(diff, 0);
  }
  return null;
}

function mergeHeaders(
  authToken: string | undefined,
  metadata: Record<string, string> | undefined,
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      if (key.toLowerCase() === 'authorization') {
        continue;
      }
      headers[key] = value;
    }
  }
  return headers;
}

export class WebSocketJsonRpcClientTransport implements ClientTransportSession {
  private socket?: WebSocket;
  private messageHandler?: (message: TransportEnvelope<MCPResponse>) => void;
  private closeHandler?: (info: TransportCloseInfo) => void;
  private errorHandler?: (error: Error) => void;

  constructor(private config: MCPServerConfig) {}

  async connect(options?: TransportConnectOptions): Promise<void> {
    const timeoutMs = resolveDeadlineTimeout(options) ?? DEFAULT_CONNECT_TIMEOUT_MS;
    const headers = mergeHeaders(this.config.authToken, options?.metadata);

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.config.url, { headers });
      this.socket = socket;
      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        socket.close();
        reject(new Error('MCP transport connect timed out'));
      }, timeoutMs);

      socket.once('open', () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        this.bindHandlers();
        resolve();
      });

      socket.once('error', (error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  recv(handler: (message: TransportEnvelope<MCPResponse>) => void): void {
    this.messageHandler = handler;
    if (this.socket) {
      this.socket.removeAllListeners('message');
      this.socket.on('message', (data) => this.handleMessage(data));
    }
  }

  async send(payload: MCPRequest, _options?: TransportSendOptions): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('MCP transport socket is not open');
    }

    await new Promise<void>((resolve, reject) => {
      this.socket?.send(JSON.stringify(payload), (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    if (this.socket) {
      this.socket.close();
    }
  }

  onClose(handler: (info: TransportCloseInfo) => void): void {
    this.closeHandler = handler;
    if (this.socket) {
      this.socket.on('close', (code, reason) => {
        handler({ code, reason: reason.toString() });
      });
    }
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandler = handler;
    if (this.socket) {
      this.socket.on('error', handler);
    }
  }

  private bindHandlers(): void {
    if (!this.socket) {
      return;
    }
    if (this.messageHandler) {
      this.socket.on('message', (data) => this.handleMessage(data));
    }

    if (this.closeHandler) {
      this.socket.on('close', (code, reason) => {
        this.closeHandler?.({ code, reason: reason.toString() });
      });
    }

    if (this.errorHandler) {
      this.socket.on('error', this.errorHandler);
    }
  }

  private handleMessage(data: WebSocket.Data): void {
    if (!this.messageHandler) {
      return;
    }
    try {
      const message: MCPResponse = JSON.parse(data.toString());
      this.messageHandler({ payload: message, metadata: {} });
    } catch (error) {
      const handledError =
        error instanceof Error
          ? error
          : new Error('Failed to parse MCP message');
      this.errorHandler?.(handledError);
    }
  }
}
