import { Observable, Subject } from 'rxjs';
import { StreamMessage } from '@intelgraph/kafka-integration';
import pino from 'pino';
import { JoinType, JoinSpec, WindowSpec } from './types';
import { DataStream } from './stream';
import { WindowManager } from './window';

const logger = pino({ name: 'stream-joins' });

/**
 * Stream join operations
 */
export class StreamJoin<L, R, K = string> {
  private leftWindows: Map<K, StreamMessage<L>[]> = new Map();
  private rightWindows: Map<K, StreamMessage<R>[]> = new Map();
  private resultSubject: Subject<JoinResult<L, R>> = new Subject();

  constructor(
    private leftStream: DataStream<L>,
    private rightStream: DataStream<R>,
    private spec: JoinSpec,
    private leftKeyExtractor: (value: L) => K,
    private rightKeyExtractor: (value: R) => K
  ) {
    this.setupJoin();
  }

  /**
   * Setup join processing
   */
  private setupJoin(): void {
    // Subscribe to left stream
    this.leftStream.asObservable().subscribe({
      next: (message) => this.processLeft(message),
      error: (error) => logger.error({ error }, 'Left stream error'),
    });

    // Subscribe to right stream
    this.rightStream.asObservable().subscribe({
      next: (message) => this.processRight(message),
      error: (error) => logger.error({ error }, 'Right stream error'),
    });

    // Start window cleanup
    this.startWindowCleanup();
  }

  /**
   * Process left stream message
   */
  private processLeft(message: StreamMessage<L>): void {
    const key = this.leftKeyExtractor(message.payload);

    // Add to left window
    if (!this.leftWindows.has(key)) {
      this.leftWindows.set(key, []);
    }
    this.leftWindows.get(key)!.push(message);

    // Perform join
    this.performJoin(key);
  }

  /**
   * Process right stream message
   */
  private processRight(message: StreamMessage<R>): void {
    const key = this.rightKeyExtractor(message.payload);

    // Add to right window
    if (!this.rightWindows.has(key)) {
      this.rightWindows.set(key, []);
    }
    this.rightWindows.get(key)!.push(message);

    // Perform join
    this.performJoin(key);
  }

  /**
   * Perform join operation
   */
  private performJoin(key: K): void {
    const leftMessages = this.leftWindows.get(key) || [];
    const rightMessages = this.rightWindows.get(key) || [];

    switch (this.spec.type) {
      case JoinType.INNER:
        this.performInnerJoin(key, leftMessages, rightMessages);
        break;

      case JoinType.LEFT:
        this.performLeftJoin(key, leftMessages, rightMessages);
        break;

      case JoinType.RIGHT:
        this.performRightJoin(key, leftMessages, rightMessages);
        break;

      case JoinType.FULL_OUTER:
        this.performFullOuterJoin(key, leftMessages, rightMessages);
        break;
    }
  }

  /**
   * Inner join
   */
  private performInnerJoin(
    key: K,
    leftMessages: StreamMessage<L>[],
    rightMessages: StreamMessage<R>[]
  ): void {
    for (const leftMsg of leftMessages) {
      for (const rightMsg of rightMessages) {
        if (this.isWithinWindow(leftMsg, rightMsg)) {
          this.resultSubject.next({
            key,
            left: leftMsg.payload,
            right: rightMsg.payload,
            leftMessage: leftMsg,
            rightMessage: rightMsg,
          });
        }
      }
    }
  }

  /**
   * Left join
   */
  private performLeftJoin(
    key: K,
    leftMessages: StreamMessage<L>[],
    rightMessages: StreamMessage<R>[]
  ): void {
    for (const leftMsg of leftMessages) {
      let matched = false;

      for (const rightMsg of rightMessages) {
        if (this.isWithinWindow(leftMsg, rightMsg)) {
          this.resultSubject.next({
            key,
            left: leftMsg.payload,
            right: rightMsg.payload,
            leftMessage: leftMsg,
            rightMessage: rightMsg,
          });
          matched = true;
        }
      }

      if (!matched) {
        this.resultSubject.next({
          key,
          left: leftMsg.payload,
          right: null,
          leftMessage: leftMsg,
          rightMessage: null,
        });
      }
    }
  }

  /**
   * Right join
   */
  private performRightJoin(
    key: K,
    leftMessages: StreamMessage<L>[],
    rightMessages: StreamMessage<R>[]
  ): void {
    for (const rightMsg of rightMessages) {
      let matched = false;

      for (const leftMsg of leftMessages) {
        if (this.isWithinWindow(leftMsg, rightMsg)) {
          this.resultSubject.next({
            key,
            left: leftMsg.payload,
            right: rightMsg.payload,
            leftMessage: leftMsg,
            rightMessage: rightMsg,
          });
          matched = true;
        }
      }

      if (!matched) {
        this.resultSubject.next({
          key,
          left: null,
          right: rightMsg.payload,
          leftMessage: null,
          rightMessage: rightMsg,
        });
      }
    }
  }

  /**
   * Full outer join
   */
  private performFullOuterJoin(
    key: K,
    leftMessages: StreamMessage<L>[],
    rightMessages: StreamMessage<R>[]
  ): void {
    const matchedLeft = new Set<StreamMessage<L>>();
    const matchedRight = new Set<StreamMessage<R>>();

    // Find matches
    for (const leftMsg of leftMessages) {
      for (const rightMsg of rightMessages) {
        if (this.isWithinWindow(leftMsg, rightMsg)) {
          this.resultSubject.next({
            key,
            left: leftMsg.payload,
            right: rightMsg.payload,
            leftMessage: leftMsg,
            rightMessage: rightMsg,
          });
          matchedLeft.add(leftMsg);
          matchedRight.add(rightMsg);
        }
      }
    }

    // Emit unmatched left
    for (const leftMsg of leftMessages) {
      if (!matchedLeft.has(leftMsg)) {
        this.resultSubject.next({
          key,
          left: leftMsg.payload,
          right: null,
          leftMessage: leftMsg,
          rightMessage: null,
        });
      }
    }

    // Emit unmatched right
    for (const rightMsg of rightMessages) {
      if (!matchedRight.has(rightMsg)) {
        this.resultSubject.next({
          key,
          left: null,
          right: rightMsg.payload,
          leftMessage: null,
          rightMessage: rightMsg,
        });
      }
    }
  }

  /**
   * Check if messages are within join window
   */
  private isWithinWindow(
    leftMsg: StreamMessage<L>,
    rightMsg: StreamMessage<R>
  ): boolean {
    const timeDiff = Math.abs(
      leftMsg.metadata.timestamp - rightMsg.metadata.timestamp
    );
    return timeDiff <= this.spec.windowSpec.size;
  }

  /**
   * Start window cleanup
   */
  private startWindowCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const windowSize = this.spec.windowSpec.size;

      // Cleanup left windows
      for (const [key, messages] of this.leftWindows.entries()) {
        const filtered = messages.filter(
          (msg) => now - msg.metadata.timestamp < windowSize
        );

        if (filtered.length === 0) {
          this.leftWindows.delete(key);
        } else {
          this.leftWindows.set(key, filtered);
        }
      }

      // Cleanup right windows
      for (const [key, messages] of this.rightWindows.entries()) {
        const filtered = messages.filter(
          (msg) => now - msg.metadata.timestamp < windowSize
        );

        if (filtered.length === 0) {
          this.rightWindows.delete(key);
        } else {
          this.rightWindows.set(key, filtered);
        }
      }
    }, 10000); // Cleanup every 10 seconds
  }

  /**
   * Get join results as observable
   */
  asObservable(): Observable<JoinResult<L, R>> {
    return this.resultSubject.asObservable();
  }
}

/**
 * Join result
 */
export interface JoinResult<L, R> {
  key: any;
  left: L | null;
  right: R | null;
  leftMessage: StreamMessage<L> | null;
  rightMessage: StreamMessage<R> | null;
}

/**
 * Interval join for temporal joins
 */
export class IntervalJoin<L, R, K = string> extends StreamJoin<L, R, K> {
  constructor(
    leftStream: DataStream<L>,
    rightStream: DataStream<R>,
    spec: JoinSpec,
    leftKeyExtractor: (value: L) => K,
    rightKeyExtractor: (value: R) => K,
    private lowerBound: number,
    private upperBound: number
  ) {
    super(leftStream, rightStream, spec, leftKeyExtractor, rightKeyExtractor);
  }

  /**
   * Check if messages are within interval
   */
  protected isWithinWindow(
    leftMsg: StreamMessage<L>,
    rightMsg: StreamMessage<R>
  ): boolean {
    const timeDiff = rightMsg.metadata.timestamp - leftMsg.metadata.timestamp;
    return timeDiff >= this.lowerBound && timeDiff <= this.upperBound;
  }
}
