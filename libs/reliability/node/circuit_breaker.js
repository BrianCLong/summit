"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
const events_1 = __importDefault(require("events"));
const prom_client_1 = require("prom-client");
class CircuitBreaker extends events_1.default {
    options;
    failures = 0;
    state = 'closed';
    registry;
    stateGauge;
    latencyHist;
    errorsTotal;
    timer;
    constructor(options) {
        super();
        this.options = options;
        this.registry = new prom_client_1.Registry();
        (0, prom_client_1.collectDefaultMetrics)({ register: this.registry });
        this.stateGauge = new prom_client_1.Gauge({
            name: 'db_cb_state',
            help: 'Circuit breaker state (0=closed,1=open,2=half-open)',
            labelNames: ['service', 'store'],
            registers: [this.registry],
        });
        this.latencyHist = new prom_client_1.Histogram({
            name: 'db_query_latency_seconds',
            help: 'Latency histogram for DB calls',
            labelNames: ['store', 'op'],
            buckets: [0.01, 0.025, 0.05, 0.1, 0.15, 0.25, 0.5, 1, 2, 3],
            registers: [this.registry],
        });
        this.errorsTotal = new prom_client_1.Counter({
            name: 'db_errors_total',
            help: 'Total DB errors',
            labelNames: ['store', 'code'],
            registers: [this.registry],
        });
    }
    async execute(op, fn) {
        if (this.state === 'open') {
            this.errorsTotal.inc({ store: this.options.store, code: 'circuit_open' });
            throw new Error('Circuit breaker is open');
        }
        const start = process.hrtime.bigint();
        try {
            const result = await fn();
            this.recordLatency(op, start);
            this.reset();
            return result;
        }
        catch (err) {
            this.recordLatency(op, start);
            this.failures += 1;
            this.errorsTotal.inc({ store: this.options.store, code: 'operation_failed' });
            if (this.failures >= this.options.failureThreshold) {
                this.trip();
            }
            throw err;
        }
    }
    async withHalfOpen(fn) {
        if (this.state !== 'open')
            return this.execute('half_open_probe', fn);
        this.state = 'half-open';
        this.updateGauge();
        try {
            const result = await this.execute('half_open_probe', fn);
            this.reset();
            return result;
        }
        catch (err) {
            this.trip();
            throw err;
        }
    }
    recordLatency(op, start) {
        const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
        this.latencyHist.observe({ store: this.options.store, op }, durationSeconds);
    }
    trip() {
        if (this.state === 'open')
            return;
        this.state = 'open';
        this.updateGauge();
        this.emit('open');
        this.timer?.unref();
        this.timer = setTimeout(() => {
            this.state = 'half-open';
            this.updateGauge();
            this.emit('half-open');
        }, this.options.recoverySeconds * 1000);
    }
    reset() {
        this.failures = 0;
        if (this.state !== 'closed') {
            this.state = 'closed';
            this.updateGauge();
            this.emit('closed');
        }
    }
    updateGauge() {
        const stateValue = this.state === 'closed' ? 0 : this.state === 'open' ? 1 : 2;
        this.stateGauge.set({ service: this.options.service, store: this.options.store }, stateValue);
    }
    metrics() {
        return this.registry.metrics();
    }
}
exports.CircuitBreaker = CircuitBreaker;
