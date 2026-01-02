import { KafkaProducerWrapper } from '../KafkaProducer.js';
import { EventFactory } from '../EventFactory.js';
import { Logger } from '../Logger.js';

export class MockCDCService {
  private producer: KafkaProducerWrapper;
  private logger = new Logger('MockCDCService');
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(producer: KafkaProducerWrapper) {
    this.producer = producer;
  }

  async start(intervalMs: number = 5000): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.logger.info('Starting Mock CDC Service');

    this.intervalId = setInterval(async () => {
      await this.simulateChange();
    }, intervalMs);
  }

  async stop(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.logger.info('Stopped Mock CDC Service');
  }

  private async simulateChange(): Promise<void> {
    const eventType = Math.random() > 0.5 ? 'INSERT' : 'UPDATE';
    const entityId = Math.floor(Math.random() * 1000).toString();
    const table = 'users';

    const payload = {
      before: eventType === 'UPDATE' ? { id: entityId, name: 'Old Name' } : null,
      after: { id: entityId, name: `User ${entityId}`, updatedAt: new Date().toISOString() },
      op: eventType === 'INSERT' ? 'c' : 'u',
      ts_ms: Date.now(),
    };

    const event = EventFactory.createEvent(
      `db.${table}.${eventType.toLowerCase()}`,
      'postgres-connector',
      payload,
      entityId
    );

    try {
      await this.producer.send(`cdc.${table}`, [event]);
      this.logger.info(`Simulated CDC event for ${table}: ${eventType} ${entityId}`);
    } catch (error: any) {
      this.logger.error('Failed to send simulated CDC event', error);
    }
  }
}
