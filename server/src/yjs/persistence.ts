import { Redis } from 'ioredis';
import * as Y from 'yjs';

export class RedisPersistence {
  private redis: Redis;
  private prefix: string;

  constructor(redis: Redis, prefix: string = 'yjs:doc:') {
    this.redis = redis;
    this.prefix = prefix;
  }

  async bindState(docName: string, ydoc: Y.Doc) {
    // Load initial state
    const updates = await this.redis.lrange(`${this.prefix}${docName}`, 0, -1);
    if (updates.length > 0) {
      Y.transact(ydoc, () => {
        updates.forEach((update) => {
          Y.applyUpdate(ydoc, Buffer.from(update, 'base64'));
        });
      }, 'persistence');
    }

    // Subscribe to future updates from this instance (to save them)
    // In a real clustered setup, we might also want to subscribe to Redis PubSub to sync across nodes.
    // For now, we focus on persistence.
    ydoc.on('update', async (update: Uint8Array, origin: any) => {
      // If the update comes from persistence, don't save it back
      if (origin === 'persistence') return;

      // Store the update
      await this.redis.rpush(
        `${this.prefix}${docName}`,
        Buffer.from(update).toString('base64')
      );
    });
  }

  async clearDocument(docName: string) {
    await this.redis.del(`${this.prefix}${docName}`);
  }
}
