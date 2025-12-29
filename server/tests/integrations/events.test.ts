import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { EventService } from '../../src/events/EventService';
import { pg } from '../../src/db/pg';

jest.mock('../../src/db/pg', () => ({
    pg: {
        write: jest.fn(),
        readMany: jest.fn(),
        oneOrNone: jest.fn()
    }
}));
jest.mock('../../src/webhooks/service');
jest.mock('../../src/integrations/siem/manager', () => ({
    siemManager: {
        exportEvent: jest.fn()
    }
}));

describe('EventService', () => {
    let eventService: EventService;

    beforeEach(() => {
        // Reset singleton if needed, or just new instance if possible
        // EventService is exported as singleton, so we need to be careful.
        // But the class is exported too.
        eventService = new EventService();
        jest.clearAllMocks();
    });

    it('should persist event to outbox', async () => {
        const event = {
            event_id: '123',
            tenant_id: 'tenant-1',
            occurred_at: new Date().toISOString(),
            type: 'test.event',
            actor: { id: 'user-1', type: 'user' as const },
            resource_refs: [],
            payload: { data: 'test' },
            schema_version: '1.0'
        };

        await eventService.publish(event);

        expect(pg.write).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO event_log'),
            expect.anything(),
            expect.objectContaining({ tenantId: 'tenant-1' })
        );
    });
});
