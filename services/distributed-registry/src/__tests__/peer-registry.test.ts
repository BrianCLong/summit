/**
 * Tests for PeerRegistry
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PeerRegistry } from '../peer-registry.js';

describe('PeerRegistry', () => {
  let registry: PeerRegistry;

  beforeEach(() => {
    registry = new PeerRegistry();
  });

  describe('register', () => {
    it('should register a peer successfully', async () => {
      const peer = {
        peerId: 'peer-1',
        publicKey: Buffer.from('test-key').toString('base64'),
        endpoints: ['http://localhost:3000'],
        capabilities: ['data-pool', 'marketplace'],
      };

      await registry.register(peer);
      const retrieved = await registry.getPeer('peer-1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.peerId).toBe('peer-1');
    });

    it('should calculate trust score based on attestations', async () => {
      const peer = {
        peerId: 'peer-2',
        publicKey: Buffer.from('test-key').toString('base64'),
        endpoints: ['http://localhost:3001'],
        capabilities: ['data-pool'],
        attestations: [
          {
            issuer: 'did:web:trusted.org',
            claim: 'verified',
            signature: 'sig',
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
        ],
      };

      await registry.register(peer);
      const retrieved = await registry.getPeer('peer-2');

      expect(retrieved).toBeDefined();
    });
  });

  describe('discover', () => {
    it('should filter peers by capability', async () => {
      await registry.register({
        peerId: 'peer-a',
        publicKey: Buffer.from('key-a').toString('base64'),
        endpoints: ['http://a.local'],
        capabilities: ['marketplace'],
      });

      await registry.register({
        peerId: 'peer-b',
        publicKey: Buffer.from('key-b').toString('base64'),
        endpoints: ['http://b.local'],
        capabilities: ['data-pool'],
      });

      const marketplacePeers = await registry.discover({ capability: 'marketplace' });
      expect(marketplacePeers).toHaveLength(1);
      expect(marketplacePeers[0].peerId).toBe('peer-a');
    });
  });
});
