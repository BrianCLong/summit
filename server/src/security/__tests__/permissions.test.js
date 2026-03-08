"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const permissions_js_1 = require("../permissions.js");
(0, globals_1.describe)('permissions map', () => {
    (0, globals_1.it)('treats admin as having wildcard access', () => {
        const canDoAnything = (0, permissions_js_1.userHasPermission)({ role: 'ADMIN' }, permissions_js_1.PERMISSIONS.MANAGE_USERS);
        (0, globals_1.expect)(canDoAnything).toBe(true);
    });
    (0, globals_1.it)('normalizes legacy graph permissions to write_graph for analysts', () => {
        const normalized = (0, permissions_js_1.normalizePermission)('entity:create');
        (0, globals_1.expect)(normalized).toBe(permissions_js_1.PERMISSIONS.WRITE_GRAPH);
        const analystCanWrite = (0, permissions_js_1.userHasPermission)({ role: 'ANALYST' }, 'entity:create');
        (0, globals_1.expect)(analystCanWrite).toBe(true);
    });
    (0, globals_1.it)('prevents viewers from performing graph mutations', () => {
        const viewerPermissions = (0, permissions_js_1.permissionsForRole)('VIEWER');
        (0, globals_1.expect)(viewerPermissions).toContain(permissions_js_1.PERMISSIONS.READ_GRAPH);
        (0, globals_1.expect)((0, permissions_js_1.userHasPermission)({ role: 'VIEWER' }, permissions_js_1.PERMISSIONS.WRITE_GRAPH)).toBe(false);
    });
    (0, globals_1.it)('allows operators to manage Maestro runs through the shared permission', () => {
        (0, globals_1.expect)((0, permissions_js_1.userHasPermission)({ role: 'OPERATOR' }, permissions_js_1.PERMISSIONS.RUN_MAESTRO)).toBe(true);
        (0, globals_1.expect)((0, permissions_js_1.userHasPermission)({ role: 'OPERATOR' }, 'run:update')).toBe(true);
    });
});
