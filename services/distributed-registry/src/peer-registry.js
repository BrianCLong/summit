"use strict";
/**
 * Peer Registry - DHT-based peer discovery and management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeerRegistry = void 0;
class PeerRegistry {
    peers = new Map();
    pools = new Map();
    async register(peer) {
        this.peers.set(peer.peerId, {
            ...peer,
            trustScore: await this.calculateTrustScore(peer),
            lastSeen: new Date(),
        });
    }
    async discover(options) {
        const results = [];
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
    async registerPool(pool) {
        this.pools.set(pool.poolId, pool);
    }
    async discoverPools(options) {
        const results = [];
        for (const [_, pool] of this.pools) {
            if (options.owner && pool.owner !== options.owner) {
                continue;
            }
            if (options.accessType && pool.accessPolicy.type !== options.accessType) {
                continue;
            }
            results.push(pool);
        }
        return results;
    }
    async calculateTrustScore(peer) {
        let score = 0.5; // Base score
        if (peer.attestations?.length) {
            // Weighted by attestation count and recency
            score += Math.min(peer.attestations.length * 0.1, 0.4);
        }
        return Math.min(score, 1.0);
    }
    async getPeer(peerId) {
        return this.peers.get(peerId);
    }
    async updateHeartbeat(peerId) {
        const peer = this.peers.get(peerId);
        if (peer) {
            peer.lastSeen = new Date();
        }
    }
}
exports.PeerRegistry = PeerRegistry;
