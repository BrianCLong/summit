"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PlaybookManager_js_1 = require("../PlaybookManager.js");
const SecuriteyesService_js_1 = require("../SecuriteyesService.js");
const mockSecuriteyesService = {
    createNode: globals_1.jest.fn().mockResolvedValue({ id: 'mitigation-1' })
};
(0, globals_1.describe)('PlaybookManager', () => {
    let manager;
    let getInstanceSpy;
    (0, globals_1.beforeEach)(() => {
        getInstanceSpy = globals_1.jest
            .spyOn(SecuriteyesService_js_1.SecuriteyesService, 'getInstance')
            .mockReturnValue(mockSecuriteyesService);
        manager = PlaybookManager_js_1.PlaybookManager.getInstance();
    });
    (0, globals_1.afterEach)(() => {
        getInstanceSpy.mockRestore();
    });
    (0, globals_1.it)('should list playbooks', () => {
        (0, globals_1.expect)(manager.getPlaybooks().length).toBeGreaterThan(0);
    });
    (0, globals_1.it)('should execute a playbook', async () => {
        const result = await manager.executePlaybook('PB_CREDENTIAL_COMPROMISE', { userId: 'u1' }, 't1');
        (0, globals_1.expect)(result.success).toBe(true);
        (0, globals_1.expect)(mockSecuriteyesService.createNode).toHaveBeenCalledWith(globals_1.expect.stringContaining('Mitigation'), globals_1.expect.objectContaining({
            type: 'playbook_execution',
            tenantId: 't1'
        }));
    });
});
