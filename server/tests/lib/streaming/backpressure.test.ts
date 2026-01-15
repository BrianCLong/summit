import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { BackpressureStream } from '../../../src/lib/streaming/backpressure';
import v8 from 'v8';

jest.mock('v8');

describe('BackpressureStream', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should apply backpressure when high watermark is reached', () => {
    const stream = new BackpressureStream<number>({ highWatermark: 1 });
    stream.write(1);
    const canWrite = stream.write(2);

    expect(canWrite).toBe(false);
    expect(stream.writableNeedDrain).toBe(true);
    stream.end();
  });

  it('should slow down when memory pressure is high', (done) => {
    jest.useFakeTimers();

    (v8.getHeapStatistics as jest.Mock).mockReturnValue({
      heap_size_limit: 100,
      total_heap_size: 90,
    });

    const stream = new BackpressureStream<number>({ delayMs: 100 });
    let chunksProcessed = 0;

    stream.on('data', () => {
      chunksProcessed++;
    });

    stream.on('finish', () => {
      expect(chunksProcessed).toBe(5);
      done();
    });

    for (let i = 0; i < 5; i++) {
      stream.write(i);
    }
    stream.end();

    jest.advanceTimersByTime(500);
  });
});
