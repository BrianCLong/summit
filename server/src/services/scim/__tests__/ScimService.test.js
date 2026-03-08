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
// @ts-nocheck
const globals_1 = require("@jest/globals");
// Mock dependencies
globals_1.jest.unstable_mockModule('../../../config/database.js', () => ({
    getPostgresPool: globals_1.jest.fn(),
}));
globals_1.jest.unstable_mockModule('../../UserManagementService.js', () => ({
    userManagementService: {
        listUsers: globals_1.jest.fn(),
        getUser: globals_1.jest.fn(),
        createUser: globals_1.jest.fn(),
        updateUser: globals_1.jest.fn(),
        deleteUser: globals_1.jest.fn(),
    },
}));
(0, globals_1.describe)('ScimService', () => {
    let ScimService;
    let userManagementService;
    let getPostgresPool;
    let service;
    let mockPool;
    let mockClient;
    const mockManagedUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        fullName: 'Test User',
        role: 'ANALYST',
        tenantId: 'tenant-1',
        tenantIds: ['tenant-1'],
        isActive: true,
        isLocked: false,
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin'
    };
    (0, globals_1.beforeAll)(async () => {
        ({ ScimService } = await Promise.resolve().then(() => __importStar(require('../ScimService.js'))));
        ({ userManagementService } = await Promise.resolve().then(() => __importStar(require('../../UserManagementService.js'))));
        ({ getPostgresPool } = await Promise.resolve().then(() => __importStar(require('../../../config/database.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        mockClient = {
            query: globals_1.jest.fn(),
            release: globals_1.jest.fn()
        };
        mockPool = {
            connect: globals_1.jest.fn().mockResolvedValue(mockClient),
            query: globals_1.jest.fn()
        };
        getPostgresPool.mockReturnValue(mockPool);
        service = new ScimService();
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('listUsers', () => {
        (0, globals_1.it)('should return a list of SCIM users', async () => {
            userManagementService.listUsers.mockResolvedValue({
                data: {
                    users: [mockManagedUser],
                    total: 1
                }
            });
            const result = await service.listUsers('tenant-1', 1, 10);
            (0, globals_1.expect)(result.totalResults).toBe(1);
            (0, globals_1.expect)(result.Resources[0].id).toBe('user-1');
            (0, globals_1.expect)(result.Resources[0].userName).toBe('testuser'); // Username preferred
            (0, globals_1.expect)(userManagementService.listUsers).toHaveBeenCalledWith('tenant-1', globals_1.expect.objectContaining({ page: 1, pageSize: 10 }), 'scim-service');
        });
        (0, globals_1.it)('should filter users by userName (exact match logic)', async () => {
            userManagementService.listUsers.mockResolvedValue({
                data: {
                    users: [mockManagedUser],
                    total: 1
                }
            });
            // Filter by userName matching internal username
            const result = await service.listUsers('tenant-1', 1, 10, 'userName eq "testuser"');
            (0, globals_1.expect)(result.totalResults).toBe(1);
            (0, globals_1.expect)(result.Resources[0].userName).toBe('testuser');
            (0, globals_1.expect)(userManagementService.listUsers).toHaveBeenCalledWith('tenant-1', globals_1.expect.objectContaining({ search: 'testuser' }), 'scim-service');
        });
        (0, globals_1.it)('should filter users by userName (fallback to email logic)', async () => {
            const userWithEmailOnly = { ...mockManagedUser, username: undefined };
            userManagementService.listUsers.mockResolvedValue({
                data: {
                    users: [userWithEmailOnly],
                    total: 1
                }
            });
            // Filter by userName matching internal email
            const result = await service.listUsers('tenant-1', 1, 10, 'userName eq "test@example.com"');
            (0, globals_1.expect)(result.totalResults).toBe(1);
            (0, globals_1.expect)(result.Resources[0].userName).toBe('test@example.com');
            (0, globals_1.expect)(userManagementService.listUsers).toHaveBeenCalledWith('tenant-1', globals_1.expect.objectContaining({ search: 'test@example.com' }), 'scim-service');
        });
        (0, globals_1.it)('should handle sorting parameters', async () => {
            userManagementService.listUsers.mockResolvedValue({
                data: {
                    users: [mockManagedUser],
                    total: 1
                }
            });
            await service.listUsers('tenant-1', 1, 10, undefined, 'name.familyName', 'asc');
            (0, globals_1.expect)(userManagementService.listUsers).toHaveBeenCalledWith('tenant-1', globals_1.expect.objectContaining({ sortBy: 'lastName', sortOrder: 'asc' }), 'scim-service');
        });
    });
    (0, globals_1.describe)('createUser', () => {
        (0, globals_1.it)('should create a user via UserManagementService', async () => {
            const scimUser = {
                userName: 'newuser',
                name: { givenName: 'New', familyName: 'User' },
                emails: [{ value: 'new@example.com', primary: true }]
            };
            userManagementService.createUser.mockResolvedValue({
                data: {
                    user: { ...mockManagedUser, id: 'new-user', email: 'new@example.com', username: 'newuser' },
                    message: 'Success'
                }
            });
            const result = await service.createUser('tenant-1', scimUser);
            (0, globals_1.expect)(result.id).toBe('new-user');
            (0, globals_1.expect)(result.userName).toBe('newuser');
            (0, globals_1.expect)(userManagementService.createUser).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('patchUser', () => {
        (0, globals_1.it)('should patch user active status', async () => {
            // Mock getUser
            userManagementService.getUser.mockResolvedValue({
                data: mockManagedUser
            });
            // Mock updateUser
            userManagementService.updateUser.mockResolvedValue({
                data: { user: { ...mockManagedUser, isActive: false } }
            });
            const patchRequest = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
                Operations: [{ op: "replace", path: "active", value: false }]
            };
            const result = await service.patchUser('tenant-1', 'user-1', patchRequest);
            (0, globals_1.expect)(result.active).toBe(false);
            (0, globals_1.expect)(userManagementService.updateUser).toHaveBeenCalledWith('tenant-1', 'user-1', { isActive: false }, 'scim-service');
        });
    });
    (0, globals_1.describe)('listGroups', () => {
        (0, globals_1.it)('should list groups from database', async () => {
            mockClient.query.mockImplementation((sql) => {
                if (sql.includes('COUNT'))
                    return { rows: [{ count: 1 }] };
                if (sql.includes('SELECT * FROM scim_groups'))
                    return { rows: [{ id: 'group-1', display_name: 'Engineers', created_at: new Date(), updated_at: new Date() }] };
                if (sql.includes('SELECT user_id'))
                    return { rows: [{ user_id: 'user-1' }] };
                return { rows: [] };
            });
            const result = await service.listGroups('tenant-1');
            (0, globals_1.expect)(result.totalResults).toBe(1);
            (0, globals_1.expect)(result.Resources[0].displayName).toBe('Engineers');
            (0, globals_1.expect)(result.Resources[0].members).toHaveLength(1);
        });
        (0, globals_1.it)('should filter groups by displayName', async () => {
            mockClient.query.mockImplementation((sql, params) => {
                if (sql.includes('COUNT'))
                    return { rows: [{ count: 1 }] };
                if (sql.includes('SELECT * FROM scim_groups')) {
                    // Check if filter param was passed
                    if (params.includes('Engineers')) {
                        return { rows: [{ id: 'group-1', display_name: 'Engineers', created_at: new Date(), updated_at: new Date() }] };
                    }
                    return { rows: [] };
                }
                if (sql.includes('SELECT user_id'))
                    return { rows: [] };
                return { rows: [] };
            });
            const result = await service.listGroups('tenant-1', 1, 10, 'displayName eq "Engineers"');
            (0, globals_1.expect)(result.totalResults).toBe(1);
            (0, globals_1.expect)(result.Resources[0].displayName).toBe('Engineers');
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('display_name = $'), globals_1.expect.arrayContaining(['Engineers']));
        });
    });
    (0, globals_1.describe)('processBulk', () => {
        (0, globals_1.it)('should process bulk requests including Group DELETE', async () => {
            // Mock deleteGroup
            const deleteSpy = globals_1.jest.spyOn(service, 'deleteGroup').mockResolvedValue(undefined);
            const bulkRequest = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:BulkRequest"],
                Operations: [
                    {
                        method: 'DELETE',
                        path: '/Groups/group-1',
                        bulkId: 'bulk-1'
                    }
                ]
            };
            const result = await service.processBulk('tenant-1', bulkRequest);
            (0, globals_1.expect)(result.Operations[0].status).toBe('204');
            (0, globals_1.expect)(deleteSpy).toHaveBeenCalledWith('tenant-1', 'group-1');
        });
    });
});
