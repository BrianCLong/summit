import { SwitchboardRoute, SwitchboardContext } from './types';
import { z } from 'zod';

interface RouterOptions {
  defaultTimeout?: number;
  defaultRetries?: number;
  logger?: Logger;
  metrics?: Metrics;
}

interface Logger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

interface Metrics {
  increment(metric: string, tags?: Record<string, string>): void;
  histogram(metric: string, value: number, tags?: Record<string, string>): void;
}

class ConsoleLogger implements Logger {
  info(message: string, meta?: any) { console.log(JSON.stringify({ level: 'info', message, ...meta })); }
  warn(message: string, meta?: any) { console.warn(JSON.stringify({ level: 'warn', message, ...meta })); }
  error(message: string, meta?: any) { console.error(JSON.stringify({ level: 'error', message, ...meta })); }
}

class NoopMetrics implements Metrics {
  increment() {}
  histogram() {}
}

export class SwitchboardRouter {
  private routes: Map<string, SwitchboardRoute> = new Map();
  private options: Required<RouterOptions>;

  constructor(options: RouterOptions = {}) {
    this.options = {
      defaultTimeout: 5000,
      defaultRetries: 2,
      // TODO: Integrate with the application's real logger (e.g. Pino, Winston)
      // instead of using ConsoleLogger in production.
      logger: options.logger || new ConsoleLogger(),
      // TODO: Integrate with real metrics (e.g. Prometheus, StatsD)
      metrics: options.metrics || new NoopMetrics(),
      ...options
    };
  }

  register<I, O>(route: SwitchboardRoute<I, O>) {
    if (this.routes.has(route.id)) {
      this.options.logger.warn(`Route with ID ${route.id} is being overwritten.`);
    }
    this.routes.set(route.id, route);
  }

  getRoute(id: string): SwitchboardRoute | undefined {
    return this.routes.get(id);
  }

  async dispatch(routeId: string, payload: any, context: SwitchboardContext): Promise<any> {
    const start = performance.now();
    const route = this.routes.get(routeId);

    if (!route) {
      this.options.logger.error(`Route not found: ${routeId}`, { context });
      throw new Error(`Route not found: ${routeId}`);
    }

    this.options.metrics.increment('switchboard.request', { routeId, source: context.source });

    // Validate input
    const validationResult = route.inputSchema.safeParse(payload);
    if (!validationResult.success) {
        this.options.logger.warn(`Invalid input for route ${routeId}`, { error: validationResult.error, context });
        this.options.metrics.increment('switchboard.error', { routeId, type: 'validation' });
        throw new Error(`Invalid input for route ${routeId}: ${validationResult.error.message}`);
    }

    const validatedPayload = validationResult.data;

    try {
      const result = await this.executeWithRetry(route, validatedPayload, context);

      const duration = performance.now() - start;
      this.options.metrics.histogram('switchboard.latency', duration, { routeId });
      this.options.logger.info(`Route ${routeId} completed`, { routeId, duration, context });

      return result;
    } catch (error: any) {
      const duration = performance.now() - start;
      this.options.metrics.histogram('switchboard.latency', duration, { routeId, status: 'error' });
      this.options.metrics.increment('switchboard.error', { routeId, type: 'execution' });
      throw error;
    }
  }

  private async executeWithRetry(route: SwitchboardRoute, payload: any, context: SwitchboardContext) {
    let attempt = 0;
    const maxRetries = this.options.defaultRetries;

    while (attempt <= maxRetries) {
      try {
        return await this.executeWithTimeout(route, payload, context);
      } catch (error: any) {
        attempt++;
        this.options.logger.warn(`Attempt ${attempt} failed for route ${route.id}`, { error: error.message, context });

        if (attempt > maxRetries) {
          this.options.logger.error(`Route ${route.id} failed after ${attempt} attempts`, { error: error.message, context });
          throw new Error(`Route ${route.id} failed after ${attempt} attempts. Last error: ${error.message}`);
        }

        // Simple backoff: 100ms * 2^attempt
        const delay = 100 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async executeWithTimeout(route: SwitchboardRoute, payload: any, context: SwitchboardContext) {
    const timeout = this.options.defaultTimeout;

    return Promise.race([
      route.handler(payload, context),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Route ${route.id} timed out after ${timeout}ms`)), timeout)
      )
    ]).then(async (result) => {
       // Validate output
       const outputValidation = route.outputSchema.safeParse(result);
       if (!outputValidation.success) {
           this.options.logger.warn(`Route ${route.id} returned invalid output`, { error: outputValidation.error.message, context });
       }
       return result;
    });
  }
}

export const router = new SwitchboardRouter();

export function defineRoute<I, O>(route: SwitchboardRoute<I, O>) {
  return route;
}
