
import { Transform, TransformCallback } from 'stream';
import v8 from 'v8';

interface BackpressureStreamOptions {
  highWatermark?: number;
  memoryThreshold?: number; // Heap usage percentage (0-1) to trigger backpressure
  delayMs?: number; // The delay to apply when under memory pressure
}

export class BackpressureStream<T> extends Transform {
  private readonly memoryThreshold: number;
  private readonly delayMs: number;

  constructor(options: BackpressureStreamOptions = {}) {
    super({
      objectMode: true,
      highWatermark: options.highWatermark ?? 100,
    });
    this.memoryThreshold = options.memoryThreshold ?? 0.8; // Default to 80% heap usage
    this.delayMs = options.delayMs ?? 100; // Default to 100ms
  }

  private isUnderPressure(): boolean {
    const { heap_size_limit, total_heap_size } = v8.getHeapStatistics();
    const usage = total_heap_size / heap_size_limit;
    return usage > this.memoryThreshold;
  }

  _transform(chunk: T, encoding: BufferEncoding, callback: TransformCallback): void {
    if (this.isUnderPressure()) {
      // If memory is high, slow down the stream by introducing a delay.
      // This will cause the internal buffer to fill up and signal
      // backpressure to the producer.
      setTimeout(() => {
        this.push(chunk);
        callback();
      }, this.delayMs);
    } else {
      this.push(chunk);
      callback();
    }
  }
}
