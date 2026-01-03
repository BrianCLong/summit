import { z } from 'zod';
import type { ToolCallResult } from './types.js';

const calcSchema = z.object({ expression: z.string() });
const lookupSchema = z.object({ term: z.string(), corpus: z.array(z.string()).optional() });

export type ToolName = 'calc' | 'lookup' | 'http_fetch';

export interface ToolRouterOptions {
  enableHttpFetch?: boolean;
}

export class ToolRouter {
  private readonly enableHttpFetch: boolean;

  constructor(options: ToolRouterOptions = {}) {
    this.enableHttpFetch = options.enableHttpFetch ?? false;
  }

  async route(name: ToolName, input: unknown): Promise<ToolCallResult> {
    if (name === 'http_fetch' && !this.enableHttpFetch) {
      throw new Error('http_fetch is disabled by policy');
    }
    switch (name) {
      case 'calc':
        return { name, input, output: this.safeEval(calcSchema.parse(input).expression) };
      case 'lookup': {
        const parsed = lookupSchema.parse(input);
        const corpus = parsed.corpus ?? [];
        const match = corpus.find((item) => item.toLowerCase().includes(parsed.term.toLowerCase()));
        return { name, input, output: match ?? 'not-found' };
      }
      case 'http_fetch':
        return { name, input, output: 'disabled' };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private safeEval(expression: string): number {
    if (!/^[-+*/() 0-9.]+$/.test(expression)) {
      throw new Error('Invalid expression');
    }
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${expression})`);
    return Number(fn());
  }
}

