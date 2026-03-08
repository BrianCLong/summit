"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const backpressure_1 = require("../../../src/lib/streaming/backpressure");
const v8_1 = __importDefault(require("v8"));
globals_1.jest.mock('v8');
(0, globals_1.describe)('BackpressureStream', () => {
    (0, globals_1.afterEach)(() => {
        globals_1.jest.restoreAllMocks();
        globals_1.jest.useRealTimers();
    });
    (0, globals_1.it)('should apply backpressure when high watermark is reached', () => {
        const stream = new backpressure_1.BackpressureStream({ highWatermark: 1 });
        stream.write(1);
        const canWrite = stream.write(2);
        (0, globals_1.expect)(canWrite).toBe(false);
        (0, globals_1.expect)(stream.writableNeedDrain).toBe(true);
        stream.end();
    });
    (0, globals_1.it)('should slow down when memory pressure is high', (done) => {
        globals_1.jest.useFakeTimers();
        v8_1.default.getHeapStatistics.mockReturnValue({
            heap_size_limit: 100,
            total_heap_size: 90,
        });
        const stream = new backpressure_1.BackpressureStream({ delayMs: 100 });
        let chunksProcessed = 0;
        stream.on('data', () => {
            chunksProcessed++;
        });
        stream.on('finish', () => {
            (0, globals_1.expect)(chunksProcessed).toBe(5);
            done();
        });
        for (let i = 0; i < 5; i++) {
            stream.write(i);
        }
        stream.end();
        globals_1.jest.advanceTimersByTime(500);
    });
});
