"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackpressureStream = void 0;
const stream_1 = require("stream");
const v8_1 = __importDefault(require("v8"));
class BackpressureStream extends stream_1.Transform {
    memoryThreshold;
    delayMs;
    constructor(options = {}) {
        super({
            objectMode: true,
            highWaterMark: options.highWatermark ?? 100,
        });
        this.memoryThreshold = options.memoryThreshold ?? 0.8; // Default to 80% heap usage
        this.delayMs = options.delayMs ?? 100; // Default to 100ms
    }
    isUnderPressure() {
        const stats = v8_1.default.getHeapStatistics?.();
        if (!stats) {
            return false;
        }
        const { heap_size_limit, total_heap_size } = stats;
        const usage = total_heap_size / heap_size_limit;
        return usage > this.memoryThreshold;
    }
    _transform(chunk, encoding, callback) {
        if (this.isUnderPressure()) {
            // If memory is high, slow down the stream by introducing a delay.
            // This will cause the internal buffer to fill up and signal
            // backpressure to the producer.
            setTimeout(() => {
                this.push(chunk);
                callback();
            }, this.delayMs);
        }
        else {
            this.push(chunk);
            callback();
        }
    }
}
exports.BackpressureStream = BackpressureStream;
