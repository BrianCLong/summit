"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const ToolbusService_js_1 = require("../../services/ToolbusService.js");
(0, globals_1.describe)('ToolbusService', () => {
    let toolbus;
    let mockConnector;
    (0, globals_1.beforeEach)(() => {
        toolbus = new ToolbusService_js_1.ToolbusService();
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
            initialize: globals_1.jest.fn(),
            testConnection: globals_1.jest.fn(),
            shutdown: globals_1.jest.fn(),
            execute: globals_1.jest.fn(),
            getActions: globals_1.jest.fn(),
        };
    });
    (0, globals_1.it)('should register a connector', () => {
        (0, globals_1.expect)(() => toolbus.registerConnector(mockConnector)).not.toThrow();
    });
    (0, globals_1.it)('should execute a valid action', async () => {
        toolbus.registerConnector(mockConnector);
        const actionDef = {
            name: 'testAction',
            description: 'Test',
            inputSchema: { type: 'object', properties: { foo: { type: 'string' } } },
            outputSchema: {}
        };
        mockConnector.getActions.mockResolvedValue([actionDef]);
        mockConnector.execute.mockResolvedValue({ success: true, durationMs: 10 });
        const result = await toolbus.executeTool('mock-connector', 'testAction', { foo: 'bar' }, {});
        (0, globals_1.expect)(result.success).toBe(true);
        (0, globals_1.expect)(mockConnector.execute).toHaveBeenCalledWith('testAction', { foo: 'bar' }, globals_1.expect.anything());
    });
    (0, globals_1.it)('should fail on invalid params', async () => {
        toolbus.registerConnector(mockConnector);
        const actionDef = {
            name: 'testAction',
            description: 'Test',
            inputSchema: { type: 'object', properties: { foo: { type: 'string' } }, required: ['foo'] },
            outputSchema: {}
        };
        mockConnector.getActions.mockResolvedValue([actionDef]);
        await (0, globals_1.expect)(toolbus.executeTool('mock-connector', 'testAction', {}, {}))
            .rejects.toThrow('Invalid parameters');
    });
    (0, globals_1.it)('should retry on failure', async () => {
        toolbus.registerConnector(mockConnector);
        mockConnector.getActions.mockResolvedValue([]);
        const error = new Error('Transient error');
        error.retryable = true;
        mockConnector.execute
            .mockRejectedValueOnce(error)
            .mockResolvedValue({ success: true, durationMs: 10 });
        const result = await toolbus.executeTool('mock-connector', 'testAction', {}, {});
        (0, globals_1.expect)(result.success).toBe(true);
        (0, globals_1.expect)(mockConnector.execute).toHaveBeenCalledTimes(2);
    });
    (0, globals_1.it)('should throw on missing capability', async () => {
        mockConnector.manifest.capabilities = ['pull'];
        toolbus.registerConnector(mockConnector);
        await (0, globals_1.expect)(toolbus.executeTool('mock-connector', 'testAction', {}, {}))
            .rejects.toThrow('does not support actions');
    });
});
