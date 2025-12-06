import v8 from 'v8';
import { logger } from '../config/logger.js';

interface SystemHealth {
  isOverloaded: boolean;
  reason?: string;
  metrics: {
    eventLoopLag: number;
    heapUsedPct: number;
    activeHandles: number;
  };
}

class SystemMonitor {
  private lastCheck: number = Date.now();
  private lag: number = 0;
  private intervalId?: NodeJS.Timeout;
  private readonly CHECK_INTERVAL = 500;

  // Thresholds
  private readonly MAX_LAG_MS = 200; // 200ms lag is getting dangerous
  private readonly MAX_HEAP_PCT = 0.85; // 85% heap usage

  constructor() {
    this.start();
  }

  private start() {
    this.intervalId = setInterval(() => {
      const now = Date.now();
      const dt = now - this.lastCheck;
      // Theoretical diff is CHECK_INTERVAL.
      // Lag is the excess time.
      this.lag = Math.max(0, dt - this.CHECK_INTERVAL);
      this.lastCheck = now;
    }, this.CHECK_INTERVAL).unref(); // unref so it doesn't keep process alive
  }

  public getHealth(): SystemHealth {
    const { heap_size_limit, used_heap_size } = v8.getHeapStatistics();
    const heapUsedPct = used_heap_size / heap_size_limit;
    // activeHandles requires 'process._getActiveHandles()' which is internal/deprecated or
    // process.resourceUsage() in newer nodes. Let's stick to standard metrics.
    // actually process.getActiveResourcesInfo() exists in newer node.
    // For now, let's just count handles if possible, or skip.
    const activeHandles = (process as any)._getActiveHandles?.().length || 0;

    const isLagging = this.lag > this.MAX_LAG_MS;
    const isOOM = heapUsedPct > this.MAX_HEAP_PCT;

    let reason: string | undefined;
    if (isLagging) reason = `Event Loop Lag: ${this.lag}ms`;
    if (isOOM) reason = `High Memory: ${(heapUsedPct * 100).toFixed(1)}%`;

    return {
      isOverloaded: isLagging || isOOM,
      reason,
      metrics: {
        eventLoopLag: this.lag,
        heapUsedPct,
        activeHandles,
      },
    };
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

export const systemMonitor = new SystemMonitor();
