"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const service_1 = require("../../src/integrations/inbound/service");
const pg_1 = require("../../src/db/pg");
globals_1.jest.mock('../../src/db/pg');
(0, globals_1.describe)('InboundAlertService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new service_1.InboundAlertService();
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('should process valid alert', async () => {
        pg_1.pg.oneOrNone.mockResolvedValue({
            id: 'config-1',
            tenant_id: 'tenant-1',
            enabled: true,
            source_type: 'generic_webhook',
            secret: 'secret'
        });
        const payload = { title: 'Test Alert' };
        const alert = await service.processAlert('tenant-1', 'config-1', payload, 'secret');
        (0, globals_1.expect)(alert.status).toBe('processed');
        (0, globals_1.expect)(pg_1.pg.write).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO inbound_alerts'), globals_1.expect.anything());
    });
    (0, globals_1.it)('should reject invalid signature', async () => {
        pg_1.pg.oneOrNone.mockResolvedValue({
            id: 'config-1',
            tenant_id: 'tenant-1',
            enabled: true,
            source_type: 'generic_webhook',
            secret: 'secret'
        });
        await (0, globals_1.expect)(service.processAlert('tenant-1', 'config-1', {}, 'wrong')).rejects.toThrow('Invalid signature');
    });
});
