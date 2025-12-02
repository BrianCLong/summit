
import { Redis } from 'ioredis';
import { cfg } from '../../config.js';
import { ConsistencyReport } from './GraphConsistencyService.js';
import logger from '../../config/logger.js';

export class ConsistencyStore {
  private redis: Redis;
  private logger = logger.child({ name: 'ConsistencyStore' });
  private KEY_PREFIX = 'consistency:reports';

  constructor() {
    this.redis = new Redis({
      host: cfg.REDIS_HOST,
      port: cfg.REDIS_PORT,
      password: cfg.REDIS_PASSWORD,
      tls: cfg.REDIS_TLS ? {} : undefined,
    });
  }

  async saveReports(reports: ConsistencyReport[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    // Clear old reports
    pipeline.del(this.KEY_PREFIX);

    if (reports.length > 0) {
      // Store new reports
      const value = JSON.stringify(reports);
      pipeline.set(this.KEY_PREFIX, value);
    }

    await pipeline.exec();
    this.logger.info(`Saved ${reports.length} consistency reports to cache`);
  }

  async getReports(): Promise<ConsistencyReport[]> {
    const data = await this.redis.get(this.KEY_PREFIX);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (err) {
      this.logger.error(err, 'Failed to parse consistency reports from cache');
      return [];
    }
  }
}
