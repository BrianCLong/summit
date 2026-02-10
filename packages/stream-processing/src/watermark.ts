import { EventEmitter } from 'eventemitter3';
import pino from 'pino';
import { Watermark } from './types';

const logger = pino({ name: 'watermark-generator' });

/**
 * Watermark generator for handling late data
 */
export class WatermarkGenerator extends EventEmitter {
  private currentWatermark: number = 0;
  private maxOutOfOrderness: number = 5000; // 5 seconds default
  private lastEventTime: number = 0;

  constructor(maxOutOfOrderness?: number) {
    super();
    if (maxOutOfOrderness !== undefined) {
      this.maxOutOfOrderness = maxOutOfOrderness;
    }
  }

  /**
   * Generate watermark based on event time
   */
  generate(eventTime: number): Watermark {
    // Update last event time
    if (eventTime > this.lastEventTime) {
      this.lastEventTime = eventTime;
    }

    // Calculate watermark (event time - max out of orderness)
    const newWatermark = this.lastEventTime - this.maxOutOfOrderness;

    // Only advance watermark (never go backwards)
    if (newWatermark > this.currentWatermark) {
      this.currentWatermark = newWatermark;
      const watermark: Watermark = {
        timestamp: this.currentWatermark,
        maxOutOfOrderness: this.maxOutOfOrderness,
      };

      this.emit('watermark', watermark);
      logger.debug({ watermark: this.currentWatermark }, 'Watermark advanced');

      return watermark;
    }

    return {
      timestamp: this.currentWatermark,
      maxOutOfOrderness: this.maxOutOfOrderness,
    };
  }

  /**
   * Get current watermark
   */
  getCurrentWatermark(): number {
    return this.currentWatermark;
  }

  /**
   * Check if event is late
   */
  isLate(eventTime: number): boolean {
    return eventTime < this.currentWatermark;
  }

  /**
   * Set max out of orderness
   */
  setMaxOutOfOrderness(maxOutOfOrderness: number): void {
    this.maxOutOfOrderness = maxOutOfOrderness;
  }

  /**
   * Reset watermark
   */
  reset(): void {
    this.currentWatermark = 0;
    this.lastEventTime = 0;
    logger.info('Watermark reset');
  }
}

/**
 * Periodic watermark generator
 */
export class PeriodicWatermarkGenerator extends WatermarkGenerator {
  private interval: NodeJS.Timeout | null = null;

  constructor(
    private periodMs: number = 1000,
    maxOutOfOrderness?: number
  ) {
    super(maxOutOfOrderness);
  }

  /**
   * Start periodic watermark generation
   */
  start(): void {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => {
      const now = Date.now();
      this.generate(now);
    }, this.periodMs);

    logger.info({ periodMs: this.periodMs }, 'Periodic watermark generation started');
  }

  /**
   * Stop periodic watermark generation
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('Periodic watermark generation stopped');
    }
  }
}

/**
 * Punctuated watermark generator
 */
export class PunctuatedWatermarkGenerator extends WatermarkGenerator {
  constructor(
    private extractWatermark: (eventTime: number) => number | null,
    maxOutOfOrderness?: number
  ) {
    super(maxOutOfOrderness);
  }

  /**
   * Generate watermark with custom extraction logic
   */
  generate(eventTime: number): Watermark {
    const watermarkTime = this.extractWatermark(eventTime);

    if (watermarkTime !== null) {
      return super.generate(watermarkTime);
    }

    return {
      timestamp: this.getCurrentWatermark(),
      maxOutOfOrderness: this.maxOutOfOrderness,
    };
  }
}
