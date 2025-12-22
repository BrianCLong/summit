/**
 * Standard Log Field Contract
 */
export interface LogSchema {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;

  // Context
  service: string;
  environment: string;
  version: string;

  // Tracing
  correlationId?: string;
  traceId?: string;
  spanId?: string;

  // Request
  requestId?: string;
  http?: {
    method: string;
    url: string;
    status_code?: number;
    user_agent?: string;
    remote_ip?: string;
  };

  // Error
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };

  // Metadata
  [key: string]: unknown;
}
