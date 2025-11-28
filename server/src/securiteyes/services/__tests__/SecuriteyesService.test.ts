import { SecuriteyesService } from '../SecuriteyesService';
import { NODE_LABELS } from '../../models/types';

// Mock dependencies
const mockRunCypher = jest.fn();
jest.mock('../../../graph/neo4j', () => ({
  runCypher: (...args: any[]) => mockRunCypher(...args)
}));

describe('SecuriteyesService', () => {
    let service: SecuriteyesService;

    beforeEach(() => {
        service = SecuriteyesService.getInstance();
        mockRunCypher.mockResolvedValue([{ n: { properties: { id: 'test-id', tenantId: 'test-tenant' } } }]);
    });

    it('should create a suspicious event', async () => {
        const event = await service.createSuspiciousEvent({
            tenantId: 'tenant-1',
            eventType: 'test_event',
            severity: 'medium',
            details: {},
            sourceDetector: 'test',
            timestamp: new Date().toISOString()
        });

        expect(event).toBeDefined();
        // Since we mocked runCypher to return a generic object, just checking definition
    });

    it('should create an incident', async () => {
        const incident = await service.createIncident({
            tenantId: 'tenant-1',
            title: 'Test Incident',
            severity: 'high',
            status: 'detected'
        });
        expect(incident).toBeDefined();
    });
});
