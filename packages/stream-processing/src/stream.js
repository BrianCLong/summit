"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowedStream = exports.KeyedStream = exports.DataStream = void 0;
const eventemitter3_1 = require("eventemitter3");
const rxjs_1 = require("rxjs");
const pino_1 = __importDefault(require("pino"));
const types_js_1 = require("./types.js");
const window_js_1 = require("./window.js");
const watermark_js_1 = require("./watermark.js");
const state_js_1 = require("./state.js");
const logger = (0, pino_1.default)({ name: 'data-stream' });
/**
 * Core data stream abstraction for stream processing
 */
class DataStream extends eventemitter3_1.EventEmitter {
    name;
    backpressureStrategy;
    subject;
    watermarkGenerator;
    stateManager;
    sideOutputs = new Map();
    backpressureThreshold = 10000;
    currentQueueSize = 0;
    constructor(name, backpressureStrategy = types_js_1.BackpressureStrategy.BLOCK) {
        super();
        this.name = name;
        this.backpressureStrategy = backpressureStrategy;
        this.subject = new rxjs_1.Subject();
        this.watermarkGenerator = new watermark_js_1.WatermarkGenerator();
        this.stateManager = new state_js_1.StateManager();
    }
    /**
     * Get observable stream
     */
    asObservable() {
        return this.subject.asObservable();
    }
    /**
     * Emit event to stream
     */
    async emit(message) {
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
    map(fn) {
        const outputStream = new DataStream(`${this.name}-map`);
        this.subject.subscribe({
            next: async (message) => {
                try {
                    const context = {
                        timestamp: message.metadata.timestamp,
                        watermark: this.watermarkGenerator.getCurrentWatermark(),
                    };
                    const result = await fn(message.payload, context);
                    await outputStream.emit({
                        ...message,
                        payload: result,
                    });
                }
                catch (error) {
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
    filter(predicate) {
        const outputStream = new DataStream(`${this.name}-filter`);
        this.subject.subscribe({
            next: async (message) => {
                try {
                    const context = {
                        timestamp: message.metadata.timestamp,
                        watermark: this.watermarkGenerator.getCurrentWatermark(),
                    };
                    const shouldKeep = await predicate(message.payload, context);
                    if (shouldKeep) {
                        await outputStream.emit(message);
                    }
                }
                catch (error) {
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
    flatMap(fn) {
        const outputStream = new DataStream(`${this.name}-flatMap`);
        this.subject.subscribe({
            next: async (message) => {
                try {
                    const context = {
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
                }
                catch (error) {
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
    keyBy(keySelector) {
        return new KeyedStream(this.name, keySelector, this);
    }
    /**
     * Window operation
     */
    window(windowSpec) {
        return new WindowedStream(this, windowSpec);
    }
    /**
     * Process with custom operator
     */
    process(operator) {
        const outputStream = new DataStream(`${this.name}-${operator.name}`);
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
                    }
                    else {
                        await outputStream.emit({
                            ...message,
                            payload: result,
                        });
                    }
                }
                catch (error) {
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
    getSideOutput(tag) {
        if (!this.sideOutputs.has(tag.id)) {
            this.sideOutputs.set(tag.id, new rxjs_1.Subject());
        }
        return this.sideOutputs.get(tag.id).asObservable();
    }
    /**
     * Emit to side output
     */
    emitToSideOutput(tag, message) {
        if (!this.sideOutputs.has(tag.id)) {
            this.sideOutputs.set(tag.id, new rxjs_1.Subject());
        }
        this.sideOutputs.get(tag.id).next(message);
    }
    /**
     * Union with another stream
     */
    union(other) {
        const unionStream = new DataStream(`${this.name}-union`);
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
    async handleBackpressure(message) {
        switch (this.backpressureStrategy) {
            case types_js_1.BackpressureStrategy.BLOCK:
                // Wait until queue size drops
                while (this.currentQueueSize >= this.backpressureThreshold) {
                    await new Promise((resolve) => setTimeout(resolve, 10));
                }
                break;
            case types_js_1.BackpressureStrategy.DROP_OLDEST:
                // Drop is handled by the Subject buffer
                logger.warn('Backpressure: dropping oldest message');
                break;
            case types_js_1.BackpressureStrategy.DROP_NEWEST:
                logger.warn('Backpressure: dropping new message');
                throw new Error('Backpressure: message dropped');
            case types_js_1.BackpressureStrategy.SAMPLE:
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
    complete() {
        this.subject.complete();
        this.sideOutputs.forEach((output) => output.complete());
    }
}
exports.DataStream = DataStream;
/**
 * Keyed stream for stateful operations
 */
class KeyedStream extends DataStream {
    keySelector;
    sourceStream;
    constructor(name, keySelector, sourceStream) {
        super(`${name}-keyed`);
        this.keySelector = keySelector;
        this.sourceStream = sourceStream;
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
    getKey(value) {
        return this.keySelector(value);
    }
}
exports.KeyedStream = KeyedStream;
/**
 * Windowed stream
 */
class WindowedStream {
    sourceStream;
    windowSpec;
    windowManager;
    constructor(sourceStream, windowSpec) {
        this.sourceStream = sourceStream;
        this.windowSpec = windowSpec;
        this.windowManager = new window_js_1.WindowManager(windowSpec);
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
    getWindowManager() {
        return this.windowManager;
    }
    /**
     * Aggregate within windows
     */
    aggregate(aggregateFunction) {
        return this.windowManager.aggregate(aggregateFunction);
    }
}
exports.WindowedStream = WindowedStream;
