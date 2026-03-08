import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ToolbusService, ToolbusExecutionError } from '../../services/ToolbusService.js';
import { Connector, ConnectorAction } from '@intelgraph/connector-sdk';

describe('ToolbusService', () => {
    let toolbus: ToolbusService;
    let mockConnector: Connector;

    beforeEach(() => {
        toolbus = new ToolbusService();
        mockConnector = {
            manifest: {
                id: 'mock-connector',
                name: 'Mock Connector',
                version: '1.0.0',
                description: 'Mock',
                status: 'stable',
                category: 'test',
                capabilities: ['action'],
                entityTypes: [],
                relationshipTypes: [],
                authentication: ['none'],
                configSchema: {},
                requiredSecrets: [],
                license: 'MIT',
                maintainer: 'Test'
            },
            initialize: jest.fn(),
            testConnection: jest.fn(),
            shutdown: jest.fn(),
            execute: jest.fn(),
            getActions: jest.fn(),
        } as unknown as Connector;
    });

    it('should register a connector', () => {
        expect(() => toolbus.registerConnector(mockConnector)).not.toThrow();
    });

    it('should execute a valid action', async () => {
        toolbus.registerConnector(mockConnector);
        const actionDef: ConnectorAction = {
            name: 'testAction',
            description: 'Test',
            inputSchema: { type: 'object', properties: { foo: { type: 'string' } } },
            outputSchema: {}
        };
        (mockConnector.getActions as any).mockResolvedValue([actionDef]);
        (mockConnector.execute as any).mockResolvedValue({ success: true, durationMs: 10 });

        const result = await toolbus.executeTool('mock-connector', 'testAction', { foo: 'bar' }, {});
        expect(result.success).toBe(true);
        expect(mockConnector.execute).toHaveBeenCalledWith('testAction', { foo: 'bar' }, expect.anything());
    });

    it('should fail on invalid params', async () => {
        toolbus.registerConnector(mockConnector);
        const actionDef: ConnectorAction = {
            name: 'testAction',
            description: 'Test',
            inputSchema: { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
            outputSchema: {}
        };
        (mockConnector.getActions as any).mockResolvedValue([actionDef]);

        await expect(toolbus.executeTool('mock-connector', 'testAction', {}, {}))
            .rejects.toThrow('Invalid parameters');
    });

    it('should retry on failure', async () => {
        toolbus.registerConnector(mockConnector);
        (mockConnector.getActions as any).mockResolvedValue([]);

        const error = new Error('Transient error');
        (error as any).retryable = true;

        (mockConnector.execute as any)
            .mockRejectedValueOnce(error)
            .mockResolvedValue({ success: true, durationMs: 10 });

        const result = await toolbus.executeTool('mock-connector', 'testAction', {}, {});
        expect(result.success).toBe(true);
        expect(mockConnector.execute).toHaveBeenCalledTimes(2);
    });

    it('should throw on missing capability', async () => {
        mockConnector.manifest.capabilities = ['pull'];
        toolbus.registerConnector(mockConnector);
        await expect(toolbus.executeTool('mock-connector', 'testAction', {}, {}))
            .rejects.toThrow('does not support actions');
    });
});
