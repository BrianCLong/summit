import type { MCPRequest, MCPResponse, MCPServerConfig } from '../../types/index.js';

export type MCPTransportName = 'stdio' | 'http' | 'jsonrpc' | 'grpc';
export type MCPTransportNegotiationPolicy =
  | 'prefer_grpc_fallback_http'
  | 'strict';

export type TransportMetadata = Record<string, string>;

export interface TransportDeadline {
  timeoutMs?: number;
  deadline?: Date;
}

export interface TransportEnvelope<TPayload> {
  payload: TPayload;
  metadata?: TransportMetadata;
}

export interface TransportConnectOptions {
  deadline?: TransportDeadline;
  metadata?: TransportMetadata;
}

export interface TransportSendOptions {
  deadline?: TransportDeadline;
  metadata?: TransportMetadata;
}

export interface TransportCloseInfo {
  code?: number;
  reason?: string;
}

export interface ClientTransportSession {
  connect(options?: TransportConnectOptions): Promise<void>;
  send(
    payload: MCPRequest,
    options?: TransportSendOptions,
  ): Promise<void>;
  recv(handler: (message: TransportEnvelope<MCPResponse>) => void): void;
  close(): Promise<void>;
  onClose?(handler: (info: TransportCloseInfo) => void): void;
  onError?(handler: (error: Error) => void): void;
}

export interface TransportRequestContext {
  metadata?: TransportMetadata;
  deadline?: TransportDeadline;
  requestId?: string;
}

export interface TransportRequestContextHooks {
  onRequest?: (context: TransportRequestContext) => Promise<void> | void;
  onResponse?: (context: TransportRequestContext) => Promise<void> | void;
  onError?: (context: TransportRequestContext, error: Error) => Promise<void> | void;
}

export interface ServerTransportListenOptions {
  interceptors?: TransportRequestContextHooks[];
}

export interface ServerTransportSession {
  listen(options?: ServerTransportListenOptions): Promise<void>;
  accept(
    handler: (
      message: TransportEnvelope<MCPRequest>,
      context: TransportRequestContext,
    ) => Promise<TransportEnvelope<MCPResponse>>,
  ): void;
  close(): Promise<void>;
}

export interface MCPTransportFactory {
  name: MCPTransportName;
  available: boolean;
  createClientSession: (
    config: MCPServerConfig,
  ) => ClientTransportSession;
}
