import pino from 'pino';
import { ConnectorContext } from '../data-model/types';

export abstract class BaseConnector {
  protected logger: pino.Logger;

  constructor(logger?: pino.Logger) {
    this.logger = logger || pino({ name: this.constructor.name });
  }

  protected async withResilience<T>(
    operation: () => Promise<T>,
    ctx: ConnectorContext,
    retries = 3
  ): Promise<T> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.logger.warn({ error, attempt: i + 1, pipeline: ctx.pipelineKey }, 'Connector operation failed, retrying');
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
      }
    }
    throw lastError;
  }
}
