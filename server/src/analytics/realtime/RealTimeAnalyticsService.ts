import { KafkaConsumerWrapper } from '../../streaming/KafkaConsumer.ts';
import { Logger } from '../../streaming/Logger.ts';

export class RealTimeAnalyticsService {
  private consumer: KafkaConsumerWrapper;
  private logger = new Logger('RealTimeAnalyticsService');
  private metrics: Map<string, any> = new Map();

  constructor(consumer: KafkaConsumerWrapper) {
    this.consumer = consumer;
  }

  async start(): Promise<void> {
    this.logger.info('Starting RealTimeAnalyticsService');
    await this.consumer.run(async (message: any) => {
      this.updateMetrics(message);
    });
  }

  private updateMetrics(event: any): void {
    if (event.type === 'AGGREGATION_UPDATE') {
      this.metrics.set(event.entityId, {
        count: event.count,
        lastUpdated: event.timestamp,
      });
      this.logger.info(`Updated metric for ${event.entityId}: ${event.count}`);
    }
  }

  getMetric(entityId: string): any {
    return this.metrics.get(entityId);
  }

  getAllMetrics(): any {
    return Object.fromEntries(this.metrics);
  }
}
