"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const EventService_1 = require("../../src/events/EventService");
const pg_1 = require("../../src/db/pg");
globals_1.jest.mock('../../src/db/pg', () => ({
    pg: {
        write: globals_1.jest.fn(),
        readMany: globals_1.jest.fn(),
        oneOrNone: globals_1.jest.fn()
    }
}));
globals_1.jest.mock('../../src/webhooks/service');
globals_1.jest.mock('../../src/integrations/siem/manager', () => ({
    siemManager: {
        exportEvent: globals_1.jest.fn()
    }
}));
(0, globals_1.describe)('EventService', () => {
    let eventService;
    (0, globals_1.beforeEach)(() => {
        // Reset singleton if needed, or just new instance if possible
        // EventService is exported as singleton, so we need to be careful.
        // But the class is exported too.
        eventService = new EventService_1.EventService();
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('should persist event to outbox', async () => {
        const event = {
            event_id: '123',
            tenant_id: 'tenant-1',
            occurred_at: new Date().toISOString(),
            type: 'test.event',
            actor: { id: 'user-1', type: 'user' },
            resource_refs: [],
            payload: { data: 'test' },
            schema_version: '1.0'
        };
        await eventService.publish(event);
        (0, globals_1.expect)(pg_1.pg.write).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO event_log'), globals_1.expect.anything(), globals_1.expect.objectContaining({ tenantId: 'tenant-1' }));
    });
});
