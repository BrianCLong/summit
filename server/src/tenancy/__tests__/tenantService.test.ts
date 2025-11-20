import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { TenantService } from '../tenantService.js';
import { TenantStore } from '../tenantStore.js';
import NodeCache from 'node-cache';
import crypto from 'node:crypto';

// Mock modules
jest.mock('../tenantStore.js');
jest.mock('node-cache');

// Mock crypto.randomUUID properly
const mockUUID = '00000000-0000-0000-0000-000000000000';

// We need to spy on the crypto module, but since it's a native module used in the SUT,
// we might need to mock the import in the test file if we are using ES modules.
// However, jest.spyOn(crypto, 'randomUUID') works if crypto is imported as 'import crypto from "node:crypto"'.

describe('TenantService', () => {
  let tenantService: TenantService;
  let mockStoreInstance: any;
  let mockCacheInstance: any;
  let randomUUIDSpy: any;

  beforeEach(() => {
    jest.clearAllMocks();

    randomUUIDSpy = jest.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID as any);

    // Define what the mocks should look like when instantiated
    mockStoreInstance = {
      getTenantById: jest.fn(),
      getTenantByName: jest.fn(),
      createTenant: jest.fn(),
      updateTenant: jest.fn(),
    };

    mockCacheInstance = {
      get: jest.fn(),
      set: jest.fn(),
      on: jest.fn(), // Some versions of NodeCache might call 'on'
    };

    // When the constructor is called, return our mock instance
    (TenantStore as jest.Mock).mockImplementation(() => mockStoreInstance);
    (NodeCache as unknown as jest.Mock).mockImplementation(() => mockCacheInstance);

    // Instantiate the service
    tenantService = new TenantService();
  });

  afterEach(() => {
      if (randomUUIDSpy) randomUUIDSpy.mockRestore();
  });

  describe('getTenant', () => {
    it('should return tenant from cache if present', async () => {
      const mockTenant = { id: 't1', name: 'Test Tenant' };
      mockCacheInstance.get.mockReturnValue(mockTenant);

      const result = await tenantService.getTenant('t1');

      expect(result).toEqual(mockTenant);
      expect(mockCacheInstance.get).toHaveBeenCalledWith('t1');
      expect(mockStoreInstance.getTenantById).not.toHaveBeenCalled();
    });

    it('should fetch from store if not in cache, and cache it', async () => {
      const mockTenant = { id: 't1', name: 'Test Tenant' };
      mockCacheInstance.get.mockReturnValue(undefined);
      mockStoreInstance.getTenantById.mockResolvedValue(mockTenant);

      const result = await tenantService.getTenant('t1');

      expect(result).toEqual(mockTenant);
      expect(mockStoreInstance.getTenantById).toHaveBeenCalledWith('t1');
      expect(mockCacheInstance.set).toHaveBeenCalledWith('t1', mockTenant);
    });

    it('should return null if tenant does not exist', async () => {
      mockCacheInstance.get.mockReturnValue(undefined);
      mockStoreInstance.getTenantById.mockResolvedValue(null);

      const result = await tenantService.getTenant('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createTenant', () => {
    it('should create a tenant with default values', async () => {
      const mockCreatedTenant = { id: mockUUID, name: 'New Tenant', status: 'active', tier: 'free' };
      mockStoreInstance.createTenant.mockResolvedValue(mockCreatedTenant);

      const result = await tenantService.createTenant('New Tenant');

      expect(result).toEqual(mockCreatedTenant);
      expect(mockStoreInstance.createTenant).toHaveBeenCalledWith(expect.objectContaining({
        id: mockUUID,
        name: 'New Tenant',
        tier: 'free',
        status: 'active'
      }));
      expect(mockCacheInstance.set).toHaveBeenCalledWith(mockUUID, mockCreatedTenant);
    });
  });

  describe('updateTenantConfig', () => {
    it('should update tenant config and cache', async () => {
      const existingTenant = {
        id: 't1',
        config: { features: { a: true }, limits: { maxUsers: 10 } }
      };

      // Setup getTenant behavior
      // We need to mock getTenant behavior which relies on cache/store
      mockCacheInstance.get.mockReturnValue(existingTenant);

      const updatedTenant = { ...existingTenant, config: { features: { a: true, b: true }, limits: { maxUsers: 10 } } };
      mockStoreInstance.updateTenant.mockResolvedValue(updatedTenant);

      const result = await tenantService.updateTenantConfig('t1', { features: { b: true } });

      expect(result).toEqual(updatedTenant);
      expect(mockStoreInstance.updateTenant).toHaveBeenCalledWith('t1', expect.objectContaining({
          config: expect.objectContaining({
            features: { a: true, b: true }
          })
      }));
      expect(mockCacheInstance.set).toHaveBeenCalledWith('t1', updatedTenant);
    });
  });

  describe('suspendTenant', () => {
    it('should suspend tenant', async () => {
        const suspendedTenant = { id: 't1', status: 'suspended' };
        mockStoreInstance.updateTenant.mockResolvedValue(suspendedTenant);

        const result = await tenantService.suspendTenant('t1');

        expect(result).toEqual(suspendedTenant);
        expect(mockStoreInstance.updateTenant).toHaveBeenCalledWith('t1', { status: 'suspended' });
        expect(mockCacheInstance.set).toHaveBeenCalledWith('t1', suspendedTenant);
    });
  });
});
