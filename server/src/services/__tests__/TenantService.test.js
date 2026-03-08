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
const crypto_1 = require("crypto");
const getPostgresPoolMock = globals_1.jest.fn();
const checkTenantEnrollmentEligibilityMock = globals_1.jest.fn();
const appendEntryMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../config/database.js', () => ({
    getPostgresPool: getPostgresPoolMock,
}));
globals_1.jest.unstable_mockModule('../GAEnrollmentService.js', () => ({
    default: {
        checkTenantEnrollmentEligibility: checkTenantEnrollmentEligibilityMock,
    },
}));
globals_1.jest.unstable_mockModule('../../provenance/ledger.js', () => ({
    provenanceLedger: {
        appendEntry: appendEntryMock,
    },
}));
(0, globals_1.describe)('TenantService', () => {
    let TenantService;
    let tenantService;
    let mockClient;
    let mockPool;
    (0, globals_1.beforeAll)(async () => {
        ({ TenantService } = await Promise.resolve().then(() => __importStar(require('../TenantService.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockClient = {
            query: globals_1.jest.fn(),
            release: globals_1.jest.fn(),
        };
        mockPool = {
            connect: globals_1.jest.fn().mockResolvedValue(mockClient),
            query: globals_1.jest.fn(),
        };
        getPostgresPoolMock.mockReturnValue(mockPool);
        checkTenantEnrollmentEligibilityMock.mockResolvedValue({
            eligible: true,
            reason: 'ok',
        });
        appendEntryMock.mockResolvedValue({ id: 'prov-entry' });
        TenantService.instance = null;
        tenantService = TenantService.getInstance();
    });
    (0, globals_1.describe)('createTenant', () => {
        const validInput = {
            name: 'Test Corp',
            slug: 'test-corp',
            residency: 'US',
        };
        const actorId = 'user-123';
        (0, globals_1.it)('should create a tenant successfully and associate user', async () => {
            const mockTenantRow = {
                id: (0, crypto_1.randomUUID)(),
                name: validInput.name,
                slug: validInput.slug,
                residency: validInput.residency,
                tier: 'starter',
                status: 'active',
                config: {},
                settings: {},
                created_by: actorId,
                created_at: new Date(),
                updated_at: new Date(),
            };
            mockClient.query
                .mockResolvedValueOnce(undefined) // BEGIN
                .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // SELECT slug
                .mockResolvedValueOnce({ rows: [mockTenantRow] }) // INSERT tenant
                .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // UPDATE user
                .mockResolvedValueOnce(undefined); // COMMIT
            const result = await tenantService.createTenant(validInput, actorId);
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result.slug).toBe(validInput.slug);
            (0, globals_1.expect)(result.residency).toBe(validInput.residency);
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('UPDATE users'), globals_1.expect.arrayContaining([globals_1.expect.any(String), 'ADMIN', actorId]));
            (0, globals_1.expect)(appendEntryMock).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                action: 'TENANT_CREATED',
                actor: globals_1.expect.objectContaining({ id: actorId }),
            }));
        });
        (0, globals_1.it)('should return existing tenant if created by same user (idempotency)', async () => {
            const existingTenantRow = {
                id: (0, crypto_1.randomUUID)(),
                name: validInput.name,
                slug: validInput.slug,
                residency: validInput.residency,
                tier: 'starter',
                created_by: actorId,
                status: 'active',
                config: {},
                settings: {},
                created_at: new Date(),
                updated_at: new Date(),
            };
            mockClient.query
                .mockResolvedValueOnce(undefined) // BEGIN
                .mockResolvedValueOnce({ rowCount: 1, rows: [existingTenantRow] }) // SELECT slug
                .mockResolvedValueOnce(undefined); // ROLLBACK
            const result = await tenantService.createTenant(validInput, actorId);
            (0, globals_1.expect)(result.id).toBe(existingTenantRow.id);
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            (0, globals_1.expect)(mockClient.query).not.toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO tenants'));
        });
        (0, globals_1.it)('should throw error if slug is already taken by another user', async () => {
            const otherUserRow = {
                ...validInput,
                created_by: 'other-user',
                id: (0, crypto_1.randomUUID)(),
                config: {},
                settings: {},
                tier: 'starter',
                status: 'active',
                created_at: new Date(),
                updated_at: new Date(),
            };
            mockClient.query
                .mockResolvedValueOnce(undefined) // BEGIN
                .mockResolvedValueOnce({ rowCount: 1, rows: [otherUserRow] }); // SELECT slug
            await (0, globals_1.expect)(tenantService.createTenant(validInput, actorId)).rejects.toThrow("Tenant slug 'test-corp' is already taken");
        });
    });
});
