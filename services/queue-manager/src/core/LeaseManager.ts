import IORedis from 'ioredis';
import { randomUUID } from 'crypto';
import { LeaseAcquisitionError, LeaseExpiredError } from './errors.js';
import { Logger } from '../utils/logger.js';

export interface LeaseHandle {
  key: string;
  ownerId: string;
  ttlMs: number;
}

export interface LeaseRenewal {
  stop: () => Promise<void>;
  hasLostLease: () => boolean;
}

export class LeaseManager {
  private logger: Logger;

  constructor(private readonly redis: IORedis, logger: Logger = new Logger('LeaseManager')) {
    this.logger = logger;
  }

  async acquire(jobId: string | number, queueName: string, ttlMs: number): Promise<LeaseHandle> {
    const key = this.buildKey(queueName, jobId);
    const ownerId = randomUUID();
    const result = await this.redis.set(key, ownerId, 'PX', ttlMs, 'NX');

    if (result !== 'OK') {
      throw new LeaseAcquisitionError(key);
    }

    this.logger.debug('lease acquired', { key, ownerId, ttlMs });
    return { key, ownerId, ttlMs };
  }

  async renew(lease: LeaseHandle): Promise<boolean> {
    const result = await this.redis.set(lease.key, lease.ownerId, 'PX', lease.ttlMs, 'XX');
    return result === 'OK';
  }

  async release(lease: LeaseHandle): Promise<void> {
    const script = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      end
      return 0
    `;

    await this.redis.eval(script, 1, lease.key, lease.ownerId);
  }

  startRenewal(lease: LeaseHandle, intervalMs: number): LeaseRenewal {
    let stopped = false;
    let lostLease = false;

    const timer = setInterval(async () => {
      if (stopped) return;

      try {
        const ok = await this.renew(lease);
        if (!ok) {
          lostLease = true;
          this.logger.warn('lease renewal failed', { key: lease.key });
        }
      } catch (error) {
        lostLease = true;
        this.logger.error('lease renewal error', error);
      }
    }, intervalMs);

    return {
      stop: async () => {
        stopped = true;
        clearInterval(timer);
        if (lostLease) {
          throw new LeaseExpiredError(lease.key);
        }
      },
      hasLostLease: () => lostLease,
    };
  }

  private buildKey(queueName: string, jobId: string | number): string {
    return `lease:${queueName}:${jobId}`;
  }
}
