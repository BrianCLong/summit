// @ts-nocheck
import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';
import { DigitalTwinService } from '../DigitalTwinService.js';
import { GlobalMeshService } from '../GlobalMeshService.js';
import { AssetType, TwinSyncState } from '../../types/digitalTwin.js';

// Mock ScimService dependencies
jest.unstable_mockModule('../../config/database.js', () => ({
  getPostgresPool: jest.fn(),
}));

jest.unstable_mockModule('../UserManagementService.js', () => ({
  userManagementService: {
    listUsers: jest.fn(),
    getUser: jest.fn(),
  },
}));

describe('Org Mesh Twin Integration', () => {
  let ScimService: typeof import('../scim/ScimService.js').ScimService;
  let getPostgresPool: jest.Mock;
  let twinService: DigitalTwinService;
  let scimService: any;
  let mockPool: any;
  let mockClient: any;

  beforeAll(async () => {
    // Dynamic import to use mocked modules
    const dbModule = await import('../../config/database.js');
    getPostgresPool = dbModule.getPostgresPool as jest.Mock;

    const scimModule = await import('../scim/ScimService.js');
    ScimService = scimModule.ScimService;
  });

  beforeEach(() => {
    // Setup Mock DB
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn()
    };
    (getPostgresPool as any).mockReturnValue(mockPool);

    // Instantiate services
    twinService = new DigitalTwinService();
    scimService = new ScimService();

    // Spy on GlobalMeshService
    jest.spyOn(GlobalMeshService, 'sync').mockImplementation(() => Promise.resolve());
  });

  it('should orchestrate Org Twin creation and Mesh sync', async () => {
    // 1. Create Digital Twin Assets (Org Units)
    const hq = await twinService.createAsset({
      name: 'Global HQ',
      type: AssetType.BUILDING,
      geometry: { type: 'Point', coordinates: [0, 0] },
      metadata: { orgUnit: 'HQ' }
    });

    const remoteOffice = await twinService.createAsset({
      name: 'Remote Branch',
      type: AssetType.BUILDING,
      geometry: { type: 'Point', coordinates: [10, 10] },
      parentId: hq.id,
      metadata: { orgUnit: 'Branch-1' }
    });

    expect(hq.id).toBeDefined();
    expect(remoteOffice.parentId).toBe(hq.id);

    // 2. Simulate SCIM Group Linkage (Mocked DB interaction)
    mockClient.query.mockImplementation((sql: string, params: any[]) => {
      if (sql.includes('SELECT id FROM scim_groups')) return { rows: [] }; // Not found initially
      if (sql.includes('INSERT INTO scim_groups')) return { rows: [{ id: 'group-1' }] };
      if (sql.includes('SELECT * FROM scim_groups')) return {
        rows: [{
          id: 'group-1',
          display_name: 'HQ Staff',
          external_id: hq.id,
          created_at: new Date(),
          updated_at: new Date()
        }]
      };
      if (sql.includes('SELECT user_id')) return { rows: [] }; // No members yet
      return { rows: [] };
    });

    await scimService.createGroup('tenant-1', {
      displayName: 'HQ Staff',
      externalId: hq.id // Link SCIM Group to Twin Asset via externalId
    });

    // 3. Trigger Global Mesh Sync
    const syncPayload = {
      assetId: hq.id,
      scimGroupId: 'group-1',
      timestamp: new Date()
    };

    await GlobalMeshService.sync(syncPayload);

    expect(GlobalMeshService.sync).toHaveBeenCalledWith(syncPayload);

    // 4. Verify State
    const fetchedHq = await twinService.getAsset(hq.id);
    expect(fetchedHq?.syncState).toBe(TwinSyncState.SYNCED);
  });
});
