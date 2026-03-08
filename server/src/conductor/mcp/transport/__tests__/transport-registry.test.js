"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const MockWebSocket = Object.assign(globals_1.jest.fn(), { OPEN: 1 });
globals_1.jest.unstable_mockModule('ws', () => ({
    __esModule: true,
    default: MockWebSocket,
}));
let createDefaultTransportRegistry;
let selectTransportName;
let WebSocketJsonRpcClientTransport;
const baseConfig = {
    url: 'ws://localhost:8001',
    name: 'test-server',
    authToken: 'test-token',
    tools: [],
};
(0, globals_1.describe)('MCP transport registry', () => {
    (0, globals_1.beforeAll)(async () => {
        const registryModule = await Promise.resolve().then(() => __importStar(require('../registry.js')));
        const websocketModule = await Promise.resolve().then(() => __importStar(require('../websocket-jsonrpc.js')));
        createDefaultTransportRegistry = registryModule.createDefaultTransportRegistry;
        selectTransportName = registryModule.selectTransportName;
        WebSocketJsonRpcClientTransport = websocketModule.WebSocketJsonRpcClientTransport;
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.test)('selects grpc fallback to http when policy allows', () => {
        const registry = createDefaultTransportRegistry();
        const selection = selectTransportName('grpc', 'prefer_grpc_fallback_http', registry);
        (0, globals_1.expect)(selection.name).toBe('http');
        (0, globals_1.expect)(selection.fallbackFrom).toBe('grpc');
        (0, globals_1.expect)(selection.warning).toContain('falling back');
    });
    (0, globals_1.test)('throws when grpc unavailable and strict policy', () => {
        const registry = createDefaultTransportRegistry();
        (0, globals_1.expect)(() => selectTransportName('grpc', 'strict', registry)).toThrow('no fallback');
    });
    (0, globals_1.test)('merges metadata into connect headers without overriding auth', async () => {
        const transport = new WebSocketJsonRpcClientTransport(baseConfig);
        const connectOptions = {
            metadata: {
                'x-trace-id': 'trace-123',
                authorization: 'Bearer override',
            },
        };
        const mockWs = {
            once: globals_1.jest.fn().mockImplementation((event, callback) => {
                if (event === 'open') {
                    setTimeout(callback, 0);
                }
                return mockWs;
            }),
            on: globals_1.jest.fn().mockReturnThis(),
            removeAllListeners: globals_1.jest.fn().mockReturnThis(),
            close: globals_1.jest.fn(),
            readyState: MockWebSocket.OPEN,
        };
        MockWebSocket.mockImplementation(() => mockWs);
        await transport.connect(connectOptions);
        (0, globals_1.expect)(MockWebSocket).toHaveBeenCalledWith(baseConfig.url, {
            headers: {
                Authorization: 'Bearer test-token',
                'x-trace-id': 'trace-123',
            },
        });
    });
});
