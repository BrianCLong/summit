"use strict";
/**
 * Tests for EventSourcingService
 */
Object.defineProperty(exports, "__esModule", { value: true });
const EventSourcingService_js_1 = require("../EventSourcingService.js");
const globals_1 = require("@jest/globals");
// Mock pg Pool
globals_1.jest.mock('pg');
(0, globals_1.describe)('EventSourcingService', () => {
    let mockPool;
    let service;
    (0, globals_1.beforeEach)(async () => {
        mockPool = {
            query: globals_1.jest.fn().mockResolvedValue({ rows: [] }), // Default mock for constructor's initializeLastEventHash
            connect: globals_1.jest.fn(),
        };
        service = new EventSourcingService_js_1.EventSourcingService(mockPool);
        // Wait for constructor's async initializeLastEventHash to complete
        await new Promise((resolve) => setTimeout(resolve, 10));
        // Clear call count but keep implementation
        mockPool.query.mockClear();
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.resetAllMocks();
    });
    (0, globals_1.describe)('appendEvent', () => {
        (0, globals_1.it)('should append an event to the event store', async () => {
            const event = {
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
                .mockResolvedValueOnce({ rows: [{ version: 0 }] })
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
            });
            const result = await service.appendEvent(event);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.eventType).toBe('CaseCreated');
            (0, globals_1.expect)(result.aggregateVersion).toBe(1);
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledTimes(2);
        });
        (0, globals_1.it)('should increment aggregate version for subsequent events', async () => {
            const event = {
                eventType: 'CaseUpdated',
                aggregateType: 'case',
                aggregateId: 'case-123',
                eventData: { status: 'CLOSED' },
                tenantId: 'tenant-123',
                userId: 'user-456',
            };
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ version: 5 }] }) // Current version is 5
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
            });
            const result = await service.appendEvent(event);
            (0, globals_1.expect)(result.aggregateVersion).toBe(6);
        });
        (0, globals_1.it)('should create hash chain between events', async () => {
            // First event
            const event1 = {
                eventType: 'CaseCreated',
                aggregateType: 'case',
                aggregateId: 'case-123',
                eventData: { title: 'Test' },
                tenantId: 'tenant-123',
                userId: 'user-456',
            };
            mockPool.query
                .mockResolvedValueOnce({ rows: [{ version: 0 }] })
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
            });
            const result1 = await service.appendEvent(event1);
            (0, globals_1.expect)(result1.previousEventHash).toBeUndefined();
            (0, globals_1.expect)(result1.eventHash).toBe('hash-1');
        });
    });
    (0, globals_1.describe)('getAggregateEvents', () => {
        (0, globals_1.it)('should retrieve all events for an aggregate', async () => {
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
            mockPool.query.mockResolvedValueOnce({ rows: mockEvents });
            const events = await service.getAggregateEvents('case', 'case-123');
            (0, globals_1.expect)(events).toHaveLength(2);
            (0, globals_1.expect)(events[0].eventType).toBe('CaseCreated');
            (0, globals_1.expect)(events[1].eventType).toBe('CaseUpdated');
        });
        (0, globals_1.it)('should retrieve events from a specific version', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            await service.getAggregateEvents('case', 'case-123', 5);
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('aggregate_version > $3'), ['case', 'case-123', 5]);
        });
    });
    (0, globals_1.describe)('reconstructAggregate', () => {
        (0, globals_1.it)('should reconstruct aggregate state from events', async () => {
            const reducer = (state, event) => {
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
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            // Mock events retrieval
            mockPool.query.mockResolvedValueOnce({ rows: mockEvents });
            // Mock version retrieval
            mockPool.query.mockResolvedValueOnce({ rows: [{ version: 2 }] });
            const { state, version } = await service.reconstructAggregate('case', 'case-123', reducer, { id: '', title: '', status: '' });
            (0, globals_1.expect)(state.id).toBe('case-123');
            (0, globals_1.expect)(state.title).toBe('Test Case');
            (0, globals_1.expect)(state.status).toBe('CLOSED');
            (0, globals_1.expect)(version).toBe(2);
        });
    });
    (0, globals_1.describe)('verifyIntegrity', () => {
        (0, globals_1.it)('should verify event store integrity', async () => {
            // Hash calculated for these exact event fields using SHA-256
            const expectedHash = '0626259b68b11402af8fdfb126d1ac887b3ee1a01be7fcd72ab4780b7a2b4d07';
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
                    event_hash: expectedHash,
                    previous_event_hash: null,
                    event_timestamp: new Date('2025-01-01'),
                    created_at: new Date('2025-01-01'),
                },
            ];
            mockPool.query.mockResolvedValueOnce({ rows: mockEvents });
            const result = await service.verifyIntegrity('tenant-123');
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.totalEvents).toBe(1);
            (0, globals_1.expect)(result.validEvents).toBe(1);
            (0, globals_1.expect)(result.invalidEvents).toHaveLength(0);
        });
        (0, globals_1.it)('should detect integrity violations', async () => {
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
            mockPool.query.mockResolvedValueOnce({ rows: mockEvents });
            const result = await service.verifyIntegrity('tenant-123');
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.invalidEvents.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('createSnapshot', () => {
        (0, globals_1.it)('should create a snapshot of aggregate state', async () => {
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
                .mockResolvedValueOnce({ rows: [{ count: 100 }] }) // Event count
                .mockResolvedValueOnce({ rows: [] }); // Insert snapshot
            await service.createSnapshot(snapshot);
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledTimes(2);
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO event_snapshots'), globals_1.expect.any(Array));
        });
    });
    (0, globals_1.describe)('queryEvents', () => {
        (0, globals_1.it)('should query events with filters', async () => {
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            await service.queryEvents({
                tenantId: 'tenant-123',
                eventType: 'CaseCreated',
                userId: 'user-456',
                startTime: new Date('2025-01-01'),
                endTime: new Date('2025-12-31'),
                limit: 100,
            });
            const callArgs = mockPool.query.mock.calls[0];
            (0, globals_1.expect)(callArgs[0]).toContain('event_type = $');
            (0, globals_1.expect)(callArgs[0]).toContain('user_id = $');
            (0, globals_1.expect)(callArgs[0]).toContain('event_timestamp >= $');
            (0, globals_1.expect)(callArgs[0]).toContain('event_timestamp <= $');
            (0, globals_1.expect)(callArgs[0]).toContain('LIMIT');
        });
    });
});
