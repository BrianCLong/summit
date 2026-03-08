"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.PERMISSION_ALIASES = exports.PERMISSIONS = void 0;
exports.normalizePermission = normalizePermission;
exports.permissionsForRole = permissionsForRole;
exports.userHasPermission = userHasPermission;
exports.PERMISSIONS = {
    READ_GRAPH: 'read_graph',
    WRITE_GRAPH: 'write_graph',
    RUN_MAESTRO: 'run_maestro',
    VIEW_DASHBOARDS: 'view_dashboards',
    MANAGE_USERS: 'manage_users',
    MANAGE_SETTINGS: 'manage_settings',
};
exports.PERMISSION_ALIASES = {
    'graph:read': exports.PERMISSIONS.READ_GRAPH,
    'graph:export': exports.PERMISSIONS.READ_GRAPH,
    'entity:create': exports.PERMISSIONS.WRITE_GRAPH,
    'entity:update': exports.PERMISSIONS.WRITE_GRAPH,
    'entity:delete': exports.PERMISSIONS.WRITE_GRAPH,
    'relationship:create': exports.PERMISSIONS.WRITE_GRAPH,
    'relationship:update': exports.PERMISSIONS.WRITE_GRAPH,
    'relationship:delete': exports.PERMISSIONS.WRITE_GRAPH,
    'investigation:create': exports.PERMISSIONS.WRITE_GRAPH,
    'investigation:update': exports.PERMISSIONS.WRITE_GRAPH,
    'investigation:read': exports.PERMISSIONS.READ_GRAPH,
    'tag:create': exports.PERMISSIONS.WRITE_GRAPH,
    'tag:read': exports.PERMISSIONS.READ_GRAPH,
    'tag:delete': exports.PERMISSIONS.WRITE_GRAPH,
    'run:create': exports.PERMISSIONS.RUN_MAESTRO,
    'run:read': exports.PERMISSIONS.RUN_MAESTRO,
    'run:update': exports.PERMISSIONS.RUN_MAESTRO,
    'pipeline:create': exports.PERMISSIONS.RUN_MAESTRO,
    'pipeline:update': exports.PERMISSIONS.RUN_MAESTRO,
    'pipeline:read': exports.PERMISSIONS.RUN_MAESTRO,
    'routing:override': exports.PERMISSIONS.RUN_MAESTRO,
    'dashboard:read': exports.PERMISSIONS.VIEW_DASHBOARDS,
    'admin:access': exports.PERMISSIONS.MANAGE_USERS,
    'admin:*': exports.PERMISSIONS.MANAGE_USERS,
    'override:manage': exports.PERMISSIONS.MANAGE_SETTINGS,
};
exports.ROLE_PERMISSIONS = {
    ADMIN: ['*'],
    ANALYST: [
        exports.PERMISSIONS.READ_GRAPH,
        exports.PERMISSIONS.WRITE_GRAPH,
        exports.PERMISSIONS.VIEW_DASHBOARDS,
        'investigation:create',
        'investigation:read',
        'investigation:update',
        'entity:create',
        'entity:read',
        'entity:update',
        'entity:delete',
        'relationship:create',
        'relationship:read',
        'relationship:update',
        'relationship:delete',
        'tag:create',
        'tag:read',
        'tag:delete',
        'graph:read',
        'graph:export',
        'ai:request',
    ],
    OPERATOR: [
        exports.PERMISSIONS.READ_GRAPH,
        exports.PERMISSIONS.RUN_MAESTRO,
        exports.PERMISSIONS.VIEW_DASHBOARDS,
        exports.PERMISSIONS.MANAGE_SETTINGS,
    ],
    SERVICE_ACCOUNT: [exports.PERMISSIONS.READ_GRAPH, exports.PERMISSIONS.WRITE_GRAPH],
    VIEWER: [exports.PERMISSIONS.READ_GRAPH, 'graph:read', 'graph:export', 'investigation:read'],
};
function normalizePermission(permission) {
    if (!permission)
        return null;
    const lower = permission.toString().toLowerCase();
    const canonical = Object.values(exports.PERMISSIONS).find((candidate) => candidate === lower);
    if (canonical)
        return canonical;
    const alias = exports.PERMISSION_ALIASES[permission] || exports.PERMISSION_ALIASES[lower];
    if (alias)
        return alias;
    return permission;
}
function permissionsForRole(role) {
    if (!role)
        return [];
    const normalizedRole = role.toUpperCase();
    return exports.ROLE_PERMISSIONS[normalizedRole] || [];
}
function userHasPermission(user, permission) {
    if (!user || !user.role)
        return false;
    const normalizedPermission = normalizePermission(permission);
    const normalizedRole = user.role.toUpperCase();
    if (normalizedRole === 'ADMIN')
        return true;
    if (!normalizedPermission)
        return false;
    if (user.permissions?.includes('*'))
        return true;
    const userExplicitPermissions = (user.permissions || [])
        .map((perm) => normalizePermission(perm))
        .filter(Boolean);
    if (userExplicitPermissions.includes(normalizedPermission))
        return true;
    const rolePermissions = permissionsForRole(user.role);
    return rolePermissions.includes('*') || rolePermissions.includes(normalizedPermission);
}
