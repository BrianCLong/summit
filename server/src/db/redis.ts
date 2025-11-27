import { getRedisClient as getBaseRedisClient, closeRedisClient } from '@intelgraph/redis';
import { telemetry } from '../lib/telemetry/comprehensive-telemetry';
import Redis from 'ioredis';

let instrumentedRedisClient: Redis;

export function getRedisClient(): Redis {
  if (!instrumentedRedisClient) {
    const baseClient = getBaseRedisClient();

    // Instrument the client with telemetry
    const originalGet = baseClient.get.bind(baseClient);
    baseClient.get = async (key: string) => {
      const value = await originalGet(key);
      if (value) {
        telemetry.subsystems.cache.hits.add(1);
      } else {
        telemetry.subsystems.cache.misses.add(1);
      }
      return value;
    };

    const originalSet = baseClient.set.bind(baseClient);
    baseClient.set = async (key: string, value: string, ...args: any[]) => {
      telemetry.subsystems.cache.sets.add(1);
      return await originalSet(key, value, ...args);
    };

    const originalDel = baseClient.del.bind(baseClient);
    baseClient.del = async (...keys: string[]) => {
      telemetry.subsystems.cache.dels.add(keys.length);
      return await originalDel(...keys);
    };

    instrumentedRedisClient = baseClient;
  }
  return instrumentedRedisClient;
}

export { closeRedisClient };
