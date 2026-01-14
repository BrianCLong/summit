import { SseMessage } from '../sse';
import {
  InvokeArgs,
  PromptDescriptor,
  ResourceDescriptor,
  Session,
  ToolDescriptor,
} from '../types';

export type TransportType = 'http' | 'grpc';

export type TransportSelection = {
  type: TransportType;
  reason: string;
};

export type McpTransportRequest = {
  id?: string;
  method: string;
  params?: Record<string, unknown>;
};

export type McpTransportResponse = {
  id?: string;
  result?: unknown;
  error?: { code: number; message: string; details?: string };
  metadata?: Record<string, string>;
  sessionId?: string;
};

export interface TransportClient {
  type: TransportType;
  connect(toolClass: string, caps?: string[]): Promise<Session>;
  invoke(session: Session, input: InvokeArgs): Promise<unknown>;
  release(session: Session): Promise<void>;
  listTools(): Promise<ToolDescriptor[]>;
  listResources(): Promise<ResourceDescriptor[]>;
  listPrompts(): Promise<PromptDescriptor[]>;
  stream(session: Session): AsyncGenerator<SseMessage>;
  close?(): Promise<void>;
}

export type TransportNegotiationOptions = {
  transport?: TransportType | 'auto';
  grpcAddress?: string;
  grpcPort?: number;
  preferGrpc?: boolean;
  healthTimeoutMs?: number;
};
