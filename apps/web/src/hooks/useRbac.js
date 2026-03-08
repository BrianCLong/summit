"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useRbac = useRbac;
exports.useRbacMultiple = useRbacMultiple;
const react_1 = require("react");
function useRbac(resource, action, options = {}) {
    const { user, fallback = false } = options;
    const [hasPermission, setHasPermission] = (0, react_1.useState)(fallback);
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        if (!user) {
            setHasPermission(fallback);
            setLoading(false);
            return;
        }
        // Check user permissions
        const permission = user.permissions.find((p) => p.resource === resource && p.action === action);
        if (permission) {
            setHasPermission(permission.effect === 'allow');
        }
        else {
            // Check role-based permissions
            const rolePermissions = getRolePermissions(user.role);
            const rolePermission = rolePermissions.find((p) => p.resource === resource && p.action === action);
            setHasPermission(rolePermission?.effect === 'allow' || fallback);
        }
        setLoading(false);
    }, [user, resource, action, fallback]);
    return { hasPermission, loading };
}
function getRolePermissions(role) {
    const rolePermissions = {
        admin: [{ resource: '*', action: '*', effect: 'allow' }],
        analyst: [
            { resource: 'investigations', action: 'read', effect: 'allow' },
            { resource: 'investigations', action: 'write', effect: 'allow' },
            { resource: 'entities', action: 'read', effect: 'allow' },
            { resource: 'entities', action: 'write', effect: 'allow' },
            { resource: 'alerts', action: 'read', effect: 'allow' },
            { resource: 'alerts', action: 'write', effect: 'allow' },
            { resource: 'cases', action: 'read', effect: 'allow' },
            { resource: 'dashboards', action: 'read', effect: 'allow' },
        ],
        investigator: [
            { resource: 'investigations', action: 'read', effect: 'allow' },
            { resource: 'investigations', action: 'write', effect: 'allow' },
            { resource: 'entities', action: 'read', effect: 'allow' },
            { resource: 'cases', action: 'read', effect: 'allow' },
            { resource: 'cases', action: 'write', effect: 'allow' },
            { resource: 'dashboards', action: 'read', effect: 'allow' },
        ],
        viewer: [
            { resource: 'investigations', action: 'read', effect: 'allow' },
            { resource: 'entities', action: 'read', effect: 'allow' },
            { resource: 'alerts', action: 'read', effect: 'allow' },
            { resource: 'cases', action: 'read', effect: 'allow' },
            { resource: 'dashboards', action: 'read', effect: 'allow' },
        ],
    };
    return rolePermissions[role] || [];
}
// Hook for checking multiple permissions
function useRbacMultiple(permissions, options = {}) {
    const results = permissions.map(({ resource, action }) => useRbac(resource, action, options));
    const loading = results.some(result => result.loading);
    const hasAllPermissions = results.every(result => result.hasPermission);
    const hasAnyPermission = results.some(result => result.hasPermission);
    return {
        loading,
        hasAllPermissions,
        hasAnyPermission,
        permissions: results.map((result, index) => ({
            ...permissions[index],
            hasPermission: result.hasPermission,
        })),
    };
}
