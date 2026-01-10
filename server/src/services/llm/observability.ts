
import { LLMRequest, LLMResult } from './interfaces.js';

export interface Observability {
    logLLMCall(request: LLMRequest, result: LLMResult, durationMs: number): void;
    recordMetric(name: string, value: number, tags: Record<string, string>): void;
}

export class ConsoleObservability implements Observability {
    logLLMCall(request: LLMRequest, result: LLMResult, durationMs: number): void {
        console.log(JSON.stringify({
            event: 'llm_call',
            request: { ...request, prompt: request.prompt ? request.prompt.substring(0, 50) + '...' : undefined }, // Truncate prompt for logs
            result: { ...result, text: result.text ? result.text.substring(0, 50) + '...' : undefined },
            durationMs,
            timestamp: new Date().toISOString()
        }));
    }

    recordMetric(name: string, value: number, tags: Record<string, string>): void {
        // Stub for metrics
        // console.log(`METRIC: ${name} = ${value}`, tags);
    }
}
