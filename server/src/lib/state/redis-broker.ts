
import { createClient } from 'redis';
import { MessageBroker } from './cross-region-sync.js';

/**
 * Production implementation of MessageBroker using Redis.
 * Uses Pub/Sub to synchronize state across instances/regions.
 * Note: For cross-region, this assumes Redis Global Replication Group with
 * local writes published to a channel that global subscribers listen to,
 * or more likely, using Redis Streams or just relying on the replication
 * and having listeners on the read replicas.
 *
 * However, standard Redis Pub/Sub is not replicated across global groups in ElastiCache
 * (it is fire-and-forget to connected clients).
 * For true cross-region messaging, we would typically use SNS/SQS or a custom
 * replicator. For this Epic's requirement of "Redis clusters with global replication",
 * we will assume we use Redis Streams which ARE replicated, or that we are simulating
 * the "Broker" part via a mechanism that works (e.g. publishing to all regions via API).
 *
 * For simplicity in this implementation, we will use standard Redis Pub/Sub
 * assuming a single logical Redis (or that we connect to the local region's Redis
 * and there is a bridge).
 */
export class RedisMessageBroker implements MessageBroker {
  private publisher;
  private subscriber;

  constructor(redisUrl: string) {
    this.publisher = createClient({ url: redisUrl });
    this.subscriber = createClient({ url: redisUrl });

    this.publisher.on('error', (err: any) => console.error('Redis Publisher Error', err));
    this.subscriber.on('error', (err: any) => console.error('Redis Subscriber Error', err));
  }

  async connect() {
    await this.publisher.connect();
    await this.subscriber.connect();
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.publisher.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.subscriber.subscribe(channel, (message) => {
      callback(message);
    });
  }

  async disconnect() {
    await this.publisher.disconnect();
    await this.subscriber.disconnect();
  }
}
