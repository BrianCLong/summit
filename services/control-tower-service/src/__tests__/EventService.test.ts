/**
 * EventService Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventService } from '../services/EventService';
import { EventStatus, Severity } from '../types/index';

describe('EventService', () => {
  let eventService: EventService;
  let mockRepository: any;
  let mockGraphService: any;
  let mockAIService: any;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findCorrelated: vi.fn(),
      count: vi.fn(),
    };

    mockGraphService = {
      getRelatedEntities: vi.fn().mockResolvedValue([]),
      getContextGraph: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
    };

    mockAIService = {
      getSuggestions: vi.fn().mockResolvedValue([]),
    };

    eventService = new EventService(mockRepository, mockGraphService, mockAIService);
  });

  describe('getEvent', () => {
    it('should return null for non-existent event', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await eventService.getEvent('non-existent', {
        user: { id: '1', name: 'Test', email: 'test@test.com' },
        tenantId: 'tenant-1',
        requestId: 'req-1',
      });

      expect(result).toBeNull();
    });

    it('should enrich event with related entities and suggestions', async () => {
      const mockEvent = {
        id: 'event-1',
        title: 'Test Event',
        severity: Severity.WARNING,
        status: EventStatus.ACTIVE,
      };

      mockRepository.findById.mockResolvedValue(mockEvent);
      mockGraphService.getRelatedEntities.mockResolvedValue([
        { id: 'entity-1', type: 'Customer', name: 'Acme', relationshipType: 'AFFECTED' },
      ]);
      mockAIService.getSuggestions.mockResolvedValue([
        { id: 'sugg-1', type: 'diagnostic', content: 'Check logs', confidence: 0.8 },
      ]);

      const result = await eventService.getEvent('event-1', {
        user: { id: '1', name: 'Test', email: 'test@test.com' },
        tenantId: 'tenant-1',
        requestId: 'req-1',
      });

      expect(result).not.toBeNull();
      expect(result!.relatedEntities).toHaveLength(1);
      expect(result!.suggestions).toHaveLength(1);
    });
  });

  describe('acknowledgeEvent', () => {
    it('should acknowledge an active event', async () => {
      const mockEvent = {
        id: 'event-1',
        status: EventStatus.ACTIVE,
      };

      mockRepository.findById.mockResolvedValue(mockEvent);
      mockRepository.update.mockResolvedValue({
        ...mockEvent,
        status: EventStatus.ACKNOWLEDGED,
        acknowledgedAt: expect.any(Date),
      });

      const result = await eventService.acknowledgeEvent('event-1', 'Investigating', {
        user: { id: '1', name: 'Test User', email: 'test@test.com' },
        tenantId: 'tenant-1',
        requestId: 'req-1',
      });

      expect(mockRepository.update).toHaveBeenCalledWith('event-1', expect.objectContaining({
        status: EventStatus.ACKNOWLEDGED,
      }));
    });

    it('should throw error when event not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        eventService.acknowledgeEvent('non-existent', undefined, {
          user: { id: '1', name: 'Test', email: 'test@test.com' },
          tenantId: 'tenant-1',
          requestId: 'req-1',
        })
      ).rejects.toThrow('Event not found');
    });

    it('should throw error when event already resolved', async () => {
      mockRepository.findById.mockResolvedValue({
        id: 'event-1',
        status: EventStatus.RESOLVED,
      });

      await expect(
        eventService.acknowledgeEvent('event-1', undefined, {
          user: { id: '1', name: 'Test', email: 'test@test.com' },
          tenantId: 'tenant-1',
          requestId: 'req-1',
        })
      ).rejects.toThrow('Cannot acknowledge event in status');
    });
  });

  describe('updateEventStatus', () => {
    it('should update status with valid transition', async () => {
      const mockEvent = {
        id: 'event-1',
        status: EventStatus.ACTIVE,
      };

      mockRepository.findById.mockResolvedValue(mockEvent);
      mockRepository.update.mockResolvedValue({
        ...mockEvent,
        status: EventStatus.INVESTIGATING,
      });

      const result = await eventService.updateEventStatus(
        'event-1',
        EventStatus.INVESTIGATING,
        'Looking into it',
        {
          user: { id: '1', name: 'Test', email: 'test@test.com' },
          tenantId: 'tenant-1',
          requestId: 'req-1',
        }
      );

      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should reject invalid status transition', async () => {
      const mockEvent = {
        id: 'event-1',
        status: EventStatus.RESOLVED,
      };

      mockRepository.findById.mockResolvedValue(mockEvent);

      await expect(
        eventService.updateEventStatus(
          'event-1',
          EventStatus.ACTIVE,
          undefined,
          {
            user: { id: '1', name: 'Test', email: 'test@test.com' },
            tenantId: 'tenant-1',
            requestId: 'req-1',
          }
        )
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('getEventTimeline', () => {
    it('should apply default time range filter', async () => {
      mockRepository.findMany.mockResolvedValue({
        edges: [],
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
        totalCount: 0,
      });

      await eventService.getEventTimeline({}, 50);

      expect(mockRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime: expect.any(Date),
          endTime: expect.any(Date),
        }),
        50,
        undefined
      );
    });
  });
});
