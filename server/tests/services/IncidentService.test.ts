import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { IncidentService } from '../../src/services/IncidentService';
import { pg } from '../../src/db/pg';

jest.mock('../../src/db/pg');

describe('IncidentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create incident', async () => {
        (pg.oneOrNone as any).mockResolvedValue({
            id: 'incident-1',
            title: 'Test Incident'
        });

        const incident = await IncidentService.create({
            tenant_id: 'tenant-1',
            title: 'Test Incident',
            severity: 'high'
        });

        expect(incident.id).toBe('incident-1');
        expect(pg.oneOrNone).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO incidents'),
            expect.anything(),
            expect.anything()
        );
    });
});
