"use strict";
/**
 * EventService Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const EventService_1 = require("../services/EventService");
const index_1 = require("../types/index");
(0, vitest_1.describe)('EventService', () => {
    let eventService;
    let mockRepository;
    let mockGraphService;
    let mockAIService;
    (0, vitest_1.beforeEach)(() => {
        mockRepository = {
            findById: vitest_1.vi.fn(),
            findMany: vitest_1.vi.fn(),
            create: vitest_1.vi.fn(),
            update: vitest_1.vi.fn(),
            findCorrelated: vitest_1.vi.fn(),
            count: vitest_1.vi.fn(),
        };
        mockGraphService = {
            getRelatedEntities: vitest_1.vi.fn().mockResolvedValue([]),
            getContextGraph: vitest_1.vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
        };
        mockAIService = {
            getSuggestions: vitest_1.vi.fn().mockResolvedValue([]),
        };
        eventService = new EventService_1.EventService(mockRepository, mockGraphService, mockAIService);
    });
    (0, vitest_1.describe)('getEvent', () => {
        (0, vitest_1.it)('should return null for non-existent event', async () => {
            mockRepository.findById.mockResolvedValue(null);
            const result = await eventService.getEvent('non-existent', {
                user: { id: '1', name: 'Test', email: 'test@test.com' },
                tenantId: 'tenant-1',
                requestId: 'req-1',
            });
            (0, vitest_1.expect)(result).toBeNull();
        });
        (0, vitest_1.it)('should enrich event with related entities and suggestions', async () => {
            const mockEvent = {
                id: 'event-1',
                title: 'Test Event',
                severity: index_1.Severity.WARNING,
                status: index_1.EventStatus.ACTIVE,
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
            (0, vitest_1.expect)(result).not.toBeNull();
            (0, vitest_1.expect)(result.relatedEntities).toHaveLength(1);
            (0, vitest_1.expect)(result.suggestions).toHaveLength(1);
        });
    });
    (0, vitest_1.describe)('acknowledgeEvent', () => {
        (0, vitest_1.it)('should acknowledge an active event', async () => {
            const mockEvent = {
                id: 'event-1',
                status: index_1.EventStatus.ACTIVE,
            };
            mockRepository.findById.mockResolvedValue(mockEvent);
            mockRepository.update.mockResolvedValue({
                ...mockEvent,
                status: index_1.EventStatus.ACKNOWLEDGED,
                acknowledgedAt: vitest_1.expect.any(Date),
            });
            const result = await eventService.acknowledgeEvent('event-1', 'Investigating', {
                user: { id: '1', name: 'Test User', email: 'test@test.com' },
                tenantId: 'tenant-1',
                requestId: 'req-1',
            });
            (0, vitest_1.expect)(mockRepository.update).toHaveBeenCalledWith('event-1', vitest_1.expect.objectContaining({
                status: index_1.EventStatus.ACKNOWLEDGED,
            }));
        });
        (0, vitest_1.it)('should throw error when event not found', async () => {
            mockRepository.findById.mockResolvedValue(null);
            await (0, vitest_1.expect)(eventService.acknowledgeEvent('non-existent', undefined, {
                user: { id: '1', name: 'Test', email: 'test@test.com' },
                tenantId: 'tenant-1',
                requestId: 'req-1',
            })).rejects.toThrow('Event not found');
        });
        (0, vitest_1.it)('should throw error when event already resolved', async () => {
            mockRepository.findById.mockResolvedValue({
                id: 'event-1',
                status: index_1.EventStatus.RESOLVED,
            });
            await (0, vitest_1.expect)(eventService.acknowledgeEvent('event-1', undefined, {
                user: { id: '1', name: 'Test', email: 'test@test.com' },
                tenantId: 'tenant-1',
                requestId: 'req-1',
            })).rejects.toThrow('Cannot acknowledge event in status');
        });
    });
    (0, vitest_1.describe)('updateEventStatus', () => {
        (0, vitest_1.it)('should update status with valid transition', async () => {
            const mockEvent = {
                id: 'event-1',
                status: index_1.EventStatus.ACTIVE,
            };
            mockRepository.findById.mockResolvedValue(mockEvent);
            mockRepository.update.mockResolvedValue({
                ...mockEvent,
                status: index_1.EventStatus.INVESTIGATING,
            });
            const result = await eventService.updateEventStatus('event-1', index_1.EventStatus.INVESTIGATING, 'Looking into it', {
                user: { id: '1', name: 'Test', email: 'test@test.com' },
                tenantId: 'tenant-1',
                requestId: 'req-1',
            });
            (0, vitest_1.expect)(mockRepository.update).toHaveBeenCalled();
        });
        (0, vitest_1.it)('should reject invalid status transition', async () => {
            const mockEvent = {
                id: 'event-1',
                status: index_1.EventStatus.RESOLVED,
            };
            mockRepository.findById.mockResolvedValue(mockEvent);
            await (0, vitest_1.expect)(eventService.updateEventStatus('event-1', index_1.EventStatus.ACTIVE, undefined, {
                user: { id: '1', name: 'Test', email: 'test@test.com' },
                tenantId: 'tenant-1',
                requestId: 'req-1',
            })).rejects.toThrow('Invalid status transition');
        });
    });
    (0, vitest_1.describe)('getEventTimeline', () => {
        (0, vitest_1.it)('should apply default time range filter', async () => {
            mockRepository.findMany.mockResolvedValue({
                edges: [],
                pageInfo: { hasNextPage: false, hasPreviousPage: false },
                totalCount: 0,
            });
            await eventService.getEventTimeline({}, 50);
            (0, vitest_1.expect)(mockRepository.findMany).toHaveBeenCalledWith(vitest_1.expect.objectContaining({
                startTime: vitest_1.expect.any(Date),
                endTime: vitest_1.expect.any(Date),
            }), 50, undefined);
        });
    });
});
