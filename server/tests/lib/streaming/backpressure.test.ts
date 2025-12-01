
import { BackpressureStream } from '../../../src/lib/streaming/backpressure';
import { Readable } from 'stream';
import v8 from 'v8';

jest.mock('v8');

describe('BackpressureStream', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should apply backpressure when high watermark is reached', (done) => {
    const highWatermark = 5;
    const stream = new BackpressureStream<number>({ highWatermark });
    let isPaused = false;
    let counter = 0;

    // A slow consumer
    stream.on('data', () => {
      // Do nothing, let the buffer fill up
    });

    // A fast producer
    const write = () => {
      while (counter < highWatermark * 2) {
        counter++;
        const canWrite = stream.write(counter);
        if (!canWrite) {
          isPaused = true;
          stream.once('drain', () => {
            isPaused = false;
            write();
          });
          return;
        }
      }
      stream.end();
    };

    stream.on('finish', () => {
        expect(isPaused).toBe(true);
        done();
    });

    write();
  });

  it('should slow down when memory pressure is high', (done) => {
    jest.useFakeTimers();

    (v8.getHeapStatistics as jest.Mock).mockReturnValue({
      heap_size_limit: 100,
      total_heap_size: 90, // 90% usage, above the 0.8 threshold
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

    // The stream should be delayed by 100ms for each chunk
    jest.advanceTimersByTime(500);
  });
});
