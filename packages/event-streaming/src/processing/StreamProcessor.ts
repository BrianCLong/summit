/**
 * StreamProcessor - Real-time event stream processing
 *
 * Process event streams with transformations, filtering, and aggregation
 */

import { EventEmitter } from 'events';
import { EventBus, Message } from '@intelgraph/event-bus';
import pino from 'pino';

export interface StreamEvent<T = any> {
  key: string;
  value: T;
  timestamp: Date;
  partition?: number;
  offset?: number;
}

export type StreamOperator<TIn = any, TOut = any> = (
  event: StreamEvent<TIn>
) => Promise<StreamEvent<TOut> | StreamEvent<TOut>[] | null>;

export interface StreamPipeline<TIn = any, TOut = any> {
  name: string;
  operators: StreamOperator<any, any>[];
  input: string;
  output?: string;
}

export class StreamProcessor extends EventEmitter {
  private eventBus: EventBus;
  private logger: pino.Logger;
  private pipelines: Map<string, StreamPipeline> = new Map();
  private running: Set<string> = new Set();

  constructor(eventBus: EventBus) {
    super();
    this.eventBus = eventBus;
    this.logger = pino({ name: 'StreamProcessor' });
  }

  /**
   * Define a stream processing pipeline
   */
  definePipeline<TIn = any, TOut = any>(
    pipeline: StreamPipeline<TIn, TOut>
  ): void {
    this.pipelines.set(pipeline.name, pipeline);

    this.logger.info(
      { name: pipeline.name, operators: pipeline.operators.length },
      'Pipeline defined'
    );
  }

  /**
   * Start processing pipeline
   */
  async start(pipelineName: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineName);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineName}`);
    }

    if (this.running.has(pipelineName)) {
      this.logger.warn({ pipelineName }, 'Pipeline already running');
      return;
    }

    this.running.add(pipelineName);

    // Subscribe to input topic
    await this.eventBus.subscribe(pipeline.input, async (message) => {
      await this.processEvent(pipeline, message);
    });

    this.logger.info({ pipelineName }, 'Pipeline started');
    this.emit('pipeline:started', pipelineName);
  }

  /**
   * Stop processing pipeline
   */
  async stop(pipelineName: string): Promise<void> {
    this.running.delete(pipelineName);

    this.logger.info({ pipelineName }, 'Pipeline stopped');
    this.emit('pipeline:stopped', pipelineName);
  }

  /**
   * Process event through pipeline
   */
  private async processEvent(
    pipeline: StreamPipeline,
    message: Message
  ): Promise<void> {
    try {
      let events: StreamEvent | StreamEvent[] = {
        key: message.metadata.messageId,
        value: message.payload,
        timestamp: message.metadata.timestamp
      };

      // Apply operators sequentially
      for (const operator of pipeline.operators) {
        if (Array.isArray(events)) {
          // Process multiple events
          const results: StreamEvent[] = [];

          for (const event of events) {
            const result = await operator(event);

            if (result) {
              if (Array.isArray(result)) {
                results.push(...result);
              } else {
                results.push(result);
              }
            }
          }

          events = results;
        } else {
          // Process single event
          const result = await operator(events);

          if (!result) {
            // Event filtered out
            return;
          }

          events = result;
        }
      }

      // Emit to output topic
      if (pipeline.output) {
        const outputEvents = Array.isArray(events) ? events : [events];

        for (const event of outputEvents) {
          await this.eventBus.publish(pipeline.output, event.value, {
            persistent: true
          });
        }
      }

      this.emit('event:processed', {
        pipeline: pipeline.name,
        count: Array.isArray(events) ? events.length : 1
      });
    } catch (err) {
      this.logger.error(
        { err, pipeline: pipeline.name },
        'Event processing error'
      );

      this.emit('event:error', {
        pipeline: pipeline.name,
        error: err
      });
    }
  }

  /**
   * Create pipeline builder for fluent API
   */
  static builder(name: string, input: string): PipelineBuilder {
    return new PipelineBuilder(name, input);
  }
}

/**
 * Fluent API for building pipelines
 */
export class PipelineBuilder {
  private name: string;
  private input: string;
  private output?: string;
  private operators: StreamOperator[] = [];

  constructor(name: string, input: string) {
    this.name = name;
    this.input = input;
  }

  /**
   * Add a map operator
   */
  map<TIn = any, TOut = any>(
    mapper: (value: TIn) => TOut | Promise<TOut>
  ): this {
    this.operators.push(async (event) => ({
      ...event,
      value: await mapper(event.value)
    }));
    return this;
  }

  /**
   * Add a filter operator
   */
  filter<T = any>(
    predicate: (value: T) => boolean | Promise<boolean>
  ): this {
    this.operators.push(async (event) => {
      const matches = await predicate(event.value);
      return matches ? event : null;
    });
    return this;
  }

  /**
   * Add a flatMap operator
   */
  flatMap<TIn = any, TOut = any>(
    mapper: (value: TIn) => TOut[] | Promise<TOut[]>
  ): this {
    this.operators.push(async (event) => {
      const values = await mapper(event.value);
      return values.map(value => ({
        ...event,
        value
      }));
    });
    return this;
  }

  /**
   * Set output topic
   */
  to(topic: string): this {
    this.output = topic;
    return this;
  }

  /**
   * Build the pipeline
   */
  build(): StreamPipeline {
    return {
      name: this.name,
      input: this.input,
      output: this.output,
      operators: this.operators
    };
  }
}
