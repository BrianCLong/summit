import { jest, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import type { MCPServerConfig } from '../../../types/index.js';
import type { TransportConnectOptions } from '../types.js';

const MockWebSocket = Object.assign(jest.fn(), { OPEN: 1 });

jest.unstable_mockModule('ws', () => ({
  __esModule: true,
  default: MockWebSocket,
}));

let createDefaultTransportRegistry: any;
let selectTransportName: any;
let WebSocketJsonRpcClientTransport: any;

const baseConfig: MCPServerConfig = {
  url: 'ws://localhost:8001',
  name: 'test-server',
  authToken: 'test-token',
  tools: [],
};

describe('MCP transport registry', () => {
  beforeAll(async () => {
    const registryModule = await import('../registry.js');
    const websocketModule = await import('../websocket-jsonrpc.js');

    createDefaultTransportRegistry = registryModule.createDefaultTransportRegistry;
    selectTransportName = registryModule.selectTransportName;
    WebSocketJsonRpcClientTransport = websocketModule.WebSocketJsonRpcClientTransport;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('selects grpc fallback to http when policy allows', () => {
    const registry = createDefaultTransportRegistry();

    const selection = selectTransportName(
      'grpc',
      'prefer_grpc_fallback_http',
      registry,
    );

    expect(selection.name).toBe('http');
    expect(selection.fallbackFrom).toBe('grpc');
    expect(selection.warning).toContain('falling back');
  });

  test('throws when grpc unavailable and strict policy', () => {
    const registry = createDefaultTransportRegistry();

    expect(() =>
      selectTransportName('grpc', 'strict', registry),
    ).toThrow('no fallback');
  });

  test('merges metadata into connect headers without overriding auth', async () => {
    const transport = new WebSocketJsonRpcClientTransport(baseConfig);
    const connectOptions: TransportConnectOptions = {
      metadata: {
        'x-trace-id': 'trace-123',
        authorization: 'Bearer override',
      },
    };

    const mockWs = {
      once: jest.fn().mockImplementation((event: string, callback: () => void) => {
        if (event === 'open') {
          setTimeout(callback, 0);
        }
        return mockWs;
      }),
      on: jest.fn().mockReturnThis(),
      removeAllListeners: jest.fn().mockReturnThis(),
      close: jest.fn(),
      readyState: MockWebSocket.OPEN,
    };

    (MockWebSocket as jest.Mock).mockImplementation(() => mockWs);

    await transport.connect(connectOptions);

    expect(MockWebSocket).toHaveBeenCalledWith(baseConfig.url, {
      headers: {
        Authorization: 'Bearer test-token',
        'x-trace-id': 'trace-123',
      },
    });
  });
});
