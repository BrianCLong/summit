import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TwinService } from '../src/core/TwinService.js';

describe('TwinService', () => {
  let service: TwinService;
  let mockRepository: any;
  let mockStateEstimator: any;
  let mockEventBus: any;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn<any>(),
      findById: jest.fn<any>(),
      findAll: jest.fn<any>(),
      delete: jest.fn<any>(),
      createNeo4jNode: jest.fn<any>(),
      updateNeo4jNode: jest.fn<any>(),
      deleteNeo4jNode: jest.fn<any>(),
      createNeo4jRelationship: jest.fn<any>(),
    };

    mockStateEstimator = {
      estimate: jest.fn<any>().mockResolvedValue({
        properties: {},
        derived: {},
        confidence: 0.9,
      }),
    };

    mockEventBus = {
      publish: jest.fn<any>(),
      subscribe: jest.fn<any>(),
    };

    service = new TwinService(mockRepository, mockStateEstimator, mockEventBus);
  });

  describe('createTwin', () => {
    it('should create a new digital twin', async () => {
      mockRepository.save.mockResolvedValue(undefined);
      mockRepository.createNeo4jNode.mockResolvedValue('node-123');

      const result = await service.createTwin(
        {
          name: 'Test Twin',
          type: 'ENTITY',
          description: 'A test twin',
        },
        'user-123',
      );

      expect(result.metadata.name).toBe('Test Twin');
      expect(result.metadata.type).toBe('ENTITY');
      expect(result.state).toBe('INITIALIZING');
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should initialize with provided state', async () => {
      mockRepository.save.mockResolvedValue(undefined);
      mockRepository.createNeo4jNode.mockResolvedValue('node-123');

      const result = await service.createTwin(
        {
          name: 'Stateful Twin',
          type: 'SYSTEM',
          initialState: { temperature: 25, pressure: 101 },
        },
        'user-123',
      );

      expect(result.currentStateVector.properties).toEqual({
        temperature: 25,
        pressure: 101,
      });
    });
  });

  describe('getTwin', () => {
    it('should return twin if found', async () => {
      const mockTwin = {
        metadata: { id: 'twin-123', name: 'Test' },
        state: 'ACTIVE',
      };
      mockRepository.findById.mockResolvedValue(mockTwin as any);

      const result = await service.getTwin('twin-123');

      expect(result).toEqual(mockTwin);
      expect(mockRepository.findById).toHaveBeenCalledWith('twin-123');
    });

    it('should return null if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.getTwin('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateState', () => {
    it('should update twin state with estimation', async () => {
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

      mockRepository.findById.mockResolvedValue(mockTwin as any);
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

      expect(result.currentStateVector.properties).toEqual({ value: 15 });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('should throw if twin not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateState({
          twinId: 'nonexistent',
          properties: {},
          source: 'test',
        }),
      ).rejects.toThrow('Twin not found');
    });
  });
});
