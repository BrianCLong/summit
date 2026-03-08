"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiTenantRBACManager = exports.getMultiTenantRBAC = exports.mockRbacManager = void 0;
const globals_1 = require("@jest/globals");
exports.mockRbacManager = {
    hasPermission: globals_1.jest.fn().mockReturnValue(true),
    evaluateAccess: globals_1.jest.fn().mockResolvedValue({ allowed: true }),
    getRole: globals_1.jest.fn().mockReturnValue(null),
    getRoles: globals_1.jest.fn().mockReturnValue([]),
    hasRole: globals_1.jest.fn().mockReturnValue(false),
    checkTenantAccess: globals_1.jest.fn().mockReturnValue(true),
    validateScope: globals_1.jest.fn().mockReturnValue(true),
};
exports.getMultiTenantRBAC = globals_1.jest.fn().mockReturnValue(exports.mockRbacManager);
class MultiTenantRBACManager {
    hasPermission = globals_1.jest.fn().mockReturnValue(true);
    evaluateAccess = globals_1.jest.fn().mockResolvedValue({ allowed: true });
    getRole = globals_1.jest.fn().mockReturnValue(null);
    getRoles = globals_1.jest.fn().mockReturnValue([]);
    hasRole = globals_1.jest.fn().mockReturnValue(false);
    checkTenantAccess = globals_1.jest.fn().mockReturnValue(true);
    validateScope = globals_1.jest.fn().mockReturnValue(true);
}
exports.MultiTenantRBACManager = MultiTenantRBACManager;
exports.default = {
    getMultiTenantRBAC: exports.getMultiTenantRBAC,
    MultiTenantRBACManager,
    mockRbacManager: exports.mockRbacManager,
};
