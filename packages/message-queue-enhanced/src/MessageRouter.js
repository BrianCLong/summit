"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageRouter = void 0;
const api_1 = require("@opentelemetry/api");
const pino = require("pino");
const logger = pino({ name: 'MessageRouter' });
const tracer = api_1.trace.getTracer('message-queue-enhanced');
/**
 * Message routing with pattern matching
 */
class MessageRouter {
    routes = [];
    /**
     * Add route with pattern matching
     */
    addRoute(pattern, handler, priority = 0) {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        this.routes.push({ pattern: regex, handler, priority });
        // Sort by priority (higher first)
        this.routes.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        logger.debug({ pattern: pattern.toString(), priority }, 'Route added');
    }
    /**
     * Route message to appropriate handler
     */
    async route(message) {
        const span = tracer.startSpan('MessageRouter.route');
        try {
            const matchingRoutes = this.routes.filter((route) => route.pattern.test(message.topic));
            if (matchingRoutes.length === 0) {
                logger.warn({ topic: message.topic }, 'No matching route found');
                return;
            }
            // Execute all matching handlers
            await Promise.all(matchingRoutes.map((route) => route.handler(message)));
            span.setAttributes({
                topic: message.topic,
                matchCount: matchingRoutes.length,
            });
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    /**
     * Clear all routes
     */
    clearRoutes() {
        this.routes = [];
        logger.info('All routes cleared');
    }
    /**
     * Get route count
     */
    getRouteCount() {
        return this.routes.length;
    }
}
exports.MessageRouter = MessageRouter;
