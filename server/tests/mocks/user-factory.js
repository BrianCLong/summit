"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userFactory = void 0;
const userFactory = (options = {}) => {
    const roles = options.roles ?? (options.role ? [options.role] : ['viewer']);
    return {
        id: options.id ?? 'user-1',
        tenantId: options.tenantId ?? 'tenant-1',
        roles,
        residency: 'US',
        clearance: 'public',
        entitlements: [],
    };
};
exports.userFactory = userFactory;
