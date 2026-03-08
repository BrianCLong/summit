"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardrailEngine = void 0;
class GuardrailEngine {
    guardrails = [];
    register(guardrail) {
        this.guardrails.push(guardrail);
    }
    list() {
        return [...this.guardrails];
    }
    async evaluate(input, decision) {
        const results = [];
        for (const guardrail of this.guardrails) {
            try {
                const result = await guardrail.evaluate({ ...input, guardrailId: guardrail.id });
                results.push({
                    id: guardrail.id,
                    description: guardrail.description,
                    passed: result.passed,
                    severity: result.severity,
                    reason: result.reason,
                    recommendations: result.recommendations ?? [],
                    metadata: result.metadata ?? {},
                    assetId: decision.assetId,
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'unknown guardrail failure';
                results.push({
                    id: guardrail.id,
                    description: guardrail.description,
                    passed: false,
                    severity: 'block',
                    reason: 'guardrail evaluation failed',
                    recommendations: ['verify guardrail configuration and dependencies'],
                    metadata: { error },
                    assetId: decision.assetId,
                    error: errorMessage,
                });
            }
        }
        const blocking = results.filter((result) => !result.passed && result.severity === 'block');
        const warnings = results.filter((result) => !result.passed && result.severity === 'warn');
        const errors = results.filter((result) => Boolean(result.error));
        return {
            decision,
            results,
            blocked: blocking.length > 0,
            warnings,
            errors,
        };
    }
}
exports.GuardrailEngine = GuardrailEngine;
