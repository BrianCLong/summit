"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const permissions_js_1 = require("../permissions.js");
(0, globals_1.describe)('RBAC Lock', () => {
    (0, globals_1.it)('should enforce least privilege for VIEWER role', () => {
        const permissions = (0, permissions_js_1.permissionsForRole)(permissions_js_1.Role.VIEWER);
        (0, globals_1.expect)(permissions).toContain(permissions_js_1.Permission.READ_TENANT_DATA);
        (0, globals_1.expect)(permissions).not.toContain(permissions_js_1.Permission.WRITE_TENANT_DATA);
        (0, globals_1.expect)(permissions).not.toContain(permissions_js_1.Permission.MANAGE_USERS);
        (0, globals_1.expect)(permissions).not.toContain(permissions_js_1.Permission.EXECUTE_DANGEROUS_ACTION);
    });
    (0, globals_1.it)('should enforce least privilege for ANALYST role', () => {
        const permissions = (0, permissions_js_1.permissionsForRole)(permissions_js_1.Role.ANALYST);
        (0, globals_1.expect)(permissions).toContain(permissions_js_1.Permission.READ_TENANT_DATA);
        // Analysts should NOT verify write permissions by default unless specified
        (0, globals_1.expect)(permissions).not.toContain(permissions_js_1.Permission.WRITE_TENANT_DATA);
        (0, globals_1.expect)(permissions).not.toContain(permissions_js_1.Permission.MANAGE_USERS);
    });
    (0, globals_1.it)('should grant full privileges to SUPERADMIN', () => {
        const permissions = (0, permissions_js_1.permissionsForRole)(permissions_js_1.Role.SUPERADMIN);
        (0, globals_1.expect)(permissions).toContain(permissions_js_1.Permission.MANAGE_USERS);
        (0, globals_1.expect)(permissions).toContain(permissions_js_1.Permission.READ_TENANT_DATA);
        (0, globals_1.expect)(permissions).toContain(permissions_js_1.Permission.WRITE_TENANT_DATA);
        (0, globals_1.expect)(permissions).toContain(permissions_js_1.Permission.EXECUTE_DANGEROUS_ACTION);
    });
    (0, globals_1.it)('should lock down critical permissions to explicit roles', () => {
        // Ensure only specific roles have critical permissions
        const roles = Object.values(permissions_js_1.Role);
        const rolesWithManageUsers = roles.filter(role => (0, permissions_js_1.permissionsForRole)(role).includes(permissions_js_1.Permission.MANAGE_USERS));
        // Explicit allow list for MANAGE_USERS
        const allowedManageUsers = [permissions_js_1.Role.SUPERADMIN, permissions_js_1.Role.ADMIN];
        (0, globals_1.expect)(rolesWithManageUsers.sort()).toEqual(allowedManageUsers.sort());
        const rolesWithDangerousAction = roles.filter(role => (0, permissions_js_1.permissionsForRole)(role).includes(permissions_js_1.Permission.EXECUTE_DANGEROUS_ACTION));
        // Explicit allow list for EXECUTE_DANGEROUS_ACTION
        const allowedDangerous = [permissions_js_1.Role.SUPERADMIN, permissions_js_1.Role.ADMIN];
        (0, globals_1.expect)(rolesWithDangerousAction.sort()).toEqual(allowedDangerous.sort());
    });
});
