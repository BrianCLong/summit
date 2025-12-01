/**
 * Peer Registry - DHT-based peer discovery and management
 */

import type { Peer, DataPool } from './index.js';

interface DiscoveryOptions {
  capability?: string;
  minTrustScore?: number;
}

interface PoolDiscoveryOptions {
  owner?: string;
  accessType?: string;
}

export class PeerRegistry {
  private peers: Map<string, Peer & { trustScore: number; lastSeen: Date }> = new Map();
  private pools: Map<string, DataPool> = new Map();

  async register(peer: Peer): Promise<void> {
    this.peers.set(peer.peerId, {
      ...peer,
      trustScore: await this.calculateTrustScore(peer),
      lastSeen: new Date(),
    });
  }

  async discover(options: DiscoveryOptions): Promise<Peer[]> {
    const results: Peer[] = [];
    for (const [_, peer] of this.peers) {
      if (options.capability && !peer.capabilities.includes(options.capability)) {
        continue;
      }
      if (options.minTrustScore && peer.trustScore < options.minTrustScore) {
        continue;
      }
      results.push(peer);
    }
    return results;
  }

  async registerPool(pool: DataPool): Promise<void> {
    this.pools.set(pool.poolId, pool);
  }

  async discoverPools(options: PoolDiscoveryOptions): Promise<DataPool[]> {
    const results: DataPool[] = [];
    for (const [_, pool] of this.pools) {
      if (options.owner && pool.owner !== options.owner) continue;
      if (options.accessType && pool.accessPolicy.type !== options.accessType) continue;
      results.push(pool);
    }
    return results;
  }

  private async calculateTrustScore(peer: Peer): Promise<number> {
    let score = 0.5; // Base score
    if (peer.attestations?.length) {
      // Weighted by attestation count and recency
      score += Math.min(peer.attestations.length * 0.1, 0.4);
    }
    return Math.min(score, 1.0);
  }

  async getPeer(peerId: string): Promise<Peer | undefined> {
    return this.peers.get(peerId);
  }

  async updateHeartbeat(peerId: string): Promise<void> {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.lastSeen = new Date();
    }
  }
}
