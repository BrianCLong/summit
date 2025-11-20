/**
 * Protocol Handler Middleware
 *
 * Handles multiple protocols: HTTP/HTTPS, WebSocket, gRPC
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('protocol-handler');

export enum Protocol {
  HTTP = 'HTTP',
  HTTPS = 'HTTPS',
  WEBSOCKET = 'WEBSOCKET',
  GRPC = 'GRPC',
  HTTP2 = 'HTTP2',
}

export interface ProtocolHandlerConfig {
  supportedProtocols: Protocol[];
  websocket?: {
    enabled: boolean;
    pingInterval?: number;
    maxPayload?: number;
  };
  grpc?: {
    enabled: boolean;
    protoPath?: string;
  };
  http2?: {
    enabled: boolean;
    maxSessionMemory?: number;
  };
}

export class ProtocolHandler {
  private config: ProtocolHandlerConfig;

  constructor(config: ProtocolHandlerConfig) {
    this.config = config;
  }

  detectProtocol(req: IncomingMessage): Protocol {
    // Check for WebSocket upgrade
    if (this.isWebSocketUpgrade(req)) {
      return Protocol.WEBSOCKET;
    }

    // Check for gRPC (content-type: application/grpc)
    const contentType = req.headers['content-type'];
    if (contentType?.includes('application/grpc')) {
      return Protocol.GRPC;
    }

    // Check for HTTP/2
    if (req.httpVersion === '2.0') {
      return Protocol.HTTP2;
    }

    // Default to HTTP/HTTPS
    return req.socket.encrypted ? Protocol.HTTPS : Protocol.HTTP;
  }

  isSupported(protocol: Protocol): boolean {
    return this.config.supportedProtocols.includes(protocol);
  }

  private isWebSocketUpgrade(req: IncomingMessage): boolean {
    return (
      req.headers.upgrade?.toLowerCase() === 'websocket' &&
      req.headers.connection?.toLowerCase().includes('upgrade')
    );
  }

  async handleProtocol(
    req: IncomingMessage,
    res: ServerResponse,
    protocol: Protocol
  ): Promise<void> {
    if (!this.isSupported(protocol)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Protocol not supported' }));
      return;
    }

    logger.debug('Handling protocol', { protocol, url: req.url });

    switch (protocol) {
      case Protocol.HTTP:
      case Protocol.HTTPS:
        return this.handleHTTP(req, res);
      case Protocol.WEBSOCKET:
        return this.handleWebSocket(req, res);
      case Protocol.GRPC:
        return this.handleGRPC(req, res);
      case Protocol.HTTP2:
        return this.handleHTTP2(req, res);
    }
  }

  private async handleHTTP(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // HTTP handling is done by the main gateway
    logger.debug('HTTP request', { method: req.method, url: req.url });
  }

  private async handleWebSocket(req: IncomingMessage, res: ServerResponse): Promise<void> {
    logger.info('WebSocket upgrade requested', { url: req.url });
    // WebSocket upgrade handling would be implemented here
    // This would typically use the 'ws' library
  }

  private async handleGRPC(req: IncomingMessage, res: ServerResponse): Promise<void> {
    logger.info('gRPC request', { url: req.url });
    // gRPC handling would be implemented here
    // This would typically use @grpc/grpc-js
  }

  private async handleHTTP2(req: IncomingMessage, res: ServerResponse): Promise<void> {
    logger.debug('HTTP/2 request', { method: req.method, url: req.url });
    // HTTP/2 specific handling
  }
}
