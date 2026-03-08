"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRoleAllowed = exports.SUPPORT_POLICIES = exports.SUPPORT_BUNDLE_POLICY = exports.SUPPORT_HEALTH_BUNDLE_POLICY = exports.SUPPORT_IMPERSONATION_POLICY = void 0;
exports.SUPPORT_IMPERSONATION_POLICY = {
    id: 'support-impersonation-v1',
    description: 'Allow support impersonation only for approved roles with explicit justification.',
    allowedRoles: ['ADMIN'],
    requiredPermissions: ['support:impersonate'],
    requireJustification: true,
};
exports.SUPPORT_HEALTH_BUNDLE_POLICY = {
    id: 'support-tenant-health-bundle-v1',
    description: 'Allow tenant health bundle export for approved roles with explicit justification.',
    allowedRoles: ['ADMIN'],
    requiredPermissions: ['support:health:export'],
    requireJustification: true,
};
exports.SUPPORT_BUNDLE_POLICY = {
    id: 'support-bundle-generate-v1',
    description: 'Allow support bundle generation for approved roles with explicit justification.',
    allowedRoles: ['ADMIN'],
    requiredPermissions: ['support:bundle:generate'],
    requireJustification: true,
};
exports.SUPPORT_POLICIES = {
    impersonation: exports.SUPPORT_IMPERSONATION_POLICY,
    tenantHealthBundle: exports.SUPPORT_HEALTH_BUNDLE_POLICY,
    supportBundle: exports.SUPPORT_BUNDLE_POLICY,
};
const isRoleAllowed = (role, allowedRoles) => {
    if (!role)
        return false;
    return allowedRoles.some((allowed) => allowed.toUpperCase() === role.toUpperCase());
};
exports.isRoleAllowed = isRoleAllowed;
