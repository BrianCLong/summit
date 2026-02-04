export type TransportMetadata = Record<string, string>;

export interface ClientTransportSession<Request, Response> {
  connect(): Promise<void>;
  send(request: Request): Promise<void>;
  recv(): Promise<Response>;
  close(): Promise<void>;
  setMetadata(metadata: TransportMetadata): void;
  setDeadline(timeoutMs: number): void;
}

export interface ServerTransportSession<Request, Response> {
  start(handler: (request: Request) => Promise<Response>): Promise<void>;
  close(): Promise<void>;
  setInterceptors?(interceptors: TransportInterceptor[]): void;
}

export type TransportInterceptor = <T>(
  input: T,
  next: () => Promise<T>,
) => Promise<T>;
