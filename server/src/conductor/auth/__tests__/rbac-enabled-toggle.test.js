"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
globals_1.jest.mock('../jwt-rotation.js', () => ({
    jwtRotationManager: {
        verifyToken: globals_1.jest.fn(),
    },
}));
globals_1.jest.mock('../../config/logger.js', () => ({
    info: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    debug: globals_1.jest.fn(),
}));
const originalEnv = process.env.RBAC_ENABLED;
const loadRbacModule = async () => {
    globals_1.jest.resetModules();
    return Promise.resolve().then(() => __importStar(require('../rbac-middleware.js')));
};
const loadWithEnv = async (value) => {
    if (value === undefined) {
        delete process.env.RBAC_ENABLED;
    }
    else {
        process.env.RBAC_ENABLED = value;
    }
    return loadRbacModule();
};
(0, globals_1.describe)('RBAC enablement toggle', () => {
    (0, globals_1.afterEach)(() => {
        if (originalEnv === undefined) {
            delete process.env.RBAC_ENABLED;
        }
        else {
            process.env.RBAC_ENABLED = originalEnv;
        }
    });
    (0, globals_1.it)('defaults to enabled when RBAC_ENABLED is unset', async () => {
        const { rbacManager } = await loadWithEnv(undefined);
        (0, globals_1.expect)(rbacManager.getConfig().enabled).toBe(true);
    });
    globals_1.it.each(['false', '0', 'no'])('disables RBAC when RBAC_ENABLED=%s', async (value) => {
        const { rbacManager } = await loadWithEnv(value);
        (0, globals_1.expect)(rbacManager.getConfig().enabled).toBe(false);
    });
    globals_1.it.each(['true', '1', 'yes'])('enables RBAC when RBAC_ENABLED=%s', async (value) => {
        const { rbacManager } = await loadWithEnv(value);
        (0, globals_1.expect)(rbacManager.getConfig().enabled).toBe(true);
    });
    (0, globals_1.it)('bypasses permission checks when disabled', async () => {
        const { requirePermission } = await loadWithEnv('false');
        const next = globals_1.jest.fn();
        const res = {
            status: globals_1.jest.fn().mockReturnThis(),
            json: globals_1.jest.fn(),
        };
        const req = { headers: {} };
        requirePermission('anything')(req, res, next);
        (0, globals_1.expect)(next).toHaveBeenCalled();
        (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
        (0, globals_1.expect)(res.json).not.toHaveBeenCalled();
    });
});
