import type { MCPServerConfig } from '../../types/index.js';
import {
  type MCPTransportFactory,
  type MCPTransportName,
  type MCPTransportNegotiationPolicy,
} from './types.js';
import { WebSocketJsonRpcClientTransport } from './websocket-jsonrpc.js';

export interface TransportSelectionResult {
  name: MCPTransportName;
  fallbackFrom?: MCPTransportName;
  warning?: string;
}

export class MCPTransportRegistry {
  private transports = new Map<MCPTransportName, MCPTransportFactory>();

  register(factory: MCPTransportFactory): void {
    this.transports.set(factory.name, factory);
  }

  get(name: MCPTransportName): MCPTransportFactory | undefined {
    return this.transports.get(name);
  }

  isAvailable(name: MCPTransportName): boolean {
    return this.transports.get(name)?.available ?? false;
  }

  createClientSession(
    name: MCPTransportName,
    config: MCPServerConfig,
  ): ReturnType<MCPTransportFactory['createClientSession']> {
    const transport = this.transports.get(name);
    if (!transport) {
      throw new Error(`MCP transport '${name}' is not registered`);
    }
    if (!transport.available) {
      throw new Error(`MCP transport '${name}' is not available`);
    }
    return transport.createClientSession(config);
  }

  list(): MCPTransportName[] {
    return Array.from(this.transports.keys());
  }
}

export function createDefaultTransportRegistry(): MCPTransportRegistry {
  const registry = new MCPTransportRegistry();

  registry.register({
    name: 'jsonrpc',
    available: true,
    createClientSession: (config) => new WebSocketJsonRpcClientTransport(config),
  });

  registry.register({
    name: 'http',
    available: true,
    createClientSession: (config) => new WebSocketJsonRpcClientTransport(config),
  });

  registry.register({
    name: 'grpc',
    available: false,
    createClientSession: () => {
      throw new Error('gRPC transport is not available in this release.');
    },
  });

  registry.register({
    name: 'stdio',
    available: false,
    createClientSession: () => {
      throw new Error('stdio transport is not available in this release.');
    },
  });

  return registry;
}

export function selectTransportName(
  preferred: MCPTransportName,
  policy: MCPTransportNegotiationPolicy,
  registry: MCPTransportRegistry,
): TransportSelectionResult {
  if (registry.isAvailable(preferred)) {
    return { name: preferred };
  }

  if (policy === 'prefer_grpc_fallback_http' && preferred === 'grpc') {
    if (registry.isAvailable('http')) {
      return {
        name: 'http',
        fallbackFrom: 'grpc',
        warning:
          'MCP transport grpc unavailable; falling back to http per policy.',
      };
    }
  }

  throw new Error(
    `MCP transport '${preferred}' is not available and no fallback is allowed.`,
  );
}
