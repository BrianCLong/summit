import { Readable } from 'node:stream';
// Example impl: replace with your real provider(s)
import { wrapStream } from './llmBreaker'; // New import
export class MockLLM {
    constructor() {
        // Wrapped stream with circuit breaker
        this.stream = wrapStream(this._stream);
    }
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
}
// Helper: turn generator -> Node Readable (for tests or piping)
export function generatorToReadable(gen) {
    const r = new Readable({
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
//# sourceMappingURL=llm.js.map