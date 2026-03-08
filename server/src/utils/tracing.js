"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpanImpl = exports.tracer = void 0;
class NoopSpan {
    name;
    constructor(name) {
        this.name = name;
    }
    setAttributes(_attributes) { }
    setAttribute(_key, _value) { }
    recordException(_error) { }
    end() { }
}
exports.SpanImpl = NoopSpan;
/**
 * A lightweight tracer utility for instrumenting code blocks.
 *
 * Currently implements a No-Op strategy but can be extended to support real tracing.
 */
exports.tracer = {
    /**
     * Starts a new active span and executes the provided handler.
     *
     * @typeParam T - The return type of the handler.
     * @param name - The name of the span.
     * @param handler - A function that receives the span and performs the work.
     * @returns The result of the handler.
     */
    async startActiveSpan(name, handler) {
        const span = new NoopSpan(name);
        try {
            return await handler(span);
        }
        catch (error) {
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    },
};
