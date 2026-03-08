"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockLLM = void 0;
exports.generatorToReadable = generatorToReadable;
const node_stream_1 = require("node:stream");
// Example impl: replace with your real provider(s)
const llmBreaker_js_1 = require("./llmBreaker.js"); // New import
class MockLLM {
    // Original stream implementation
    async *_stream(input, signal) {
        const out = `I understand your query: ${input}`;
        for (const token of out.match(/.{1,8}/g) || []) {
            if (signal.aborted)
                return;
            await new Promise((r) => setTimeout(r, 10));
            yield token;
        }
    }
    // Wrapped stream with circuit breaker
    stream = (0, llmBreaker_js_1.wrapStream)(this._stream.bind(this));
}
exports.MockLLM = MockLLM;
// Helper: turn generator -> Node Readable (for tests or piping)
function generatorToReadable(gen) {
    const r = new node_stream_1.Readable({
        read() { },
        encoding: 'utf8',
    });
    (async () => {
        try {
            for await (const chunk of gen)
                r.push(chunk);
            r.push(null);
        }
        catch (e) {
            r.destroy(e);
        }
    })();
    return r;
}
