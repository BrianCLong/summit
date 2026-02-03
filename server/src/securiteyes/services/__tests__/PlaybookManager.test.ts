import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { PlaybookManager } from '../PlaybookManager.js';
import { SecuriteyesService } from '../SecuriteyesService.js';

const mockSecuriteyesService = {
  createNode: jest.fn().mockResolvedValue({ id: 'mitigation-1' })
};

describe('PlaybookManager', () => {
    let manager: PlaybookManager;
    let getInstanceSpy: jest.SpiedFunction<typeof SecuriteyesService.getInstance>;

    beforeEach(() => {
        getInstanceSpy = jest
          .spyOn(SecuriteyesService, 'getInstance')
          .mockReturnValue(mockSecuriteyesService as any);
        manager = PlaybookManager.getInstance();
    });

    afterEach(() => {
        getInstanceSpy.mockRestore();
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
