// Tests for MCP Client
// Tests JSON-RPC communication, connection handling, and tool execution
import WebSocket from 'ws';
import { MCPClient, MCPServerRegistry } from '../mcp/client';
// Mock WebSocket
jest.mock('ws');
const MockWebSocket = WebSocket;
describe('MCPClient', () => {
    let client;
    let registry;
    let mockWs;
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
    beforeEach(() => {
        registry = new MCPServerRegistry();
        registry.register('test-server', mockServerConfig);
        client = new MCPClient(registry.getAllServers());
        // Setup WebSocket mock
        mockWs = {
            readyState: WebSocket.OPEN,
            send: jest.fn(),
            close: jest.fn(),
            on: jest.fn(),
            once: jest.fn(),
            removeAllListeners: jest.fn(),
        };
        MockWebSocket.mockImplementation(() => mockWs);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('connection management', () => {
        test('connects to MCP server successfully', async () => {
            // Setup connection success
            mockWs.once.mockImplementation((event, callback) => {
                if (event === 'open') {
                    setTimeout(callback, 0);
                }
            });
            await expect(client.connect('test-server')).resolves.toBeUndefined();
            expect(MockWebSocket).toHaveBeenCalledWith(mockServerConfig.url, {
                headers: { Authorization: 'Bearer test-token' },
            });
        });
        test('handles connection failure', async () => {
            const error = new Error('Connection failed');
            mockWs.once.mockImplementation((event, callback) => {
                if (event === 'error') {
                    setTimeout(() => callback(error), 0);
                }
            });
            await expect(client.connect('test-server')).rejects.toThrow('Connection failed');
        });
        test('throws error for unknown server', async () => {
            await expect(client.connect('unknown-server')).rejects.toThrow("MCP server 'unknown-server' not configured");
        });
        test('disconnects from server', async () => {
            // First connect
            mockWs.once.mockImplementation((event, callback) => {
                if (event === 'open')
                    setTimeout(callback, 0);
            });
            await client.connect('test-server');
            // Then disconnect
            await client.disconnect('test-server');
            expect(mockWs.close).toHaveBeenCalled();
        });
    });
    describe('tool execution', () => {
        beforeEach(async () => {
            // Setup successful connection
            mockWs.once.mockImplementation((event, callback) => {
                if (event === 'open')
                    setTimeout(callback, 0);
            });
            await client.connect('test-server');
        });
        test('executes tool successfully', async () => {
            const expectedResult = { success: true, data: 'test-result' };
            // Mock successful tool execution
            const executionPromise = client.executeTool('test-server', 'test.tool', {
                input: 'test',
            });
            // Simulate WebSocket send
            expect(mockWs.send).toHaveBeenCalled();
            const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(sentMessage.method).toBe('tools/execute');
            expect(sentMessage.params.name).toBe('test.tool');
            // Simulate response
            const messageHandler = mockWs.on.mock.calls.find((call) => call[0] === 'message')[1];
            const response = {
                jsonrpc: '2.0',
                id: sentMessage.id,
                result: expectedResult,
            };
            messageHandler(Buffer.from(JSON.stringify(response)));
            const result = await executionPromise;
            expect(result).toEqual(expectedResult);
        });
        test('handles tool execution error', async () => {
            const executionPromise = client.executeTool('test-server', 'test.tool', {
                input: 'test',
            });
            const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
            // Simulate error response
            const messageHandler = mockWs.on.mock.calls.find((call) => call[0] === 'message')[1];
            const errorResponse = {
                jsonrpc: '2.0',
                id: sentMessage.id,
                error: {
                    code: -32000,
                    message: 'Tool execution failed',
                },
            };
            messageHandler(Buffer.from(JSON.stringify(errorResponse)));
            await expect(executionPromise).rejects.toThrow('MCP Error: Tool execution failed');
        });
        test('validates tool scopes', async () => {
            await expect(client.executeTool('test-server', 'test.tool', { input: 'test' }, [
                'wrong:scope',
            ])).rejects.toThrow('Insufficient scopes');
        });
        test('validates tool existence', async () => {
            await expect(client.executeTool('test-server', 'nonexistent.tool', {})).rejects.toThrow("Tool 'nonexistent.tool' not found");
        });
        test('handles request timeout', async () => {
            const clientWithTimeout = new MCPClient(registry.getAllServers(), {
                timeout: 100,
            });
            mockWs.once.mockImplementation((event, callback) => {
                if (event === 'open')
                    setTimeout(callback, 0);
            });
            await clientWithTimeout.connect('test-server');
            const executionPromise = clientWithTimeout.executeTool('test-server', 'test.tool', {
                input: 'test',
            });
            // Don't send response, let it timeout
            await expect(executionPromise).rejects.toThrow('Request timeout');
        });
    });
    describe('server info', () => {
        beforeEach(async () => {
            mockWs.once.mockImplementation((event, callback) => {
                if (event === 'open')
                    setTimeout(callback, 0);
            });
            await client.connect('test-server');
        });
        test('retrieves server info', async () => {
            const expectedInfo = {
                name: 'Test Server',
                version: '1.0.0',
            };
            const infoPromise = client.getServerInfo('test-server');
            const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
            expect(sentMessage.method).toBe('server/info');
            const messageHandler = mockWs.on.mock.calls.find((call) => call[0] === 'message')[1];
            const response = {
                jsonrpc: '2.0',
                id: sentMessage.id,
                result: expectedInfo,
            };
            messageHandler(Buffer.from(JSON.stringify(response)));
            const info = await infoPromise;
            expect(info).toEqual(expectedInfo);
        });
        test('lists tools', async () => {
            const tools = await client.listTools('test-server');
            expect(tools).toEqual(mockServerConfig.tools);
        });
    });
    describe('connection status', () => {
        test('reports connection status correctly', async () => {
            // Initially not connected
            expect(client.isConnected('test-server')).toBe(false);
            // After connecting
            mockWs.once.mockImplementation((event, callback) => {
                if (event === 'open')
                    setTimeout(callback, 0);
            });
            await client.connect('test-server');
            expect(client.isConnected('test-server')).toBe(true);
            const status = client.getConnectionStatus();
            expect(status['test-server']).toBe(true);
        });
    });
});
describe('MCPServerRegistry', () => {
    let registry;
    beforeEach(() => {
        registry = new MCPServerRegistry();
    });
    test('registers and retrieves servers', () => {
        registry.register('test-server', mockServerConfig);
        const retrieved = registry.getServer('test-server');
        expect(retrieved).toEqual({ ...mockServerConfig, name: 'test-server' });
    });
    test('unregisters servers', () => {
        registry.register('test-server', mockServerConfig);
        registry.unregister('test-server');
        expect(registry.getServer('test-server')).toBeUndefined();
    });
    test('lists all servers', () => {
        registry.register('server1', mockServerConfig);
        registry.register('server2', mockServerConfig);
        const servers = registry.listServers();
        expect(servers).toContain('server1');
        expect(servers).toContain('server2');
    });
    test('finds servers with specific tools', () => {
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
        expect(serversWithTool1).toEqual(['server1']);
        const serversWithTool2 = registry.findServersWithTool('tool2');
        expect(serversWithTool2).toEqual(['server2']);
        const serversWithUnknownTool = registry.findServersWithTool('unknown');
        expect(serversWithUnknownTool).toEqual([]);
    });
});
//# sourceMappingURL=mcp-client.test.js.map