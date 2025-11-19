import { createDiagnosticsTimeline, RingDiagnosticsTimeline } from './diagnostics.js';
import { createLogger, StructuredConsoleLogger } from './logger.js';
import { createMetricsRegistry, InMemoryMetricsRegistry } from './metrics.js';
import { loadConfig } from './config.js';
export class LiquidNanoRuntime {
    config;
    logger;
    metrics;
    diagnostics;
    plugins = new Map();
    started = false;
    constructor(options = {}) {
        this.config = options.config ?? loadConfig();
        this.logger = options.logger ?? createLogger(`runtime:${this.config.id}`);
        this.metrics = options.metrics ?? createMetricsRegistry();
        this.diagnostics = options.diagnostics ?? createDiagnosticsTimeline();
    }
    get context() {
        return {
            config: this.config,
            logger: this.logger,
            metrics: this.metrics,
            diagnostics: this.diagnostics
        };
    }
    async start() {
        if (this.started) {
            this.logger.warn('runtime already started');
            return;
        }
        this.logger.info('starting runtime', { config: this.config });
        this.metrics.recordGauge('runtime.plugins', this.plugins.size);
        for (const plugin of this.plugins.values()) {
            await plugin.onRegister?.(this.context);
        }
        this.started = true;
    }
    async shutdown() {
        if (!this.started) {
            return;
        }
        for (const plugin of this.plugins.values()) {
            await plugin.onShutdown?.(this.context);
        }
        this.started = false;
        this.logger.info('runtime shutdown complete');
    }
    registerPlugin(plugin) {
        if (this.plugins.has(plugin.name)) {
            throw new Error(`plugin ${plugin.name} already registered`);
        }
        if (!this.config.security.allowDynamicPlugins && this.started) {
            throw new Error('cannot register plugins while runtime is running');
        }
        this.plugins.set(plugin.name, plugin);
        this.metrics.recordGauge('runtime.plugins', this.plugins.size);
    }
    listPlugins() {
        return [...this.plugins.keys()];
    }
    async emit(event) {
        if (!this.started) {
            throw new Error('runtime must be started before emitting events');
        }
        const eventStart = Date.now();
        const record = (status, pluginName, error) => {
            const duration = Date.now() - eventStart;
            const entry = {
                event,
                emittedAt: new Date(eventStart).toISOString(),
                durationMs: duration,
                status,
                ...(pluginName ? { plugin: pluginName } : {}),
                ...(error instanceof Error ? { error: error.message } : {})
            };
            this.diagnostics.push(entry);
        };
        this.metrics.recordCounter('runtime.events.total');
        const applicable = [...this.plugins.values()].filter((plugin) => plugin.supportsEvent(event));
        if (applicable.length === 0) {
            this.logger.warn('no plugin handled event', { eventType: event.type });
            record('queued');
            return;
        }
        for (const plugin of applicable) {
            const pluginStart = Date.now();
            try {
                await plugin.onEvent(event, this.context);
                const duration = Date.now() - pluginStart;
                this.metrics.recordDuration(`plugin.${plugin.name}.duration`, duration);
                this.metrics.recordCounter(`plugin.${plugin.name}.processed`);
                record('processed', plugin.name);
            }
            catch (error) {
                this.metrics.recordCounter(`plugin.${plugin.name}.failed`);
                this.logger.error('plugin failed handling event', {
                    plugin: plugin.name,
                    eventType: event.type,
                    error
                });
                record('failed', plugin.name, error);
                if (this.config.security.validateSignatures) {
                    throw error;
                }
            }
        }
    }
    flushDiagnostics() {
        return this.diagnostics.last(50).slice();
    }
    snapshot() {
        return this.metrics.snapshot();
    }
}
export function createRuntime(options = {}) {
    return new LiquidNanoRuntime(options);
}
export { InMemoryMetricsRegistry, RingDiagnosticsTimeline, StructuredConsoleLogger };
