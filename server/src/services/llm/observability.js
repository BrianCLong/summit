"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleObservability = void 0;
class ConsoleObservability {
    logLLMCall(request, result, durationMs) {
        console.log(JSON.stringify({
            event: 'llm_call',
            request: { ...request, prompt: request.prompt ? request.prompt.substring(0, 50) + '...' : undefined }, // Truncate prompt for logs
            result: { ...result, text: result.text ? result.text.substring(0, 50) + '...' : undefined },
            durationMs,
            timestamp: new Date().toISOString()
        }));
    }
    recordMetric(name, value, tags) {
        // Stub for metrics
        // console.log(`METRIC: ${name} = ${value}`, tags);
    }
}
exports.ConsoleObservability = ConsoleObservability;
