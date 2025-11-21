/**
 * Tests for EventSourcingService
 */

import { Pool } from 'pg';
import { EventSourcingService, DomainEvent, StoredEvent } from '../EventSourcingService';

// Mock pg Pool
jest.mock('pg');

describe('EventSourcingService', () => {
  let mockPool: jest.Mocked<Pool>;
  let service: EventSourcingService;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
    } as any;

    service = new EventSourcingService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('appendEvent', () => {
    it('should append an event to the event store', async () => {
      const event: DomainEvent = {
        eventType: 'CaseCreated',
        aggregateType: 'case',
        aggregateId: 'case-123',
        eventData: {
          title: 'Test Case',
          status: 'ACTIVE',
        },
        tenantId: 'tenant-123',
        userId: 'user-456',
        correlationId: 'corr-789',
      };

      mockPool.query
        // First query: get current version
        .mockResolvedValueOnce({ rows: [{ version: 0 }] } as any)
        // Second query: insert event
        .mockResolvedValueOnce({
          rows: [
            {
              event_id: 'event-123',
              event_type: 'CaseCreated',
              aggregate_type: 'case',
              aggregate_id: 'case-123',
              aggregate_version: 1,
              event_data: event.eventData,
              event_metadata: {},
              tenant_id: 'tenant-123',
              user_id: 'user-456',
              correlation_id: 'corr-789',
              event_hash: 'hash-123',
              previous_event_hash: null,
              event_timestamp: new Date(),
              created_at: new Date(),
            },
          ],
        } as any);

      const result = await service.appendEvent(event);

      expect(result).toBeDefined();
      expect(result.eventType).toBe('CaseCreated');
      expect(result.aggregateVersion).toBe(1);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should increment aggregate version for subsequent events', async () => {
      const event: DomainEvent = {
        eventType: 'CaseUpdated',
        aggregateType: 'case',
        aggregateId: 'case-123',
        eventData: { status: 'CLOSED' },
        tenantId: 'tenant-123',
        userId: 'user-456',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ version: 5 }] } as any) // Current version is 5
        .mockResolvedValueOnce({
          rows: [
            {
              event_id: 'event-124',
              event_type: 'CaseUpdated',
              aggregate_type: 'case',
              aggregate_id: 'case-123',
              aggregate_version: 6, // Should be 6
              event_data: event.eventData,
              event_metadata: {},
              tenant_id: 'tenant-123',
              user_id: 'user-456',
              event_hash: 'hash-124',
              previous_event_hash: 'hash-123',
              event_timestamp: new Date(),
              created_at: new Date(),
            },
          ],
        } as any);

      const result = await service.appendEvent(event);

      expect(result.aggregateVersion).toBe(6);
    });

    it('should create hash chain between events', async () => {
      // First event
      const event1: DomainEvent = {
        eventType: 'CaseCreated',
        aggregateType: 'case',
        aggregateId: 'case-123',
        eventData: { title: 'Test' },
        tenantId: 'tenant-123',
        userId: 'user-456',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ version: 0 }] } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              event_id: 'event-1',
              event_hash: 'hash-1',
              previous_event_hash: null,
              aggregate_version: 1,
              event_type: 'CaseCreated',
              aggregate_type: 'case',
              aggregate_id: 'case-123',
              event_data: event1.eventData,
              event_metadata: {},
              tenant_id: 'tenant-123',
              user_id: 'user-456',
              event_timestamp: new Date(),
              created_at: new Date(),
            },
          ],
        } as any);

      const result1 = await service.appendEvent(event1);

      expect(result1.previousEventHash).toBeUndefined();
      expect(result1.eventHash).toBe('hash-1');
    });
  });

  describe('getAggregateEvents', () => {
    it('should retrieve all events for an aggregate', async () => {
      const mockEvents = [
        {
          event_id: 'event-1',
          event_type: 'CaseCreated',
          aggregate_type: 'case',
          aggregate_id: 'case-123',
          aggregate_version: 1,
          event_data: { title: 'Test' },
          event_metadata: {},
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          event_hash: 'hash-1',
          event_timestamp: new Date(),
          created_at: new Date(),
        },
        {
          event_id: 'event-2',
          event_type: 'CaseUpdated',
          aggregate_type: 'case',
          aggregate_id: 'case-123',
          aggregate_version: 2,
          event_data: { status: 'CLOSED' },
          event_metadata: {},
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          event_hash: 'hash-2',
          previous_event_hash: 'hash-1',
          event_timestamp: new Date(),
          created_at: new Date(),
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockEvents } as any);

      const events = await service.getAggregateEvents('case', 'case-123');

      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe('CaseCreated');
      expect(events[1].eventType).toBe('CaseUpdated');
    });

    it('should retrieve events from a specific version', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await service.getAggregateEvents('case', 'case-123', 5);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('aggregate_version > $3'),
        ['case', 'case-123', 5]
      );
    });
  });

  describe('reconstructAggregate', () => {
    it('should reconstruct aggregate state from events', async () => {
      interface CaseState {
        id: string;
        title: string;
        status: string;
      }

      const reducer = (state: CaseState, event: StoredEvent): CaseState => {
        switch (event.eventType) {
          case 'CaseCreated':
            return {
              ...state,
              id: event.aggregateId,
              title: event.eventData.title,
              status: event.eventData.status,
            };
          case 'CaseUpdated':
            return {
              ...state,
              ...event.eventData,
            };
          default:
            return state;
        }
      };

      const mockEvents = [
        {
          event_id: 'event-1',
          event_type: 'CaseCreated',
          aggregate_type: 'case',
          aggregate_id: 'case-123',
          aggregate_version: 1,
          event_data: { title: 'Test Case', status: 'ACTIVE' },
          event_metadata: {},
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          event_hash: 'hash-1',
          event_timestamp: new Date(),
          created_at: new Date(),
        },
        {
          event_id: 'event-2',
          event_type: 'CaseUpdated',
          aggregate_type: 'case',
          aggregate_id: 'case-123',
          aggregate_version: 2,
          event_data: { status: 'CLOSED' },
          event_metadata: {},
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          event_hash: 'hash-2',
          previous_event_hash: 'hash-1',
          event_timestamp: new Date(),
          created_at: new Date(),
        },
      ];

      // Mock snapshot retrieval (no snapshot)
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      // Mock events retrieval
      mockPool.query.mockResolvedValueOnce({ rows: mockEvents } as any);

      // Mock version retrieval
      mockPool.query.mockResolvedValueOnce({ rows: [{ version: 2 }] } as any);

      const { state, version } = await service.reconstructAggregate(
        'case',
        'case-123',
        reducer,
        { id: '', title: '', status: '' }
      );

      expect(state.id).toBe('case-123');
      expect(state.title).toBe('Test Case');
      expect(state.status).toBe('CLOSED');
      expect(version).toBe(2);
    });
  });

  describe('verifyIntegrity', () => {
    it('should verify event store integrity', async () => {
      const mockEvents = [
        {
          event_id: 'event-1',
          event_type: 'CaseCreated',
          aggregate_type: 'case',
          aggregate_id: 'case-123',
          aggregate_version: 1,
          event_data: { title: 'Test' },
          event_metadata: {},
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          event_hash: 'valid-hash-1',
          previous_event_hash: null,
          event_timestamp: new Date('2025-01-01'),
          created_at: new Date('2025-01-01'),
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockEvents } as any);

      const result = await service.verifyIntegrity('tenant-123');

      expect(result.valid).toBe(true);
      expect(result.totalEvents).toBe(1);
      expect(result.validEvents).toBe(1);
      expect(result.invalidEvents).toHaveLength(0);
    });

    it('should detect integrity violations', async () => {
      const mockEvents = [
        {
          event_id: 'event-1',
          event_type: 'CaseCreated',
          aggregate_type: 'case',
          aggregate_id: 'case-123',
          aggregate_version: 1,
          event_data: { title: 'Test' },
          event_metadata: {},
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          event_hash: 'valid-hash-1',
          previous_event_hash: null,
          event_timestamp: new Date('2025-01-01'),
          created_at: new Date('2025-01-01'),
        },
        {
          event_id: 'event-2',
          event_type: 'CaseUpdated',
          aggregate_type: 'case',
          aggregate_id: 'case-123',
          aggregate_version: 2,
          event_data: { status: 'CLOSED' },
          event_metadata: {},
          tenant_id: 'tenant-123',
          user_id: 'user-456',
          event_hash: 'valid-hash-2',
          previous_event_hash: 'wrong-hash', // Chain violation
          event_timestamp: new Date('2025-01-02'),
          created_at: new Date('2025-01-02'),
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockEvents } as any);

      const result = await service.verifyIntegrity('tenant-123');

      expect(result.valid).toBe(false);
      expect(result.invalidEvents.length).toBeGreaterThan(0);
    });
  });

  describe('createSnapshot', () => {
    it('should create a snapshot of aggregate state', async () => {
      const snapshot = {
        aggregateType: 'case',
        aggregateId: 'case-123',
        aggregateVersion: 100,
        snapshotData: {
          id: 'case-123',
          title: 'Test Case',
          status: 'ACTIVE',
        },
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: 100 }] } as any) // Event count
        .mockResolvedValueOnce({ rows: [] } as any); // Insert snapshot

      await service.createSnapshot(snapshot);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO event_snapshots'),
        expect.any(Array)
      );
    });
  });

  describe('queryEvents', () => {
    it('should query events with filters', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as any);

      await service.queryEvents({
        tenantId: 'tenant-123',
        eventType: 'CaseCreated',
        userId: 'user-456',
        startTime: new Date('2025-01-01'),
        endTime: new Date('2025-12-31'),
        limit: 100,
      });

      const callArgs = mockPool.query.mock.calls[0];
      expect(callArgs[0]).toContain('event_type = $');
      expect(callArgs[0]).toContain('user_id = $');
      expect(callArgs[0]).toContain('event_timestamp >= $');
      expect(callArgs[0]).toContain('event_timestamp <= $');
      expect(callArgs[0]).toContain('LIMIT');
    });
  });
});
