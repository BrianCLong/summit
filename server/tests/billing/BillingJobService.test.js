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
const logger = {
    info: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    debug: globals_1.jest.fn(),
};
const billingService = {
    generateAndExportReport: globals_1.jest.fn(),
};
const sharedLockState = { locked: false };
class FakeClient {
    lockState;
    constructor(lockState) {
        this.lockState = lockState;
    }
    async query(text) {
        const normalized = text.toLowerCase();
        if (normalized.includes('pg_try_advisory_lock')) {
            if (!this.lockState.locked) {
                this.lockState.locked = true;
                return { rows: [{ acquired: true }] };
            }
            return { rows: [{ acquired: false }] };
        }
        if (normalized.includes('pg_advisory_unlock')) {
            this.lockState.locked = false;
            return { rows: [{ released: true }] };
        }
        if (normalized.includes('select tenant_id from tenant_plans')) {
            return { rows: [{ tenant_id: 'tenant-1' }] };
        }
        return { rows: [] };
    }
    release() {
        return true;
    }
}
const mockPool = {
    connect: globals_1.jest.fn(async () => new FakeClient(sharedLockState)),
};
globals_1.jest.unstable_mockModule('../../src/config/logger.js', () => ({
    __esModule: true,
    default: logger,
}));
globals_1.jest.unstable_mockModule('../../src/billing/BillingService.js', () => ({
    billingService,
}));
let BillingJobService;
(0, globals_1.beforeAll)(async () => {
    ({ BillingJobService } = await Promise.resolve().then(() => __importStar(require('../../src/billing/BillingJobService.js'))));
});
(0, globals_1.describe)('BillingJobService distributed locking', () => {
    (0, globals_1.beforeEach)(() => {
        sharedLockState.locked = false;
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.it)('runs in dry-run mode without invoking billing generation', async () => {
        const service = new BillingJobService({
            pool: mockPool,
            billing: billingService,
            logger: logger,
            enableSchedule: false,
        });
        await service.processBillingClose({ dryRun: true, lockTimeoutMs: 250 });
        (0, globals_1.expect)(billingService.generateAndExportReport).not.toHaveBeenCalled();
        (0, globals_1.expect)(logger.info).toHaveBeenCalledWith(globals_1.expect.objectContaining({ tenantId: 'tenant-1', dryRun: true }), 'Processing billing for tenant');
    });
    (0, globals_1.it)('enforces mutual exclusion when the lock is held elsewhere', async () => {
        const serviceA = new BillingJobService({
            pool: mockPool,
            billing: billingService,
            logger: logger,
            enableSchedule: false,
        });
        const serviceB = new BillingJobService({
            pool: mockPool,
            billing: billingService,
            logger: logger,
            enableSchedule: false,
        });
        const unblock = defer();
        billingService.generateAndExportReport.mockImplementation(async () => unblock.promise);
        const firstRun = serviceA.processBillingClose({ lockTimeoutMs: 500 });
        const secondRun = serviceB.processBillingClose({ lockTimeoutMs: 100 });
        await new Promise(resolve => setTimeout(resolve, 150));
        unblock.resolve();
        await Promise.all([firstRun, secondRun]);
        (0, globals_1.expect)(billingService.generateAndExportReport).toHaveBeenCalledTimes(1);
        (0, globals_1.expect)(logger.warn).toHaveBeenCalledWith(globals_1.expect.objectContaining({ lockTimeoutMs: 100 }), 'Billing close lock not acquired within timeout; skipping run');
    });
});
function defer() {
    let resolve;
    const promise = new Promise(res => {
        resolve = res;
    });
    return { promise, resolve };
}
