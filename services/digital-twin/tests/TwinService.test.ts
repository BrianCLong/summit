import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TwinService } from '../src/core/TwinService.js';
import type { TwinRepository } from '../src/core/TwinRepository.js';
import type { StateEstimator } from '../src/state/StateEstimator.js';
import type { EventBus } from '../src/core/EventBus.js';

describe('TwinService', () => {
  let service: TwinService;
  let mockRepository: jest.Mocked<TwinRepository>;
  let mockStateEstimator: jest.Mocked<StateEstimator>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
      createNeo4jNode: jest.fn(),
      updateNeo4jNode: jest.fn(),
      deleteNeo4jNode: jest.fn(),
      createNeo4jRelationship: jest.fn(),
    } as unknown as jest.Mocked<TwinRepository>;

    mockStateEstimator = {
      estimate: jest.fn().mockResolvedValue({
        properties: {},
        derived: {},
        confidence: 0.9,
      }),
    } as unknown as jest.Mocked<StateEstimator>;

    mockEventBus = {
      publish: jest.fn(),
      subscribe: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

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
