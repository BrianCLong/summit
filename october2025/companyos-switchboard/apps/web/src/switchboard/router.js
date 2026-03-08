"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = exports.SwitchboardRouter = void 0;
exports.defineRoute = defineRoute;
const observability_1 = require("./observability");
class SwitchboardRouter {
    routes = new Map();
    options;
    constructor(options = {}) {
        this.options = {
            defaultTimeout: 5000,
            defaultRetries: 2,
            // Defaults are console/no-op; supply real implementations in production.
            logger: options.logger || new observability_1.ConsoleLogger(),
            metrics: options.metrics || new observability_1.NoopMetrics(),
            ...options
        };
    }
    register(route) {
        if (this.routes.has(route.id)) {
            this.options.logger.warn(`Route with ID ${route.id} is being overwritten.`);
        }
        this.routes.set(route.id, route);
    }
    getRoute(id) {
        return this.routes.get(id);
    }
    async dispatch(routeId, payload, context) {
        const start = performance.now();
        const route = this.routes.get(routeId);
        if (!route) {
            this.options.logger.error(`Route not found: ${routeId}`, { context });
            throw new Error(`Route not found: ${routeId}`);
        }
        this.options.metrics.increment('switchboard.request', {
            routeId,
            source: context.source,
        });
        // Validate input
        const validationResult = route.inputSchema.safeParse(payload);
        if (!validationResult.success) {
            this.options.logger.warn(`Invalid input for route ${routeId}`, {
                error: validationResult.error,
                context,
            });
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
        }
        catch (error) {
            const errorMessage = (0, observability_1.getErrorMessage)(error);
            const duration = performance.now() - start;
            this.options.metrics.histogram('switchboard.latency', duration, { routeId, status: 'error' });
            this.options.metrics.increment('switchboard.error', { routeId, type: 'execution' });
            this.options.logger.error(`Route ${routeId} failed`, { error: errorMessage, context });
            throw error;
        }
    }
    async executeWithRetry(route, payload, context) {
        let attempt = 0;
        const maxRetries = this.options.defaultRetries;
        while (attempt <= maxRetries) {
            try {
                return await this.executeWithTimeout(route, payload, context);
            }
            catch (error) {
                attempt++;
                const errorMessage = (0, observability_1.getErrorMessage)(error);
                this.options.logger.warn(`Attempt ${attempt} failed for route ${route.id}`, {
                    error: errorMessage,
                    context,
                });
                if (attempt > maxRetries) {
                    this.options.logger.error(`Route ${route.id} failed after ${attempt} attempts`, {
                        error: errorMessage,
                        context,
                    });
                    throw new Error(`Route ${route.id} failed after ${attempt} attempts. Last error: ${errorMessage}`);
                }
                // Simple backoff: 100ms * 2^attempt
                const delay = 100 * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    async executeWithTimeout(route, payload, context) {
        const timeout = this.options.defaultTimeout;
        return Promise.race([
            route.handler(payload, context),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Route ${route.id} timed out after ${timeout}ms`)), timeout))
        ]).then(async (result) => {
            // Validate output
            const outputValidation = route.outputSchema.safeParse(result);
            if (!outputValidation.success) {
                this.options.logger.warn(`Route ${route.id} returned invalid output`, {
                    error: outputValidation.error.message,
                    context,
                });
            }
            return result;
        });
    }
}
exports.SwitchboardRouter = SwitchboardRouter;
exports.router = new SwitchboardRouter();
function defineRoute(route) {
    return route;
}
