/**
 * WindowedAggregator - Windowed stream aggregation
 *
 * Tumbling, sliding, and session windows for stream aggregation
 */

import { EventEmitter } from 'events';
import pino from 'pino';
import type { StreamEvent } from '../processing/StreamProcessor.js';

export enum WindowType {
  TUMBLING = 'tumbling',
  SLIDING = 'sliding',
  SESSION = 'session'
}

export interface WindowConfig {
  type: WindowType;
  size: number; // milliseconds
  slide?: number; // for sliding windows
  sessionGap?: number; // for session windows
}

export interface Window<T = any> {
  windowId: string;
  startTime: Date;
  endTime: Date;
  events: StreamEvent<T>[];
  keys: Set<string>;
}

export type AggregateFunction<T = any, R = any> = (
  events: StreamEvent<T>[]
) => R;

export class WindowedAggregator<T = any, R = any> extends EventEmitter {
  private logger: pino.Logger;
  private config: WindowConfig;
  private windows: Map<string, Window<T>> = new Map();
  private aggregateFunction: AggregateFunction<T, R>;
  private timer?: NodeJS.Timeout;

  constructor(
    config: WindowConfig,
    aggregateFunction: AggregateFunction<T, R>
  ) {
    super();
    this.config = config;
    this.aggregateFunction = aggregateFunction;
    this.logger = pino({ name: 'WindowedAggregator' });
  }

  /**
   * Start windowing
   */
  start(): void {
    if (this.config.type === WindowType.TUMBLING) {
      this.startTumblingWindows();
    } else if (this.config.type === WindowType.SLIDING) {
      this.startSlidingWindows();
    }

    this.logger.info(
      { type: this.config.type, size: this.config.size },
      'Windowing started'
    );
  }

  /**
   * Stop windowing
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    this.logger.info('Windowing stopped');
  }

  /**
   * Add event to window
   */
  addEvent(event: StreamEvent<T>): void {
    const now = new Date();

    if (this.config.type === WindowType.SESSION) {
      this.addToSessionWindow(event, now);
    } else {
      this.addToTimeWindow(event, now);
    }
  }

  /**
   * Start tumbling windows
   */
  private startTumblingWindows(): void {
    this.timer = setInterval(() => {
      this.closeCurrentWindows();
    }, this.config.size);
  }

  /**
   * Start sliding windows
   */
  private startSlidingWindows(): void {
    const slide = this.config.slide || this.config.size;

    this.timer = setInterval(() => {
      this.closeExpiredWindows();
    }, slide);
  }

  /**
   * Add event to time-based window
   */
  private addToTimeWindow(event: StreamEvent<T>, now: Date): void {
    const windowStart = this.getWindowStart(event.timestamp);
    const windowEnd = new Date(windowStart.getTime() + this.config.size);
    const windowId = `${windowStart.getTime()}-${windowEnd.getTime()}`;

    let window = this.windows.get(windowId);

    if (!window) {
      window = {
        windowId,
        startTime: windowStart,
        endTime: windowEnd,
        events: [],
        keys: new Set()
      };
      this.windows.set(windowId, window);
    }

    window.events.push(event);
    window.keys.add(event.key);
  }

  /**
   * Add event to session window
   */
  private addToSessionWindow(event: StreamEvent<T>, now: Date): void {
    const sessionGap = this.config.sessionGap || 5000;
    let targetWindow: Window<T> | undefined;

    // Find existing session window for this key
    for (const window of this.windows.values()) {
      if (window.keys.has(event.key)) {
        const lastEventTime = Math.max(
          ...window.events.map(e => e.timestamp.getTime())
        );

        const timeSinceLastEvent = event.timestamp.getTime() - lastEventTime;

        if (timeSinceLastEvent <= sessionGap) {
          targetWindow = window;
          break;
        }
      }
    }

    if (!targetWindow) {
      // Create new session window
      const windowId = `session-${event.key}-${event.timestamp.getTime()}`;
      targetWindow = {
        windowId,
        startTime: event.timestamp,
        endTime: new Date(event.timestamp.getTime() + sessionGap),
        events: [],
        keys: new Set()
      };
      this.windows.set(windowId, targetWindow);
    }

    targetWindow.events.push(event);
    targetWindow.keys.add(event.key);
    targetWindow.endTime = new Date(
      event.timestamp.getTime() + sessionGap
    );
  }

  /**
   * Get window start time
   */
  private getWindowStart(timestamp: Date): Date {
    const time = timestamp.getTime();
    const windowSize = this.config.size;
    const windowStart = Math.floor(time / windowSize) * windowSize;

    return new Date(windowStart);
  }

  /**
   * Close current windows
   */
  private closeCurrentWindows(): void {
    const now = Date.now();

    for (const [windowId, window] of this.windows.entries()) {
      if (window.endTime.getTime() <= now) {
        this.closeWindow(window);
        this.windows.delete(windowId);
      }
    }
  }

  /**
   * Close expired windows
   */
  private closeExpiredWindows(): void {
    const now = Date.now();

    for (const [windowId, window] of this.windows.entries()) {
      if (window.endTime.getTime() <= now) {
        this.closeWindow(window);
        this.windows.delete(windowId);
      }
    }
  }

  /**
   * Close window and emit result
   */
  private closeWindow(window: Window<T>): void {
    if (window.events.length === 0) {
      return;
    }

    try {
      const result = this.aggregateFunction(window.events);

      this.emit('window:closed', {
        windowId: window.windowId,
        startTime: window.startTime,
        endTime: window.endTime,
        eventCount: window.events.length,
        result
      });

      this.logger.debug(
        {
          windowId: window.windowId,
          events: window.events.length
        },
        'Window closed'
      );
    } catch (err) {
      this.logger.error(
        { err, windowId: window.windowId },
        'Aggregation error'
      );

      this.emit('window:error', {
        windowId: window.windowId,
        error: err
      });
    }
  }

  /**
   * Get active window count
   */
  getActiveWindowCount(): number {
    return this.windows.size;
  }
}

/**
 * Common aggregation functions
 */
export class Aggregators {
  static count<T>(): AggregateFunction<T, number> {
    return (events) => events.length;
  }

  static sum<T>(selector: (value: T) => number): AggregateFunction<T, number> {
    return (events) => {
      return events.reduce((sum, event) => sum + selector(event.value), 0);
    };
  }

  static avg<T>(selector: (value: T) => number): AggregateFunction<T, number> {
    return (events) => {
      if (events.length === 0) return 0;
      const sum = events.reduce((s, event) => s + selector(event.value), 0);
      return sum / events.length;
    };
  }

  static min<T>(selector: (value: T) => number): AggregateFunction<T, number> {
    return (events) => {
      if (events.length === 0) return 0;
      return Math.min(...events.map(e => selector(e.value)));
    };
  }

  static max<T>(selector: (value: T) => number): AggregateFunction<T, number> {
    return (events) => {
      if (events.length === 0) return 0;
      return Math.max(...events.map(e => selector(e.value)));
    };
  }

  static collect<T>(): AggregateFunction<T, T[]> {
    return (events) => events.map(e => e.value);
  }

  static distinct<T>(selector: (value: T) => any): AggregateFunction<T, T[]> {
    return (events) => {
      const seen = new Set();
      const result: T[] = [];

      for (const event of events) {
        const key = selector(event.value);
        if (!seen.has(key)) {
          seen.add(key);
          result.push(event.value);
        }
      }

      return result;
    };
  }
}
