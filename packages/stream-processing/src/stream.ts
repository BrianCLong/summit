import { EventEmitter } from 'eventemitter3';
import { Observable, Subject } from 'rxjs';
import { StreamMessage } from '@intelgraph/kafka-integration';
import pino from 'pino';
import {
  WindowSpec,
  StreamOperator,
  SideOutputTag,
  BackpressureStrategy,
  ProcessingContext,
} from './types';
import { WindowManager } from './window';
import { WatermarkGenerator } from './watermark';
import { StateManager } from './state';

const logger = pino({ name: 'data-stream' });

/**
 * Core data stream abstraction for stream processing
 */
export class DataStream<T = unknown> extends EventEmitter {
  private subject: Subject<StreamMessage<T>>;
  private watermarkGenerator: WatermarkGenerator;
  private stateManager: StateManager;
  private sideOutputs: Map<string, Subject<any>> = new Map();
  private backpressureThreshold: number = 10000;
  private currentQueueSize: number = 0;

  constructor(
    private name: string,
    private backpressureStrategy: BackpressureStrategy = BackpressureStrategy.BLOCK
  ) {
    super();
    this.subject = new Subject<StreamMessage<T>>();
    this.watermarkGenerator = new WatermarkGenerator();
    this.stateManager = new StateManager();
  }

  /**
   * Get observable stream
   */
  asObservable(): Observable<StreamMessage<T>> {
    return this.subject.asObservable();
  }

  /**
   * Emit event to stream
   */
  async emit(message: StreamMessage<T>): Promise<void> {
    // Check backpressure
    if (this.currentQueueSize >= this.backpressureThreshold) {
      await this.handleBackpressure(message);
    }

    this.currentQueueSize++;
    this.subject.next(message);

    // Update watermark
    const watermark = this.watermarkGenerator.generate(message.metadata.timestamp);
    this.emit('watermark', watermark);

    this.currentQueueSize--;
  }

  /**
   * Map transformation
   */
  map<R>(fn: (value: T, context: ProcessingContext) => R | Promise<R>): DataStream<R> {
    const outputStream = new DataStream<R>(`${this.name}-map`);

    this.subject.subscribe({
      next: async (message) => {
        try {
          const context: ProcessingContext = {
            timestamp: message.metadata.timestamp,
            watermark: this.watermarkGenerator.getCurrentWatermark(),
          };

          const result = await fn(message.payload, context);

          await outputStream.emit({
            ...message,
            payload: result,
          });
        } catch (error) {
          logger.error({ error }, 'Map operation failed');
          this.emit('error', error);
        }
      },
      error: (error) => outputStream.subject.error(error),
      complete: () => outputStream.subject.complete(),
    });

    return outputStream;
  }

  /**
   * Filter transformation
   */
  filter(
    predicate: (value: T, context: ProcessingContext) => boolean | Promise<boolean>
  ): DataStream<T> {
    const outputStream = new DataStream<T>(`${this.name}-filter`);

    this.subject.subscribe({
      next: async (message) => {
        try {
          const context: ProcessingContext = {
            timestamp: message.metadata.timestamp,
            watermark: this.watermarkGenerator.getCurrentWatermark(),
          };

          const shouldKeep = await predicate(message.payload, context);

          if (shouldKeep) {
            await outputStream.emit(message);
          }
        } catch (error) {
          logger.error({ error }, 'Filter operation failed');
          this.emit('error', error);
        }
      },
      error: (error) => outputStream.subject.error(error),
      complete: () => outputStream.subject.complete(),
    });

    return outputStream;
  }

  /**
   * FlatMap transformation
   */
  flatMap<R>(
    fn: (value: T, context: ProcessingContext) => R[] | Promise<R[]>
  ): DataStream<R> {
    const outputStream = new DataStream<R>(`${this.name}-flatMap`);

    this.subject.subscribe({
      next: async (message) => {
        try {
          const context: ProcessingContext = {
            timestamp: message.metadata.timestamp,
            watermark: this.watermarkGenerator.getCurrentWatermark(),
          };

          const results = await fn(message.payload, context);

          for (const result of results) {
            await outputStream.emit({
              ...message,
              payload: result,
            });
          }
        } catch (error) {
          logger.error({ error }, 'FlatMap operation failed');
          this.emit('error', error);
        }
      },
      error: (error) => outputStream.subject.error(error),
      complete: () => outputStream.subject.complete(),
    });

    return outputStream;
  }

  /**
   * Key by operation for partitioning
   */
  keyBy(keySelector: (value: T) => string): KeyedStream<T> {
    return new KeyedStream(this.name, keySelector, this);
  }

  /**
   * Window operation
   */
  window(windowSpec: WindowSpec): WindowedStream<T> {
    return new WindowedStream(this, windowSpec);
  }

  /**
   * Process with custom operator
   */
  process<R>(operator: StreamOperator<T, R>): DataStream<R> {
    const outputStream = new DataStream<R>(`${this.name}-${operator.name}`);

    this.subject.subscribe({
      next: async (message) => {
        try {
          const result = await operator.process(message.payload);

          if (Array.isArray(result)) {
            for (const item of result) {
              await outputStream.emit({
                ...message,
                payload: item,
              });
            }
          } else {
            await outputStream.emit({
              ...message,
              payload: result,
            });
          }
        } catch (error) {
          logger.error({ error, operator: operator.name }, 'Operator failed');
          this.emit('error', error);
        }
      },
      error: (error) => outputStream.subject.error(error),
      complete: () => outputStream.subject.complete(),
    });

    return outputStream;
  }

  /**
   * Side output for routing specific events
   */
  getSideOutput<S>(tag: SideOutputTag<S>): Observable<StreamMessage<S>> {
    if (!this.sideOutputs.has(tag.id)) {
      this.sideOutputs.set(tag.id, new Subject<StreamMessage<S>>());
    }
    return this.sideOutputs.get(tag.id)!.asObservable();
  }

  /**
   * Emit to side output
   */
  emitToSideOutput<S>(tag: SideOutputTag<S>, message: StreamMessage<S>): void {
    if (!this.sideOutputs.has(tag.id)) {
      this.sideOutputs.set(tag.id, new Subject<StreamMessage<S>>());
    }
    this.sideOutputs.get(tag.id)!.next(message);
  }

  /**
   * Union with another stream
   */
  union(other: DataStream<T>): DataStream<T> {
    const unionStream = new DataStream<T>(`${this.name}-union`);

    this.subject.subscribe({
      next: (message) => unionStream.emit(message),
      error: (error) => unionStream.subject.error(error),
    });

    other.subject.subscribe({
      next: (message) => unionStream.emit(message),
      error: (error) => unionStream.subject.error(error),
    });

    return unionStream;
  }

  /**
   * Handle backpressure
   */
  private async handleBackpressure(message: StreamMessage<T>): Promise<void> {
    switch (this.backpressureStrategy) {
      case BackpressureStrategy.BLOCK:
        // Wait until queue size drops
        while (this.currentQueueSize >= this.backpressureThreshold) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        break;

      case BackpressureStrategy.DROP_OLDEST:
        // Drop is handled by the Subject buffer
        logger.warn('Backpressure: dropping oldest message');
        break;

      case BackpressureStrategy.DROP_NEWEST:
        logger.warn('Backpressure: dropping new message');
        throw new Error('Backpressure: message dropped');

      case BackpressureStrategy.SAMPLE:
        // Sample every Nth message
        if (Math.random() > 0.1) {
          throw new Error('Backpressure: message sampled out');
        }
        break;
    }
  }

  /**
   * Complete the stream
   */
  complete(): void {
    this.subject.complete();
    this.sideOutputs.forEach((output) => output.complete());
  }
}

/**
 * Keyed stream for stateful operations
 */
export class KeyedStream<T = unknown> extends DataStream<T> {
  constructor(
    name: string,
    private keySelector: (value: T) => string,
    private sourceStream: DataStream<T>
  ) {
    super(`${name}-keyed`);

    // Subscribe to source and route by key
    sourceStream.asObservable().subscribe({
      next: (message) => this.emit(message),
      error: (error) => this.subject.error(error),
      complete: () => this.complete(),
    });
  }

  /**
   * Get key for value
   */
  getKey(value: T): string {
    return this.keySelector(value);
  }
}

/**
 * Windowed stream
 */
export class WindowedStream<T = unknown> {
  private windowManager: WindowManager<T>;

  constructor(
    private sourceStream: DataStream<T>,
    private windowSpec: WindowSpec
  ) {
    this.windowManager = new WindowManager<T>(windowSpec);

    // Subscribe to source stream
    sourceStream.asObservable().subscribe({
      next: (message) => {
        this.windowManager.addMessage(message);
      },
    });
  }

  /**
   * Get window manager
   */
  getWindowManager(): WindowManager<T> {
    return this.windowManager;
  }

  /**
   * Aggregate within windows
   */
  aggregate<A, R>(aggregateFunction: {
    createAccumulator: () => A;
    add: (value: T, accumulator: A) => A;
    getResult: (accumulator: A) => R;
  }): Observable<{ window: any; result: R }> {
    return this.windowManager.aggregate(aggregateFunction);
  }
}
