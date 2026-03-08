"use strict";
// Tests for MCP Client
// Tests JSON-RPC communication, connection handling, and tool execution
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ws_1 = __importDefault(require("ws"));
const client_js_1 = require("../mcp/client.js");
// Mock WebSocket with an explicit factory so default import wiring works in ESM/CJS
globals_1.jest.mock('ws', () => {
    const MockWebSocket = globals_1.jest.fn();
    return {
        __esModule: true,
        default: Object.assign(MockWebSocket, { OPEN: 1 }),
    };
});
const MockWebSocket = ws_1.default;
// Shared mock configuration for all tests
const mockServerConfig = {
    url: 'ws://localhost:8001',
    name: 'test-server',
    authToken: 'test-token',
    tools: [
        {
            name: 'test.tool',
            description: 'Test tool',
            schema: {
                type: 'object',
                properties: {
                    input: { type: 'string' },
                },
                required: ['input'],
            },
            scopes: ['test:read'],
        },
    ],
};
(0, globals_1.describe)('MCPClient', () => {
    let client;
    let registry;
    let mockWs;
    (0, globals_1.beforeEach)(() => {
        MockWebSocket.mockClear();
        registry = new client_js_1.MCPServerRegistry();
        registry.register('test-server', mockServerConfig);
        client = new client_js_1.MCPClient(registry.getAllServers());
        // Setup WebSocket mock
        mockWs = {
            readyState: ws_1.default.OPEN,
            send: globals_1.jest.fn(),
            close: globals_1.jest.fn(),
            on: globals_1.jest.fn().mockReturnThis(),
            once: globals_1.jest.fn().mockReturnThis(),
            removeAllListeners: globals_1.jest.fn().mockReturnThis(),
        };
        MockWebSocket.mockImplementation(() => mockWs);
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('connection management', () => {
        (0, globals_1.test)('connects to MCP server successfully', async () => {
            // Setup connection success
            mockWs.once.mockImplementation((event, callback) => {
                if (event === 'open') {
                    setTimeout(callback, 0);
                }
                return mockWs;
            });
            await (0, globals_1.expect)(client.connect('test-server')).resolves.toBeUndefined();
            (0, globals_1.expect)(MockWebSocket).toHaveBeenCalledWith(mockServerConfig.url, {
                headers: { Authorization: 'Bearer test-token' },
            });
        });
        (0, globals_1.test)('handles connection failure', async () => {
            const error = new Error('Connection failed');
            mockWs.once.mockImplementation((event, callback) => {
                if (event === 'error') {
                    setTimeout(() => callback(error), 0);
                }
                return mockWs;
            });
            await (0, globals_1.expect)(client.connect('test-server')).rejects.toThrow('Connection failed');
        });
        (0, globals_1.test)('throws error for unknown server', async () => {
            await (0, globals_1.expect)(client.connect('unknown-server')).rejects.toThrow("MCP server 'unknown-server' not configured");
        });
        (0, globals_1.test)('disconnects from server', async () => {
            // First connect
            mockWs.once.mockImplementation((event, callback) => {
                if (event === 'open')
                    setTimeout(callback, 0);
                return mockWs;
            });
            await client.connect('test-server');
            // Then disconnect
            await client.disconnect('test-server');
            (0, globals_1.expect)(mockWs.close).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('tool execution', () => {
        (0, globals_1.beforeEach)(async () => {
            // Setup successful connection
            mockWs.once.mockImplementation((event, callback) => {
                if (event === 'open')
                    setTimeout(callback, 0);
                return mockWs;
            });
            await client.connect('test-server');
        });
        (0, globals_1.test)('executes tool successfully', async () => {
            const expectedResult = { success: true, data: 'test-result' };
            // Mock successful tool execution
            const executionPromise = client.executeTool('test-server', 'test.tool', {
                input: 'test',
            });
            // Simulate WebSocket send
            (0, globals_1.expect)(mockWs.send).toHaveBeenCalled();
            const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
            (0, globals_1.expect)(sentMessage.method).toBe('tools/execute');
            (0, globals_1.expect)(sentMessage.params.name).toBe('test.tool');
            // Simulate response
            const messageCall = mockWs.on.mock.calls.find((call) => call[0] === 'message');
            if (!messageCall) {
                throw new Error('Expected message handler to be registered');
            }
            const messageHandler = messageCall[1];
            const response = {
                jsonrpc: '2.0',
                id: sentMessage.id,
                result: expectedResult,
            };
            messageHandler(Buffer.from(JSON.stringify(response)));
            const result = await executionPromise;
            (0, globals_1.expect)(result).toEqual(expectedResult);
        });
        (0, globals_1.test)('handles tool execution error', async () => {
            const executionPromise = client.executeTool('test-server', 'test.tool', {
                input: 'test',
            });
            const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
            // Simulate error response
            const messageCall = mockWs.on.mock.calls.find((call) => call[0] === 'message');
            if (!messageCall) {
                throw new Error('Expected message handler to be registered');
            }
            const messageHandler = messageCall[1];
            const errorResponse = {
                jsonrpc: '2.0',
                id: sentMessage.id,
                error: {
                    code: -32000,
                    message: 'Tool execution failed',
                },
            };
            messageHandler(Buffer.from(JSON.stringify(errorResponse)));
            await (0, globals_1.expect)(executionPromise).rejects.toThrow('MCP Error: Tool execution failed');
        });
        (0, globals_1.test)('validates tool scopes', async () => {
            await (0, globals_1.expect)(client.executeTool('test-server', 'test.tool', { input: 'test' }, [
                'wrong:scope',
            ])).rejects.toThrow('Insufficient scopes');
        });
        (0, globals_1.test)('validates tool existence', async () => {
            await (0, globals_1.expect)(client.executeTool('test-server', 'nonexistent.tool', {})).rejects.toThrow("Tool 'nonexistent.tool' not found");
        });
        (0, globals_1.test)('handles request timeout', async () => {
            const clientWithTimeout = new client_js_1.MCPClient(registry.getAllServers(), {
                timeout: 100,
            });
            mockWs.once.mockImplementation((event, callback) => {
                if (event === 'open')
                    setTimeout(callback, 0);
                return mockWs;
            });
            await clientWithTimeout.connect('test-server');
            const executionPromise = clientWithTimeout.executeTool('test-server', 'test.tool', {
                input: 'test',
            });
            // Don't send response, let it timeout
            await (0, globals_1.expect)(executionPromise).rejects.toThrow('Request timeout');
        });
    });
    (0, globals_1.describe)('server info', () => {
        (0, globals_1.beforeEach)(async () => {
            mockWs.once.mockImplementation((event, callback) => {
                if (event === 'open')
                    setTimeout(callback, 0);
                return mockWs;
            });
            await client.connect('test-server');
        });
        (0, globals_1.test)('retrieves server info', async () => {
            const expectedInfo = {
                name: 'Test Server',
                version: '1.0.0',
            };
            const infoPromise = client.getServerInfo('test-server');
            const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
            (0, globals_1.expect)(sentMessage.method).toBe('server/info');
            const messageCall = mockWs.on.mock.calls.find((call) => call[0] === 'message');
            if (!messageCall) {
                throw new Error('Expected message handler to be registered');
            }
            const messageHandler = messageCall[1];
            const response = {
                jsonrpc: '2.0',
                id: sentMessage.id,
                result: expectedInfo,
            };
            messageHandler(Buffer.from(JSON.stringify(response)));
            const info = await infoPromise;
            (0, globals_1.expect)(info).toEqual(expectedInfo);
        });
        (0, globals_1.test)('lists tools', async () => {
            const tools = await client.listTools('test-server');
            (0, globals_1.expect)(tools).toEqual(mockServerConfig.tools);
        });
    });
    (0, globals_1.describe)('connection status', () => {
        (0, globals_1.test)('reports connection status correctly', async () => {
            // Initially not connected
            (0, globals_1.expect)(client.isConnected('test-server')).toBe(false);
            // After connecting
            mockWs.once.mockImplementation((event, callback) => {
                if (event === 'open')
                    setTimeout(callback, 0);
                return mockWs;
            });
            await client.connect('test-server');
            (0, globals_1.expect)(client.isConnected('test-server')).toBe(true);
            const status = client.getConnectionStatus();
            (0, globals_1.expect)(status['test-server']).toBe(true);
        });
    });
});
(0, globals_1.describe)('MCPServerRegistry', () => {
    let registry;
    (0, globals_1.beforeEach)(() => {
        registry = new client_js_1.MCPServerRegistry();
    });
    (0, globals_1.test)('registers and retrieves servers', () => {
        registry.register('test-server', mockServerConfig);
        const retrieved = registry.getServer('test-server');
        (0, globals_1.expect)(retrieved).toEqual({ ...mockServerConfig, name: 'test-server' });
    });
    (0, globals_1.test)('unregisters servers', () => {
        registry.register('test-server', mockServerConfig);
        registry.unregister('test-server');
        (0, globals_1.expect)(registry.getServer('test-server')).toBeUndefined();
    });
    (0, globals_1.test)('lists all servers', () => {
        registry.register('server1', mockServerConfig);
        registry.register('server2', mockServerConfig);
        const servers = registry.listServers();
        (0, globals_1.expect)(servers).toContain('server1');
        (0, globals_1.expect)(servers).toContain('server2');
    });
    (0, globals_1.test)('finds servers with specific tools', () => {
        const server1Config = {
            ...mockServerConfig,
            tools: [
                {
                    name: 'tool1',
                    description: '',
                    schema: { type: 'object', properties: {} },
                },
            ],
        };
        const server2Config = {
            ...mockServerConfig,
            tools: [
                {
                    name: 'tool2',
                    description: '',
                    schema: { type: 'object', properties: {} },
                },
            ],
        };
        registry.register('server1', server1Config);
        registry.register('server2', server2Config);
        const serversWithTool1 = registry.findServersWithTool('tool1');
        (0, globals_1.expect)(serversWithTool1).toEqual(['server1']);
        const serversWithTool2 = registry.findServersWithTool('tool2');
        (0, globals_1.expect)(serversWithTool2).toEqual(['server2']);
        const serversWithUnknownTool = registry.findServersWithTool('unknown');
        (0, globals_1.expect)(serversWithUnknownTool).toEqual([]);
    });
});
