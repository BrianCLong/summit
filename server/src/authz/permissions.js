"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionLabels = exports.ROLE_PERMISSIONS = exports.Permission = exports.Role = void 0;
exports.permissionsForRole = permissionsForRole;
var Role;
(function (Role) {
    Role["SUPERADMIN"] = "superadmin";
    Role["ADMIN"] = "admin";
    Role["ANALYST"] = "analyst";
    Role["VIEWER"] = "viewer";
})(Role || (exports.Role = Role = {}));
var Permission;
(function (Permission) {
    Permission["MANAGE_USERS"] = "manage_users";
    Permission["READ_TENANT_DATA"] = "read_tenant_data";
    Permission["WRITE_TENANT_DATA"] = "write_tenant_data";
    Permission["EXECUTE_DANGEROUS_ACTION"] = "execute_dangerous_action";
})(Permission || (exports.Permission = Permission = {}));
exports.ROLE_PERMISSIONS = {
    [Role.SUPERADMIN]: [
        Permission.MANAGE_USERS,
        Permission.READ_TENANT_DATA,
        Permission.WRITE_TENANT_DATA,
        Permission.EXECUTE_DANGEROUS_ACTION,
    ],
    [Role.ADMIN]: [
        Permission.MANAGE_USERS,
        Permission.READ_TENANT_DATA,
        Permission.WRITE_TENANT_DATA,
        Permission.EXECUTE_DANGEROUS_ACTION,
    ],
    [Role.ANALYST]: [Permission.READ_TENANT_DATA],
    [Role.VIEWER]: [Permission.READ_TENANT_DATA],
};
exports.permissionLabels = {
    [Permission.MANAGE_USERS]: 'Manage users and roles',
    [Permission.READ_TENANT_DATA]: 'Read tenant-scoped data',
    [Permission.WRITE_TENANT_DATA]: 'Write tenant-scoped data',
    [Permission.EXECUTE_DANGEROUS_ACTION]: 'Execute dangerous or step-up actions',
};
function permissionsForRole(role) {
    return exports.ROLE_PERMISSIONS[role] ?? [];
}
