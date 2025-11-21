/**
 * Tests for DIDManager
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DIDManager } from '../did-manager.js';

describe('DIDManager', () => {
  let didManager: DIDManager;

  beforeEach(() => {
    didManager = new DIDManager();
  });

  describe('createDID', () => {
    it('should create a did:key DID', async () => {
      const result = await didManager.createDID('key');

      expect(result.did).toMatch(/^did:key:z/);
      expect(result.document).toBeDefined();
      expect(result.document.id).toBe(result.did);
      expect(result.privateKey).toBeDefined();
    });

    it('should create a did:web DID', async () => {
      const result = await didManager.createDID('web');

      expect(result.did).toMatch(/^did:web:intelgraph\.io/);
      expect(result.document.verificationMethod).toHaveLength(1);
    });

    it('should include verification methods', async () => {
      const result = await didManager.createDID('key');

      expect(result.document.verificationMethod).toHaveLength(1);
      expect(result.document.verificationMethod[0].type).toBe('JsonWebKey2020');
      expect(result.document.authentication).toContain(`${result.did}#key-1`);
    });
  });

  describe('resolveDID', () => {
    it('should resolve a created DID', async () => {
      const { did } = await didManager.createDID('key');
      const resolved = await didManager.resolveDID(did);

      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe(did);
    });

    it('should return undefined for unknown DID', async () => {
      const resolved = await didManager.resolveDID('did:key:zunknown');
      expect(resolved).toBeUndefined();
    });
  });

  describe('updateDID', () => {
    it('should update DID document', async () => {
      const { did } = await didManager.createDID('key');

      const updated = await didManager.updateDID(did, {
        controller: 'did:key:zcontroller',
      });

      expect(updated?.controller).toBe('did:key:zcontroller');
      expect(updated?.id).toBe(did); // ID should not change
    });
  });

  describe('addService', () => {
    it('should add a service endpoint', async () => {
      const { did } = await didManager.createDID('key');

      const updated = await didManager.addService(did, {
        id: `${did}#messaging`,
        type: 'MessagingService',
        serviceEndpoint: 'https://messaging.example.com',
      });

      expect(updated?.service).toHaveLength(1);
      expect(updated?.service?.[0].type).toBe('MessagingService');
    });
  });

  describe('deactivateDID', () => {
    it('should deactivate a DID', async () => {
      const { did } = await didManager.createDID('key');

      const deactivated = await didManager.deactivateDID(did);
      expect(deactivated).toBe(true);

      const resolved = await didManager.resolveDID(did);
      expect(resolved).toBeUndefined();
    });
  });
});
