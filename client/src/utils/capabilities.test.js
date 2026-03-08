"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const capabilities_1 = require("./capabilities");
describe('capability helper', () => {
    it('maps legacy graph permissions to the canonical write_graph capability', () => {
        expect((0, capabilities_1.normalizePermission)('entity:create')).toBe(capabilities_1.PERMISSIONS.WRITE_GRAPH);
        expect((0, capabilities_1.hasCapability)({ role: 'ANALYST' }, 'entity:create')).toBe(true);
    });
    it('blocks viewers from mutation actions', () => {
        expect((0, capabilities_1.hasCapability)({ role: 'VIEWER' }, capabilities_1.PERMISSIONS.WRITE_GRAPH)).toBe(false);
    });
    it('grants Maestro run visibility to operators', () => {
        const operatorPerms = (0, capabilities_1.permissionsForRole)('OPERATOR');
        expect(operatorPerms).toContain(capabilities_1.PERMISSIONS.RUN_MAESTRO);
        expect((0, capabilities_1.hasCapability)({ role: 'OPERATOR' }, 'run:create')).toBe(true);
    });
    it('treats actions:* aliases as graph read permissions', () => {
        expect((0, capabilities_1.hasCapability)({ role: 'ANALYST' }, 'actions:read')).toBe(true);
        expect((0, capabilities_1.hasCapability)({ role: 'ANALYST' }, 'action:view')).toBe(true);
        expect((0, capabilities_1.hasCapability)({ role: 'VIEWER' }, 'actions:list')).toBe(true);
    });
});
