"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CursorAdapter_1 = require("../src/adapters/CursorAdapter");
describe('CursorAdapter', () => {
    let adapter;
    let mockSkill;
    beforeEach(() => {
        adapter = new CursorAdapter_1.CursorAdapter();
        const manifest = {
            name: 'test-skill',
            version: '1.0.0',
            description: 'A test skill'
        };
        mockSkill = {
            id: 'test-skill',
            manifest,
            source: { type: 'local', path: '/tmp/test-skill' },
            location: '/tmp/test-skill'
        };
    });
    it('should be named cursor', () => {
        expect(adapter.name).toBe('cursor');
    });
    it('should return copy mode target', async () => {
        const target = await adapter.getInstallTarget(mockSkill);
        expect(target).not.toBeNull();
        expect(target?.tool).toBe('cursor');
        expect(target?.mode).toBe('copy');
        expect(target?.location).toContain('test-skill');
    });
});
