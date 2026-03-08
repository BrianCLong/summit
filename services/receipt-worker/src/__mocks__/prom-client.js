"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Registry = exports.Gauge = exports.Counter = void 0;
exports.collectDefaultMetrics = collectDefaultMetrics;
class Counter {
    _config;
    constructor(_config) {
        this._config = _config;
    }
    inc() {
        // no-op stub for metrics increment
    }
}
exports.Counter = Counter;
class Gauge {
    _config;
    value = 0;
    constructor(_config) {
        this._config = _config;
    }
    set(v) {
        this.value = v;
    }
    async get() {
        return { values: [{ value: this.value }] };
    }
}
exports.Gauge = Gauge;
class Registry {
    contentType = 'text/plain';
    async metrics() {
        return '# stub metrics';
    }
}
exports.Registry = Registry;
function collectDefaultMetrics(_opts) {
    // no-op stub for default metric collection
}
