"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.PERMISSION_ALIASES = exports.PERMISSIONS = void 0;
exports.normalizePermission = normalizePermission;
exports.permissionsForRole = permissionsForRole;
exports.hasCapability = hasCapability;
exports.PERMISSIONS = {
    READ_GRAPH: 'read_graph',
    WRITE_GRAPH: 'write_graph',
    RUN_MAESTRO: 'run_maestro',
    VIEW_DASHBOARDS: 'view_dashboards',
    MANAGE_USERS: 'manage_users',
    MANAGE_SETTINGS: 'manage_settings',
};
exports.PERMISSION_ALIASES = {
    'entity:create': exports.PERMISSIONS.WRITE_GRAPH,
    'entity:update': exports.PERMISSIONS.WRITE_GRAPH,
    'entity:delete': exports.PERMISSIONS.WRITE_GRAPH,
    'relationship:create': exports.PERMISSIONS.WRITE_GRAPH,
    'relationship:update': exports.PERMISSIONS.WRITE_GRAPH,
    'relationship:delete': exports.PERMISSIONS.WRITE_GRAPH,
    'graph:read': exports.PERMISSIONS.READ_GRAPH,
    'graph:export': exports.PERMISSIONS.READ_GRAPH,
    'action:read': exports.PERMISSIONS.READ_GRAPH,
    'action:view': exports.PERMISSIONS.READ_GRAPH,
    'actions:list': exports.PERMISSIONS.READ_GRAPH,
    'actions:read': exports.PERMISSIONS.READ_GRAPH,
    'run:create': exports.PERMISSIONS.RUN_MAESTRO,
    'run:read': exports.PERMISSIONS.RUN_MAESTRO,
    'run:update': exports.PERMISSIONS.RUN_MAESTRO,
    'admin:access': exports.PERMISSIONS.MANAGE_USERS,
};
exports.ROLE_PERMISSIONS = {
    ADMIN: ['*'],
    ANALYST: [
        exports.PERMISSIONS.READ_GRAPH,
        exports.PERMISSIONS.WRITE_GRAPH,
        exports.PERMISSIONS.VIEW_DASHBOARDS,
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
    VIEWER: [exports.PERMISSIONS.READ_GRAPH, 'graph:read', 'graph:export'],
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
function hasCapability(user, permission) {
    if (!user?.role)
        return false;
    if (user.role.toUpperCase() === 'ADMIN')
        return true;
    const normalized = normalizePermission(permission);
    if (!normalized)
        return false;
    if (user.permissions?.includes('*'))
        return true;
    const explicitMatches = (user.permissions || [])
        .map((perm) => normalizePermission(perm))
        .filter(Boolean);
    if (explicitMatches.includes(normalized))
        return true;
    const byRole = permissionsForRole(user.role);
    return byRole.includes('*') || byRole.includes(normalized);
}
