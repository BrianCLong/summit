/**
 * RequestReply - Request-reply messaging pattern
 *
 * Implements synchronous-style communication over async messaging
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { EventBus } from '@intelgraph/event-bus';
import pino from 'pino';

export interface Request<T = any> {
  requestId: string;
  replyTo: string;
  correlationId: string;
  payload: T;
  timeout?: number;
  timestamp: Date;
}

export interface Reply<T = any> {
  requestId: string;
  correlationId: string;
  success: boolean;
  payload?: T;
  error?: string;
  timestamp: Date;
}

export class RequestReply extends EventEmitter {
  private eventBus: EventBus;
  private logger: pino.Logger;
  private pendingRequests: Map<string, {
    resolve: (reply: Reply) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor(eventBus: EventBus) {
    super();
    this.eventBus = eventBus;
    this.logger = pino({ name: 'RequestReply' });
  }

  /**
   * Initialize request-reply handler
   */
  async initialize(): Promise<void> {
    // Subscribe to reply topic
    await this.eventBus.subscribe(
      'request-reply.replies',
      async (message) => {
        const reply = message.payload as Reply;
        this.handleReply(reply);
      }
    );

    this.logger.info('RequestReply initialized');
  }

  /**
   * Send a request and wait for reply
   */
  async request<TRequest = any, TReply = any>(
    topic: string,
    payload: TRequest,
    timeout: number = 30000
  ): Promise<Reply<TReply>> {
    const requestId = uuidv4();
    const correlationId = uuidv4();

    const request: Request<TRequest> = {
      requestId,
      replyTo: 'request-reply.replies',
      correlationId,
      payload,
      timeout,
      timestamp: new Date()
    };

    this.logger.debug(
      { requestId, topic },
      'Sending request'
    );

    // Create promise for reply
    const replyPromise = new Promise<Reply<TReply>>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      this.pendingRequests.set(requestId, {
        resolve: resolve as any,
        reject,
        timeout: timeoutHandle
      });
    });

    // Publish request
    await this.eventBus.publish(topic, request);

    this.emit('request:sent', { requestId, topic });

    return replyPromise;
  }

  /**
   * Register handler for requests
   */
  async handleRequests<TRequest = any, TReply = any>(
    topic: string,
    handler: (request: Request<TRequest>) => Promise<TReply>
  ): Promise<void> {
    await this.eventBus.subscribe(topic, async (message) => {
      const request = message.payload as Request<TRequest>;

      this.logger.debug(
        { requestId: request.requestId, topic },
        'Handling request'
      );

      try {
        const result = await handler(request);

        const reply: Reply<TReply> = {
          requestId: request.requestId,
          correlationId: request.correlationId,
          success: true,
          payload: result,
          timestamp: new Date()
        };

        // Send reply
        await this.eventBus.publish(request.replyTo, reply);

        this.emit('request:handled', { requestId: request.requestId });
      } catch (err: any) {
        this.logger.error(
          { err, requestId: request.requestId },
          'Request handler error'
        );

        const reply: Reply = {
          requestId: request.requestId,
          correlationId: request.correlationId,
          success: false,
          error: err.message,
          timestamp: new Date()
        };

        await this.eventBus.publish(request.replyTo, reply);

        this.emit('request:failed', {
          requestId: request.requestId,
          error: err.message
        });
      }
    });

    this.logger.info({ topic }, 'Request handler registered');
  }

  /**
   * Handle incoming reply
   */
  private handleReply(reply: Reply): void {
    const pending = this.pendingRequests.get(reply.requestId);

    if (!pending) {
      this.logger.warn(
        { requestId: reply.requestId },
        'Received reply for unknown request'
      );
      return;
    }

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(reply.requestId);

    if (reply.success) {
      pending.resolve(reply);
      this.emit('reply:received', { requestId: reply.requestId });
    } else {
      pending.reject(new Error(reply.error || 'Request failed'));
      this.emit('reply:error', {
        requestId: reply.requestId,
        error: reply.error
      });
    }
  }

  /**
   * Get pending request count
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}
