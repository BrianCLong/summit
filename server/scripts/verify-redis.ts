
import { RedisService } from '../src/cache/redis.js';
import config from '../src/config/index.js';

async function verify() {
  console.log('Starting Redis Verification...');
  console.log('Config:', JSON.stringify(config.redis, null, 2));

  try {
    const redis = RedisService.getInstance();

    // Ping test
    console.log('Pinging Redis...');
    const pong = await redis.ping();
    console.log('Ping result:', pong);
    if (pong !== 'PONG') throw new Error('Ping failed');

    // Write test
    const testKey = 'verify:test:' + Date.now();
    console.log(`Writing key ${testKey}...`);
    await redis.set(testKey, 'verification_value', 60);

    // Read test
    console.log(`Reading key ${testKey}...`);
    const val = await redis.get(testKey);
    console.log('Read result:', val);
    if (val !== 'verification_value') throw new Error('Read failed or value mismatch');

    // Clean up
    await redis.del(testKey);

    // Cluster check
    if (config.redis.useCluster) {
        console.log('Verifying Cluster Mode...');
        const client = redis.getClient();
        if (client.constructor.name !== 'Cluster') {
            throw new Error('Configured for cluster but client is not Cluster instance');
        }
        // @ts-ignore
        const nodes = client.nodes();
        console.log(`Cluster has ${nodes.length} nodes known to client.`);
    }

    console.log('✅ Redis Verification Successful');
    process.exit(0);
  } catch (error) {
    console.error('❌ Redis Verification Failed:', error);
    process.exit(1);
  }
}

verify();
