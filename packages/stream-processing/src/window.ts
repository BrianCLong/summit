import { EventEmitter } from 'eventemitter3';
import { Subject, Observable } from 'rxjs';
import { StreamMessage } from '@intelgraph/kafka-integration';
import pino from 'pino';
import {
  WindowSpec,
  WindowType,
  TimeSemantics,
  Window,
  WindowedMessage,
  AggregateFunction,
} from './types';

const logger = pino({ name: 'window-manager' });

/**
 * Window manager for handling windowing operations
 */
export class WindowManager<T = unknown> extends EventEmitter {
  private windows: Map<string, WindowState<T>> = new Map();
  private windowSubject: Subject<WindowedMessage<T>> = new Subject();

  constructor(private spec: WindowSpec) {
    super();
    this.startWindowGarbageCollection();
  }

  /**
   * Add message to appropriate window(s)
   */
  addMessage(message: StreamMessage<T>): void {
    const timestamp = this.getTimestamp(message);
    const windows = this.assignWindows(timestamp);

    for (const window of windows) {
      this.addToWindow(window, message);
    }
  }

  /**
   * Assign message to windows
   */
  private assignWindows(timestamp: number): Window[] {
    switch (this.spec.type) {
      case WindowType.TUMBLING:
        return [this.createTumblingWindow(timestamp)];

      case WindowType.SLIDING:
        return this.createSlidingWindows(timestamp);

      case WindowType.SESSION:
        return [this.createSessionWindow(timestamp)];

      case WindowType.GLOBAL:
        return [this.createGlobalWindow()];

      default:
        throw new Error(`Unknown window type: ${this.spec.type}`);
    }
  }

  /**
   * Create tumbling window
   */
  private createTumblingWindow(timestamp: number): Window {
    const start = Math.floor(timestamp / this.spec.size) * this.spec.size;
    const end = start + this.spec.size;

    return {
      id: `tumbling-${start}-${end}`,
      start,
      end,
      type: WindowType.TUMBLING,
    };
  }

  /**
   * Create sliding windows
   */
  private createSlidingWindows(timestamp: number): Window[] {
    const slide = this.spec.slide || this.spec.size;
    const windows: Window[] = [];

    // Calculate how many windows this event belongs to
    const numWindows = Math.ceil(this.spec.size / slide);

    for (let i = 0; i < numWindows; i++) {
      const start = Math.floor(timestamp / slide) * slide - i * slide;
      const end = start + this.spec.size;

      if (timestamp >= start && timestamp < end) {
        windows.push({
          id: `sliding-${start}-${end}`,
          start,
          end,
          type: WindowType.SLIDING,
        });
      }
    }

    return windows;
  }

  /**
   * Create session window
   */
  private createSessionWindow(timestamp: number): Window {
    const gap = this.spec.gap || 5000; // Default 5 second gap

    // Find existing session window within gap
    for (const [id, state] of this.windows.entries()) {
      if (state.window.type === WindowType.SESSION) {
        if (timestamp - state.window.end < gap) {
          // Extend existing window
          state.window.end = timestamp + gap;
          return state.window;
        }
      }
    }

    // Create new session window
    return {
      id: `session-${timestamp}`,
      start: timestamp,
      end: timestamp + gap,
      type: WindowType.SESSION,
    };
  }

  /**
   * Create global window
   */
  private createGlobalWindow(): Window {
    return {
      id: 'global',
      start: 0,
      end: Number.MAX_SAFE_INTEGER,
      type: WindowType.GLOBAL,
    };
  }

  /**
   * Add message to window
   */
  private addToWindow(window: Window, message: StreamMessage<T>): void {
    if (!this.windows.has(window.id)) {
      this.windows.set(window.id, {
        window,
        messages: [],
        lastUpdate: Date.now(),
      });
    }

    const state = this.windows.get(window.id)!;
    state.messages.push(message);
    state.lastUpdate = Date.now();

    this.emit('message-added', { window, message });
  }

  /**
   * Trigger window
   */
  triggerWindow(windowId: string): void {
    const state = this.windows.get(windowId);

    if (!state) {
      logger.warn({ windowId }, 'Window not found');
      return;
    }

    const windowed: WindowedMessage<T> = {
      window: state.window,
      messages: state.messages,
      count: state.messages.length,
      startTime: state.window.start,
      endTime: state.window.end,
    };

    this.windowSubject.next(windowed);
    this.emit('window-triggered', windowed);

    // Remove window after triggering (for tumbling/sliding)
    if (state.window.type !== WindowType.GLOBAL) {
      this.windows.delete(windowId);
    }
  }

  /**
   * Get windowed stream
   */
  asObservable(): Observable<WindowedMessage<T>> {
    return this.windowSubject.asObservable();
  }

  /**
   * Aggregate function over windows
   */
  aggregate<A, R>(aggregateFunction: AggregateFunction<T, A, R>): Observable<{
    window: Window;
    result: R;
  }> {
    const resultSubject = new Subject<{ window: Window; result: R }>();

    this.windowSubject.subscribe({
      next: (windowed) => {
        let accumulator = aggregateFunction.createAccumulator();

        for (const message of windowed.messages) {
          accumulator = aggregateFunction.add(message.payload, accumulator);
        }

        const result = aggregateFunction.getResult(accumulator);

        resultSubject.next({
          window: windowed.window,
          result,
        });
      },
      error: (error) => resultSubject.error(error),
      complete: () => resultSubject.complete(),
    });

    return resultSubject.asObservable();
  }

  /**
   * Get timestamp based on time semantics
   */
  private getTimestamp(message: StreamMessage<T>): number {
    switch (this.spec.timeSemantics) {
      case TimeSemantics.EVENT_TIME:
        return message.metadata.timestamp;

      case TimeSemantics.PROCESSING_TIME:
        return Date.now();

      case TimeSemantics.INGESTION_TIME:
        // Use event timestamp as proxy for ingestion time
        return message.metadata.timestamp;

      default:
        return message.metadata.timestamp;
    }
  }

  /**
   * Start garbage collection for old windows
   */
  private startWindowGarbageCollection(): void {
    setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 1 minute

      for (const [id, state] of this.windows.entries()) {
        if (now - state.lastUpdate > timeout) {
          // Trigger window before removing
          this.triggerWindow(id);
        }
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Get all active windows
   */
  getActiveWindows(): Window[] {
    return Array.from(this.windows.values()).map((state) => state.window);
  }

  /**
   * Get window state
   */
  getWindowState(windowId: string): WindowState<T> | undefined {
    return this.windows.get(windowId);
  }
}

/**
 * Internal window state
 */
interface WindowState<T> {
  window: Window;
  messages: StreamMessage<T>[];
  lastUpdate: number;
}
