/**
 * Base sensor implementation for condition-based task triggering
 */

import { Sensor, ExecutionContext } from '@summit/dag-engine';

export interface SensorConfig {
  pokeInterval?: number;
  timeout?: number;
  mode?: 'poke' | 'reschedule';
  softFail?: boolean;
  exponentialBackoff?: boolean;
}

export abstract class BaseSensor implements Sensor {
  protected config: SensorConfig;

  constructor(config: SensorConfig = {}) {
    this.config = {
      pokeInterval: config.pokeInterval || 60000, // 1 minute
      timeout: config.timeout || 86400000, // 24 hours
      mode: config.mode || 'poke',
      softFail: config.softFail || false,
      exponentialBackoff: config.exponentialBackoff || false,
    };
  }

  /**
   * Execute sensor - wait until condition is met
   */
  async execute(context: ExecutionContext): Promise<any> {
    const startTime = Date.now();
    let attempt = 0;

    while (true) {
      attempt++;
      const elapsed = Date.now() - startTime;

      // Check timeout
      if (this.config.timeout && elapsed >= this.config.timeout) {
        if (this.config.softFail) {
          return { success: false, timeout: true };
        }
        throw new Error(`Sensor timeout after ${elapsed}ms`);
      }

      // Poke (check condition)
      const result = await this.poke(context);

      if (result) {
        return { success: true, attempts: attempt, elapsed };
      }

      // Wait before next poke
      const interval = this.calculateInterval(attempt);
      await this.sleep(interval);
    }
  }

  /**
   * Abstract poke method - must be implemented by subclasses
   */
  abstract poke(context: ExecutionContext): Promise<boolean>;

  /**
   * Calculate poke interval with optional exponential backoff
   */
  private calculateInterval(attempt: number): number {
    if (!this.config.exponentialBackoff) {
      return this.config.pokeInterval!;
    }

    const base = this.config.pokeInterval!;
    const interval = base * Math.pow(2, attempt - 1);
    const maxInterval = base * 60; // Max 60x base interval
    return Math.min(interval, maxInterval);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Optional success callback
   */
  async onSuccess?(context: ExecutionContext, output: any): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Optional failure callback
   */
  async onFailure?(context: ExecutionContext, error: Error): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Optional retry callback
   */
  async onRetry?(context: ExecutionContext, error: Error, attempt: number): Promise<void> {
    // Override in subclass if needed
  }
}

/**
 * File sensor - wait for file to exist
 */
export class FileSensor extends BaseSensor {
  private filePath: string;

  constructor(filePath: string, config?: SensorConfig) {
    super(config);
    this.filePath = filePath;
  }

  async poke(context: ExecutionContext): Promise<boolean> {
    const fs = await import('fs/promises');
    try {
      await fs.access(this.filePath);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * HTTP sensor - wait for HTTP endpoint to return success
 */
export class HttpSensor extends BaseSensor {
  private url: string;
  private method: string;
  private expectedStatus: number;

  constructor(
    url: string,
    options: { method?: string; expectedStatus?: number } & SensorConfig = {}
  ) {
    super(options);
    this.url = url;
    this.method = options.method || 'GET';
    this.expectedStatus = options.expectedStatus || 200;
  }

  async poke(context: ExecutionContext): Promise<boolean> {
    try {
      const response = await fetch(this.url, { method: this.method });
      return response.status === this.expectedStatus;
    } catch {
      return false;
    }
  }
}

/**
 * Time sensor - wait until specific time
 */
export class TimeSensor extends BaseSensor {
  private targetTime: Date;

  constructor(targetTime: Date, config?: SensorConfig) {
    super(config);
    this.targetTime = targetTime;
  }

  async poke(context: ExecutionContext): Promise<boolean> {
    return Date.now() >= this.targetTime.getTime();
  }
}

/**
 * External task sensor - wait for external task completion
 */
export class ExternalTaskSensor extends BaseSensor {
  private checkFunction: (context: ExecutionContext) => Promise<boolean>;

  constructor(
    checkFunction: (context: ExecutionContext) => Promise<boolean>,
    config?: SensorConfig
  ) {
    super(config);
    this.checkFunction = checkFunction;
  }

  async poke(context: ExecutionContext): Promise<boolean> {
    return this.checkFunction(context);
  }
}
