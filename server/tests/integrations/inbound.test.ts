import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { createHmac } from 'crypto';
import { InboundAlertService } from '../../src/integrations/inbound/service';
import { pg } from '../../src/db/pg';

jest.mock('../../src/db/pg');

describe('InboundAlertService', () => {
    let service: InboundAlertService;

    beforeEach(() => {
        service = new InboundAlertService();
        jest.clearAllMocks();
    });

    it('should process valid alert', async () => {
        (pg.oneOrNone as any).mockResolvedValue({
            id: 'config-1',
            tenant_id: 'tenant-1',
            enabled: true,
            source_type: 'generic_webhook',
            secret: 'secret'
        });

        const payload = { title: 'Test Alert' };
        const hmac = createHmac('sha256', 'secret');
        hmac.update(JSON.stringify(payload));
        const signature = hmac.digest('hex');

        const alert = await service.processAlert('tenant-1', 'config-1', payload, signature);

        expect(alert.status).toBe('processed');
        expect(pg.write).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO inbound_alerts'),
            expect.anything()
        );
    });

    it('should reject invalid signature', async () => {
        (pg.oneOrNone as any).mockResolvedValue({
            id: 'config-1',
            tenant_id: 'tenant-1',
            enabled: true,
            source_type: 'generic_webhook',
            secret: 'secret'
        });

        await expect(service.processAlert('tenant-1', 'config-1', {}, 'wrong')).rejects.toThrow('Invalid signature');
        // SEC: Plaintext secret should also fail (this was the vulnerability)
        await expect(service.processAlert('tenant-1', 'config-1', {}, 'secret')).rejects.toThrow('Invalid signature');
    });
});
