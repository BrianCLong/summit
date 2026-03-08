"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SyncEngine_1 = require("../src/registry/SyncEngine");
class MockAdapter {
    name = 'mock';
    detect = jest.fn().mockResolvedValue(true);
    getInstallTarget = jest.fn().mockResolvedValue({
        tool: 'mock',
        scope: 'user',
        mode: 'copy',
        location: '/tmp/mock/skill'
    });
    install = jest.fn().mockResolvedValue(undefined);
    listInstalled = jest.fn().mockResolvedValue([]);
}
describe('SyncEngine', () => {
    let syncEngine;
    let mockAdapter;
    let mockSkill;
    beforeEach(() => {
        mockAdapter = new MockAdapter();
        syncEngine = new SyncEngine_1.SyncEngine([mockAdapter]);
        mockSkill = {
            id: 'test-skill',
            manifest: { name: 'test-skill', version: '1.0.0', description: 'test' },
            source: { type: 'local', path: '/tmp/test' },
            location: '/tmp/test'
        };
    });
    it('should install skill to detected adapter', async () => {
        await syncEngine.syncSkill(mockSkill);
        expect(mockAdapter.detect).toHaveBeenCalled();
        expect(mockAdapter.getInstallTarget).toHaveBeenCalledWith(mockSkill);
        expect(mockAdapter.install).toHaveBeenCalled();
    });
    it('should not install if adapter not detected', async () => {
        mockAdapter.detect.mockResolvedValueOnce(false);
        await syncEngine.syncSkill(mockSkill);
        expect(mockAdapter.getInstallTarget).not.toHaveBeenCalled();
        expect(mockAdapter.install).not.toHaveBeenCalled();
    });
});
