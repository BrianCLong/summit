import { Readable } from 'node:stream';

export interface LLMClient {
  stream(input: string, signal: AbortSignal): AsyncGenerator<string>;
}

// Example impl: replace with your real provider(s)
import { wrapStream } from './llmBreaker'; // New import

export class MockLLM implements LLMClient {
  // Original stream implementation
  private async *_stream(
    input: string,
    signal: AbortSignal,
  ): AsyncGenerator<string> {
    const out = `I understand your query: ${input}`;
    for (const token of out.match(/.{1,8}/g) || []) {
      if (signal.aborted) return;
      await new Promise((r) => setTimeout(r, 10));
      yield token;
    }
  }

  // Wrapped stream with circuit breaker
  stream = wrapStream(this._stream);
}

// Helper: turn generator -> Node Readable (for tests or piping)
export function generatorToReadable(gen: AsyncGenerator<string>): Readable {
  const r = new Readable({
    read() {},
    encoding: 'utf8',
  });
  (async () => {
    try {
      for await (const chunk of gen) r.push(chunk);
      r.push(null);
    } catch (e) {
      r.destroy(e as Error);
    }
  })();
  return r;
}
