"use strict";
/**
 * StreamProcessor - Real-time event stream processing
 *
 * Process event streams with transformations, filtering, and aggregation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineBuilder = exports.StreamProcessor = void 0;
const events_1 = require("events");
const pino_1 = __importDefault(require("pino"));
class StreamProcessor extends events_1.EventEmitter {
    eventBus;
    logger;
    pipelines = new Map();
    running = new Set();
    constructor(eventBus) {
        super();
        this.eventBus = eventBus;
        this.logger = (0, pino_1.default)({ name: 'StreamProcessor' });
    }
    /**
     * Define a stream processing pipeline
     */
    definePipeline(pipeline) {
        this.pipelines.set(pipeline.name, pipeline);
        this.logger.info({ name: pipeline.name, operators: pipeline.operators.length }, 'Pipeline defined');
    }
    /**
     * Start processing pipeline
     */
    async start(pipelineName) {
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
    async stop(pipelineName) {
        this.running.delete(pipelineName);
        this.logger.info({ pipelineName }, 'Pipeline stopped');
        this.emit('pipeline:stopped', pipelineName);
    }
    /**
     * Process event through pipeline
     */
    async processEvent(pipeline, message) {
        try {
            let events = {
                key: message.metadata.messageId,
                value: message.payload,
                timestamp: message.metadata.timestamp
            };
            // Apply operators sequentially
            for (const operator of pipeline.operators) {
                if (Array.isArray(events)) {
                    // Process multiple events
                    const results = [];
                    for (const event of events) {
                        const result = await operator(event);
                        if (result) {
                            if (Array.isArray(result)) {
                                results.push(...result);
                            }
                            else {
                                results.push(result);
                            }
                        }
                    }
                    events = results;
                }
                else {
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
        }
        catch (err) {
            this.logger.error({ err, pipeline: pipeline.name }, 'Event processing error');
            this.emit('event:error', {
                pipeline: pipeline.name,
                error: err
            });
        }
    }
    /**
     * Create pipeline builder for fluent API
     */
    static builder(name, input) {
        return new PipelineBuilder(name, input);
    }
}
exports.StreamProcessor = StreamProcessor;
/**
 * Fluent API for building pipelines
 */
class PipelineBuilder {
    name;
    input;
    output;
    operators = [];
    constructor(name, input) {
        this.name = name;
        this.input = input;
    }
    /**
     * Add a map operator
     */
    map(mapper) {
        this.operators.push(async (event) => ({
            ...event,
            value: await mapper(event.value)
        }));
        return this;
    }
    /**
     * Add a filter operator
     */
    filter(predicate) {
        this.operators.push(async (event) => {
            const matches = await predicate(event.value);
            return matches ? event : null;
        });
        return this;
    }
    /**
     * Add a flatMap operator
     */
    flatMap(mapper) {
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
    to(topic) {
        this.output = topic;
        return this;
    }
    /**
     * Build the pipeline
     */
    build() {
        return {
            name: this.name,
            input: this.input,
            output: this.output,
            operators: this.operators
        };
    }
}
exports.PipelineBuilder = PipelineBuilder;
