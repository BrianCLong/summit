import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const pgMock = { oneOrNone: jest.fn() };
await jest.unstable_mockModule('../../src/db/pg', () => ({
  pg: pgMock,
}));

const { IncidentService } = await import('../../src/services/IncidentService');

describe('IncidentService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create incident', async () => {
        pgMock.oneOrNone.mockResolvedValue({
            id: 'incident-1',
            title: 'Test Incident'
        });

        const incident = await IncidentService.create({
            tenant_id: 'tenant-1',
            title: 'Test Incident',
            severity: 'high'
        });

        expect(incident.id).toBe('incident-1');
        expect(pgMock.oneOrNone).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO incidents'),
            expect.anything(),
            expect.anything()
        );
    });
});
