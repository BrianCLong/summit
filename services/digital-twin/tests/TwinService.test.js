"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const TwinService_js_1 = require("../src/core/TwinService.js");
(0, globals_1.describe)('TwinService', () => {
    let service;
    let mockRepository;
    let mockStateEstimator;
    let mockEventBus;
    (0, globals_1.beforeEach)(() => {
        mockRepository = {
            save: globals_1.jest.fn(),
            findById: globals_1.jest.fn(),
            findAll: globals_1.jest.fn(),
            delete: globals_1.jest.fn(),
            createNeo4jNode: globals_1.jest.fn(),
            updateNeo4jNode: globals_1.jest.fn(),
            deleteNeo4jNode: globals_1.jest.fn(),
            createNeo4jRelationship: globals_1.jest.fn(),
        };
        mockStateEstimator = {
            estimate: globals_1.jest.fn().mockResolvedValue({
                properties: {},
                derived: {},
                confidence: 0.9,
            }),
        };
        mockEventBus = {
            publish: globals_1.jest.fn(),
            subscribe: globals_1.jest.fn(),
        };
        service = new TwinService_js_1.TwinService(mockRepository, mockStateEstimator, mockEventBus);
    });
    (0, globals_1.describe)('createTwin', () => {
        (0, globals_1.it)('should create a new digital twin', async () => {
            mockRepository.save.mockResolvedValue(undefined);
            mockRepository.createNeo4jNode.mockResolvedValue('node-123');
            const result = await service.createTwin({
                name: 'Test Twin',
                type: 'ENTITY',
                description: 'A test twin',
            }, 'user-123');
            (0, globals_1.expect)(result.metadata.name).toBe('Test Twin');
            (0, globals_1.expect)(result.metadata.type).toBe('ENTITY');
            (0, globals_1.expect)(result.state).toBe('INITIALIZING');
            (0, globals_1.expect)(mockRepository.save).toHaveBeenCalled();
            (0, globals_1.expect)(mockEventBus.publish).toHaveBeenCalled();
        });
        (0, globals_1.it)('should initialize with provided state', async () => {
            mockRepository.save.mockResolvedValue(undefined);
            mockRepository.createNeo4jNode.mockResolvedValue('node-123');
            const result = await service.createTwin({
                name: 'Stateful Twin',
                type: 'SYSTEM',
                initialState: { temperature: 25, pressure: 101 },
            }, 'user-123');
            (0, globals_1.expect)(result.currentStateVector.properties).toEqual({
                temperature: 25,
                pressure: 101,
            });
        });
    });
    (0, globals_1.describe)('getTwin', () => {
        (0, globals_1.it)('should return twin if found', async () => {
            const mockTwin = {
                metadata: { id: 'twin-123', name: 'Test' },
                state: 'ACTIVE',
            };
            mockRepository.findById.mockResolvedValue(mockTwin);
            const result = await service.getTwin('twin-123');
            (0, globals_1.expect)(result).toEqual(mockTwin);
            (0, globals_1.expect)(mockRepository.findById).toHaveBeenCalledWith('twin-123');
        });
        (0, globals_1.it)('should return null if not found', async () => {
            mockRepository.findById.mockResolvedValue(null);
            const result = await service.getTwin('nonexistent');
            (0, globals_1.expect)(result).toBeNull();
        });
    });
    (0, globals_1.describe)('updateState', () => {
        (0, globals_1.it)('should update twin state with estimation', async () => {
            const mockTwin = {
                metadata: { id: 'twin-123', updatedAt: new Date() },
                state: 'ACTIVE',
                currentStateVector: {
                    timestamp: new Date(),
                    confidence: 0.9,
                    source: 'test',
                    properties: { value: 10 },
                },
                stateHistory: [],
                provenanceChain: [],
            };
            mockRepository.findById.mockResolvedValue(mockTwin);
            mockStateEstimator.estimate.mockResolvedValue({
                properties: { value: 15 },
                derived: { value_velocity: 0.5 },
                confidence: 0.85,
            });
            const result = await service.updateState({
                twinId: 'twin-123',
                properties: { value: 15 },
                source: 'sensor',
            });
            (0, globals_1.expect)(result.currentStateVector.properties).toEqual({ value: 15 });
            (0, globals_1.expect)(mockRepository.save).toHaveBeenCalled();
            (0, globals_1.expect)(mockEventBus.publish).toHaveBeenCalled();
        });
        (0, globals_1.it)('should throw if twin not found', async () => {
            mockRepository.findById.mockResolvedValue(null);
            await (0, globals_1.expect)(service.updateState({
                twinId: 'nonexistent',
                properties: {},
                source: 'test',
            })).rejects.toThrow('Twin not found');
        });
    });
});
