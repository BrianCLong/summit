"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseModule = void 0;
class BaseModule {
    definition;
    status;
    handlers;
    stats = { successes: 0, errors: 0, totalLatency: 0 };
    constructor(definition, handlers) {
        this.definition = definition;
        this.handlers = handlers;
        this.status = {
            state: 'offline',
            lastMessage: 'Module registered and awaiting start',
            updatedAt: new Date().toISOString(),
            uptimeMs: 0,
            tasksProcessed: 0,
            queueDepth: 0,
            successCount: 0,
            errorCount: 0,
            telemetry: {
                latencyMs: 0,
                throughputPerMinute: 0,
                utilization: 0,
                reliability: 1,
            },
        };
    }
    getStatus() {
        return JSON.parse(JSON.stringify(this.status));
    }
    listActions() {
        return Object.keys(this.handlers);
    }
    supportsAction(actionName) {
        return Object.prototype.hasOwnProperty.call(this.handlers, actionName);
    }
    async start() {
        this.status = {
            ...this.status,
            state: 'starting',
            lastMessage: 'Bootstrapping module runtime',
            updatedAt: new Date().toISOString(),
            startedAt: new Date().toISOString(),
            uptimeMs: 0,
        };
        await this.simulateWork(25);
        this.status = {
            ...this.status,
            state: 'running',
            lastMessage: 'Module online and ready to receive tasks',
            updatedAt: new Date().toISOString(),
            uptimeMs: 0,
        };
        return this.getStatus();
    }
    async stop() {
        this.status = {
            ...this.status,
            state: 'offline',
            lastMessage: 'Module stopped by orchestrator',
            updatedAt: new Date().toISOString(),
            uptimeMs: 0,
            startedAt: undefined,
        };
        return this.getStatus();
    }
    async executeTask(task, action) {
        if (!this.supportsAction(action.action)) {
            throw new Error(`${this.definition.displayName} cannot perform action "${action.action}"`);
        }
        const handler = this.handlers[action.action];
        const start = Date.now();
        this.status = {
            ...this.status,
            state: 'running',
            lastMessage: `Executing action ${action.action}`,
            updatedAt: new Date().toISOString(),
            tasksProcessed: this.status.tasksProcessed + 1,
            queueDepth: Math.max(this.status.queueDepth - 1, 0),
        };
        try {
            const result = await handler({
                action,
                task,
                status: this.getStatus(),
                definition: this.definition,
            });
            const duration = Date.now() - start;
            this.stats.successes += 1;
            this.stats.totalLatency += duration;
            this.status = {
                ...this.status,
                state: 'running',
                lastMessage: result.message,
                updatedAt: new Date().toISOString(),
                successCount: this.stats.successes,
                errorCount: this.stats.errors,
                telemetry: this.calculateTelemetry(duration, result.telemetry),
            };
            return {
                moduleId: this.definition.id,
                action: action.action,
                status: 'success',
                message: result.message,
                output: result.output ?? {},
                durationMs: duration,
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            const duration = Date.now() - start;
            this.stats.errors += 1;
            this.status = {
                ...this.status,
                state: 'error',
                lastMessage: error instanceof Error ? error.message : 'Unknown module error',
                updatedAt: new Date().toISOString(),
                successCount: this.stats.successes,
                errorCount: this.stats.errors,
                telemetry: this.calculateTelemetry(duration),
            };
            throw error;
        }
    }
    queueTask() {
        this.status = {
            ...this.status,
            queueDepth: this.status.queueDepth + 1,
            updatedAt: new Date().toISOString(),
        };
    }
    calculateTelemetry(lastLatency, overrides) {
        const processed = this.stats.successes + this.stats.errors;
        const avgLatency = processed > 0 ? Math.round(this.stats.totalLatency / processed) : 0;
        const telemetry = {
            latencyMs: overrides?.latencyMs ?? avgLatency ?? lastLatency,
            throughputPerMinute: overrides?.throughputPerMinute ?? Math.max(processed * 4, 1),
            utilization: overrides?.utilization ?? Math.min(processed / 20, 1),
            reliability: overrides?.reliability ??
                (processed > 0
                    ? Number((this.stats.successes / processed).toFixed(2))
                    : 1),
        };
        return telemetry;
    }
    async simulateWork(durationMs) {
        await new Promise((resolve) => setTimeout(resolve, durationMs));
    }
}
exports.BaseModule = BaseModule;
