import { Partitioner, PartitionerArgs } from 'kafkajs';
import * as crypto from 'crypto';

/**
 * Murmur2 hash function (Java compatible)
 */
function murmur2(key: string): number {
  const data = Buffer.from(key, 'utf-8');
  const length = data.length;
  const seed = 0x9747b28c;

  const m = 0x5bd1e995;
  const r = 24;

  let h = seed ^ length;
  let offset = 0;

  while (length >= 4) {
    let k =
      (data[offset] & 0xff) +
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
  private ring: Map<number, number> = new Map();
  private virtualNodes: number = 150;

  constructor(private partitions: number) {
    this.buildRing();
  }

  private buildRing(): void {
    for (let partition = 0; partition < this.partitions; partition++) {
      for (let i = 0; i < this.virtualNodes; i++) {
        const hash = murmur2(`${partition}-${i}`);
        this.ring.set(hash, partition);
      }
    }
  }

  getPartition(key: string): number {
    const hash = murmur2(key);
    const sortedHashes = Array.from(this.ring.keys()).sort((a, b) => a - b);

    // Find the first hash >= key hash
    for (const ringHash of sortedHashes) {
      if (ringHash >= hash) {
        return this.ring.get(ringHash)!;
      }
    }

    // Wrap around to first partition
    return this.ring.get(sortedHashes[0])!;
  }
}

/**
 * Murmur2 partitioner (Kafka default)
 */
export const Murmur2Partitioner = (): Partitioner => {
  return ({ topic, partitionMetadata, message }: PartitionerArgs) => {
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

/**
 * Consistent hash partitioner
 */
export const ConsistentHashPartitioner = (): Partitioner => {
  const rings = new Map<string, ConsistentHashRing>();

  return ({ topic, partitionMetadata, message }: PartitionerArgs) => {
    const numPartitions = partitionMetadata.length;

    if (!message.key) {
      return Math.floor(Math.random() * numPartitions);
    }

    // Get or create ring for topic
    if (!rings.has(topic)) {
      rings.set(topic, new ConsistentHashRing(numPartitions));
    }

    const ring = rings.get(topic)!;
    const key = message.key.toString();
    return ring.getPartition(key);
  };
};

/**
 * Custom partitioner based on message field
 */
export const CustomFieldPartitioner = (fieldPath: string): Partitioner => {
  return ({ topic, partitionMetadata, message }: PartitionerArgs) => {
    const numPartitions = partitionMetadata.length;

    try {
      const value = JSON.parse(message.value?.toString() || '{}');
      const fieldValue = getNestedField(value, fieldPath);

      if (fieldValue) {
        const hash = murmur2(String(fieldValue));
        return Math.abs(hash) % numPartitions;
      }
    } catch (error) {
      // Fall back to key-based partitioning
    }

    if (message.key) {
      const hash = murmur2(message.key.toString());
      return Math.abs(hash) % numPartitions;
    }

    return Math.floor(Math.random() * numPartitions);
  };
};

/**
 * Get nested field from object
 */
function getNestedField(obj: any, path: string): any {
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
