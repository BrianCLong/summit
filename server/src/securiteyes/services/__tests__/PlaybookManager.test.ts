import { PlaybookManager } from '../PlaybookManager';
import { SecuriteyesService } from '../SecuriteyesService';

const mockSecuriteyesService = {
  createNode: jest.fn().mockResolvedValue({ id: 'mitigation-1' })
};

jest.mock('../SecuriteyesService', () => {
    return {
        SecuriteyesService: {
            getInstance: jest.fn(() => mockSecuriteyesService)
        }
    };
});

describe('PlaybookManager', () => {
    let manager: PlaybookManager;

    beforeEach(() => {
        manager = PlaybookManager.getInstance();
        // Force the mock to be returned if the class logic tries to get it again via helper
        (SecuriteyesService.getInstance as jest.Mock).mockReturnValue(mockSecuriteyesService);
    });

    it('should list playbooks', () => {
        expect(manager.getPlaybooks().length).toBeGreaterThan(0);
    });

    it('should execute a playbook', async () => {
        const result = await manager.executePlaybook('PB_CREDENTIAL_COMPROMISE', { userId: 'u1' }, 't1');
        expect(result.success).toBe(true);
        expect(mockSecuriteyesService.createNode).toHaveBeenCalledWith(expect.stringContaining('Mitigation'), expect.objectContaining({
            type: 'playbook_execution',
            tenantId: 't1'
        }));
    });
});
