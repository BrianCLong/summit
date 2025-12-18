import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { Message, MessageHandler } from './types';

const logger = pino({ name: 'MessageRouter' });
const tracer = trace.getTracer('message-queue-enhanced');

interface Route {
  pattern: RegExp;
  handler: MessageHandler;
  priority?: number;
}

/**
 * Message routing with pattern matching
 */
export class MessageRouter {
  private routes: Route[] = [];

  /**
   * Add route with pattern matching
   */
  addRoute(pattern: string | RegExp, handler: MessageHandler, priority: number = 0): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    this.routes.push({ pattern: regex, handler, priority });

    // Sort by priority (higher first)
    this.routes.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    logger.debug({ pattern: pattern.toString(), priority }, 'Route added');
  }

  /**
   * Route message to appropriate handler
   */
  async route(message: Message): Promise<void> {
    const span = tracer.startSpan('MessageRouter.route');

    try {
      const matchingRoutes = this.routes.filter((route) =>
        route.pattern.test(message.topic)
      );

      if (matchingRoutes.length === 0) {
        logger.warn({ topic: message.topic }, 'No matching route found');
        return;
      }

      // Execute all matching handlers
      await Promise.all(
        matchingRoutes.map((route) => route.handler(message))
      );

      span.setAttributes({
        topic: message.topic,
        matchCount: matchingRoutes.length,
      });
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Clear all routes
   */
  clearRoutes(): void {
    this.routes = [];
    logger.info('All routes cleared');
  }

  /**
   * Get route count
   */
  getRouteCount(): number {
    return this.routes.length;
  }
}
