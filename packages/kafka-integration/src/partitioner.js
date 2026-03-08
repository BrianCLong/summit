"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomFieldPartitioner = exports.ConsistentHashPartitioner = exports.Murmur2Partitioner = void 0;
/**
 * Murmur2 hash function (Java compatible)
 */
function murmur2(key) {
    const data = Buffer.from(key, 'utf-8');
    const length = data.length;
    const seed = 0x9747b28c;
    const m = 0x5bd1e995;
    const r = 24;
    let h = seed ^ length;
    let offset = 0;
    while (length >= 4) {
        let k = (data[offset] & 0xff) +
            ((data[offset + 1] & 0xff) << 8) +
            ((data[offset + 2] & 0xff) << 16) +
            ((data[offset + 3] & 0xff) << 24);
        k = Math.imul(k, m);
        k ^= k >>> r;
        k = Math.imul(k, m);
        h = Math.imul(h, m);
        h ^= k;
        offset += 4;
    }
    switch (length % 4) {
        case 3:
            h ^= (data[offset + 2] & 0xff) << 16;
        case 2:
            h ^= (data[offset + 1] & 0xff) << 8;
        case 1:
            h ^= data[offset] & 0xff;
            h = Math.imul(h, m);
    }
    h ^= h >>> 13;
    h = Math.imul(h, m);
    h ^= h >>> 15;
    return h >>> 0;
}
/**
 * Consistent hash ring for partition assignment
 */
class ConsistentHashRing {
    partitions;
    ring = new Map();
    virtualNodes = 150;
    constructor(partitions) {
        this.partitions = partitions;
        this.buildRing();
    }
    buildRing() {
        for (let partition = 0; partition < this.partitions; partition++) {
            for (let i = 0; i < this.virtualNodes; i++) {
                const hash = murmur2(`${partition}-${i}`);
                this.ring.set(hash, partition);
            }
        }
    }
    getPartition(key) {
        const hash = murmur2(key);
        const sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);
        // Find the first hash >= key hash
        for (const ringHash of sortedHashes) {
            if (ringHash >= hash) {
                return this.ring.get(ringHash);
            }
        }
        // Wrap around to first partition
        return this.ring.get(sortedHashes[0]);
    }
}
/**
 * Murmur2 partitioner (Kafka default)
 */
const Murmur2Partitioner = () => {
    return ({ topic, partitionMetadata, message }) => {
        const numPartitions = partitionMetadata.length;
        if (!message.key) {
            // Round-robin for messages without key
            return Math.floor(Math.random() * numPartitions);
        }
        const key = message.key.toString();
        const hash = murmur2(key);
        return Math.abs(hash) % numPartitions;
    };
};
exports.Murmur2Partitioner = Murmur2Partitioner;
/**
 * Consistent hash partitioner
 */
const ConsistentHashPartitioner = () => {
    const rings = new Map();
    return ({ topic, partitionMetadata, message }) => {
        const numPartitions = partitionMetadata.length;
        if (!message.key) {
            return Math.floor(Math.random() * numPartitions);
        }
        // Get or create ring for topic
        if (!rings.has(topic)) {
            rings.set(topic, new ConsistentHashRing(numPartitions));
        }
        const ring = rings.get(topic);
        const key = message.key.toString();
        return ring.getPartition(key);
    };
};
exports.ConsistentHashPartitioner = ConsistentHashPartitioner;
/**
 * Custom partitioner based on message field
 */
const CustomFieldPartitioner = (fieldPath) => {
    return ({ topic, partitionMetadata, message }) => {
        const numPartitions = partitionMetadata.length;
        try {
            const value = JSON.parse(message.value?.toString() || '{}');
            const fieldValue = getNestedField(value, fieldPath);
            if (fieldValue) {
                const hash = murmur2(String(fieldValue));
                return Math.abs(hash) % numPartitions;
            }
        }
        catch (error) {
            // Fall back to key-based partitioning
        }
        if (message.key) {
            const hash = murmur2(message.key.toString());
            return Math.abs(hash) % numPartitions;
        }
        return Math.floor(Math.random() * numPartitions);
    };
};
exports.CustomFieldPartitioner = CustomFieldPartitioner;
/**
 * Get nested field from object
 */
function getNestedField(obj, path) {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current === null || current === undefined) {
            return undefined;
        }
        current = current[part];
    }
    return current;
}
