// @ts-nocheck
import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../../../config/database.js', () => ({
  getPostgresPool: jest.fn(),
}));

jest.unstable_mockModule('../../UserManagementService.js', () => ({
  userManagementService: {
    listUsers: jest.fn(),
    getUser: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  },
}));

describe('ScimService', () => {
    let ScimService: typeof import('../ScimService.js').ScimService;
    let userManagementService: {
        listUsers: jest.Mock;
        getUser: jest.Mock;
        createUser: jest.Mock;
        updateUser: jest.Mock;
        deleteUser: jest.Mock;
    };
    let getPostgresPool: jest.Mock;
    let service: ScimService;
    let mockPool: any;
    let mockClient: any;

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

    beforeAll(async () => {
        ({ ScimService } = await import('../ScimService.js'));
        ({ userManagementService } = await import('../../UserManagementService.js'));
        ({ getPostgresPool } = await import('../../../config/database.js'));
    });

    beforeEach(() => {
        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };
        mockPool = {
            connect: jest.fn().mockResolvedValue(mockClient),
            query: jest.fn()
        };
        (getPostgresPool as any).mockReturnValue(mockPool);

        service = new ScimService();
        jest.clearAllMocks();
    });

    describe('listUsers', () => {
        it('should return a list of SCIM users', async () => {
            (userManagementService.listUsers as any).mockResolvedValue({
                data: {
                    users: [mockManagedUser],
                    total: 1
                }
            });

            const result = await service.listUsers('tenant-1', 1, 10);

            expect(result.totalResults).toBe(1);
            expect(result.Resources[0].id).toBe('user-1');
            expect(result.Resources[0].userName).toBe('testuser'); // Username preferred
            expect(userManagementService.listUsers).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ page: 1, pageSize: 10 }), 'scim-service');
        });

        it('should filter users by userName (exact match logic)', async () => {
            (userManagementService.listUsers as any).mockResolvedValue({
                data: {
                    users: [mockManagedUser],
                    total: 1
                }
            });

            // Filter by userName matching internal username
            const result = await service.listUsers('tenant-1', 1, 10, 'userName eq "testuser"');

            expect(result.totalResults).toBe(1);
            expect(result.Resources[0].userName).toBe('testuser');
            expect(userManagementService.listUsers).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ search: 'testuser' }), 'scim-service');
        });

        it('should filter users by userName (fallback to email logic)', async () => {
             const userWithEmailOnly = { ...mockManagedUser, username: undefined };
             (userManagementService.listUsers as any).mockResolvedValue({
                data: {
                    users: [userWithEmailOnly],
                    total: 1
                }
            });

            // Filter by userName matching internal email
            const result = await service.listUsers('tenant-1', 1, 10, 'userName eq "test@example.com"');

            expect(result.totalResults).toBe(1);
            expect(result.Resources[0].userName).toBe('test@example.com');
            expect(userManagementService.listUsers).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ search: 'test@example.com' }), 'scim-service');
        });

        it('should handle sorting parameters', async () => {
            (userManagementService.listUsers as any).mockResolvedValue({
                data: {
                    users: [mockManagedUser],
                    total: 1
                }
            });

            await service.listUsers('tenant-1', 1, 10, undefined, 'name.familyName', 'asc');

            expect(userManagementService.listUsers).toHaveBeenCalledWith('tenant-1', expect.objectContaining({ sortBy: 'lastName', sortOrder: 'asc' }), 'scim-service');
        });
    });

    describe('createUser', () => {
        it('should create a user via UserManagementService', async () => {
            const scimUser: any = {
                userName: 'newuser',
                name: { givenName: 'New', familyName: 'User' },
                emails: [{ value: 'new@example.com', primary: true }]
            };

            (userManagementService.createUser as any).mockResolvedValue({
                data: {
                    user: { ...mockManagedUser, id: 'new-user', email: 'new@example.com', username: 'newuser' },
                    message: 'Success'
                }
            });

            const result = await service.createUser('tenant-1', scimUser);

            expect(result.id).toBe('new-user');
            expect(result.userName).toBe('newuser');
            expect(userManagementService.createUser).toHaveBeenCalled();
        });
    });

    describe('patchUser', () => {
        it('should patch user active status', async () => {
            // Mock getUser
            (userManagementService.getUser as any).mockResolvedValue({
                data: mockManagedUser
            });
            // Mock updateUser
            (userManagementService.updateUser as any).mockResolvedValue({
                data: { user: { ...mockManagedUser, isActive: false } }
            });

            const patchRequest: any = {
                schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
                Operations: [{ op: "replace", path: "active", value: false }]
            };

            const result = await service.patchUser('tenant-1', 'user-1', patchRequest);

            expect(result.active).toBe(false);
            expect(userManagementService.updateUser).toHaveBeenCalledWith('tenant-1', 'user-1', { isActive: false }, 'scim-service');
        });
    });

    describe('listGroups', () => {
        it('should list groups from database', async () => {
            mockClient.query.mockImplementation((sql: string) => {
                if (sql.includes('COUNT')) return { rows: [{ count: 1 }] };
                if (sql.includes('SELECT * FROM scim_groups')) return { rows: [{ id: 'group-1', display_name: 'Engineers', created_at: new Date(), updated_at: new Date() }] };
                if (sql.includes('SELECT user_id')) return { rows: [{ user_id: 'user-1' }] };
                return { rows: [] };
            });

            const result = await service.listGroups('tenant-1');

            expect(result.totalResults).toBe(1);
            expect(result.Resources[0].displayName).toBe('Engineers');
            expect(result.Resources[0].members).toHaveLength(1);
        });

        it('should filter groups by displayName', async () => {
            mockClient.query.mockImplementation((sql: string, params: any[]) => {
                if (sql.includes('COUNT')) return { rows: [{ count: 1 }] };
                if (sql.includes('SELECT * FROM scim_groups')) {
                     // Check if filter param was passed
                     if (params.includes('Engineers')) {
                         return { rows: [{ id: 'group-1', display_name: 'Engineers', created_at: new Date(), updated_at: new Date() }] };
                     }
                     return { rows: [] };
                }
                if (sql.includes('SELECT user_id')) return { rows: [] };
                return { rows: [] };
            });

            const result = await service.listGroups('tenant-1', 1, 10, 'displayName eq "Engineers"');

            expect(result.totalResults).toBe(1);
            expect(result.Resources[0].displayName).toBe('Engineers');
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('display_name = $'), expect.arrayContaining(['Engineers']));
        });
    });

    describe('processBulk', () => {
         it('should process bulk requests including Group DELETE', async () => {
             // Mock deleteGroup
             const deleteSpy = jest.spyOn(service, 'deleteGroup').mockResolvedValue(undefined);

             const bulkRequest: any = {
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

             expect(result.Operations[0].status).toBe('204');
             expect(deleteSpy).toHaveBeenCalledWith('tenant-1', 'group-1');
         });
    });
});
