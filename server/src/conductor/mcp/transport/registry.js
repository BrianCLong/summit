"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPTransportRegistry = void 0;
exports.createDefaultTransportRegistry = createDefaultTransportRegistry;
exports.selectTransportName = selectTransportName;
const websocket_jsonrpc_js_1 = require("./websocket-jsonrpc.js");
class MCPTransportRegistry {
    transports = new Map();
    register(factory) {
        this.transports.set(factory.name, factory);
    }
    get(name) {
        return this.transports.get(name);
    }
    isAvailable(name) {
        return this.transports.get(name)?.available ?? false;
    }
    createClientSession(name, config) {
        const transport = this.transports.get(name);
        if (!transport) {
            throw new Error(`MCP transport '${name}' is not registered`);
        }
        if (!transport.available) {
            throw new Error(`MCP transport '${name}' is not available`);
        }
        return transport.createClientSession(config);
    }
    list() {
        return Array.from(this.transports.keys());
    }
}
exports.MCPTransportRegistry = MCPTransportRegistry;
function createDefaultTransportRegistry() {
    const registry = new MCPTransportRegistry();
    registry.register({
        name: 'jsonrpc',
        available: true,
        createClientSession: (config) => new websocket_jsonrpc_js_1.WebSocketJsonRpcClientTransport(config),
    });
    registry.register({
        name: 'http',
        available: true,
        createClientSession: (config) => new websocket_jsonrpc_js_1.WebSocketJsonRpcClientTransport(config),
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
function selectTransportName(preferred, policy, registry) {
    if (registry.isAvailable(preferred)) {
        return { name: preferred };
    }
    if (policy === 'prefer_grpc_fallback_http' && preferred === 'grpc') {
        if (registry.isAvailable('http')) {
            return {
                name: 'http',
                fallbackFrom: 'grpc',
                warning: 'MCP transport grpc unavailable; falling back to http per policy.',
            };
        }
    }
    throw new Error(`MCP transport '${preferred}' is not available and no fallback is allowed.`);
}
