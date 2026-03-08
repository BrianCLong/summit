"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRsrAdapter = void 0;
const createRsrAdapter = (mapper) => ({
    evaluate(request) {
        const context = request.context ?? {};
        const result = mapper.evaluate(request.query, context);
        const allow = result.decision.action === 'allow' || result.decision.action === 'transform';
        return {
            router: 'RSR',
            intent: result.intent,
            confidence: Number(result.confidence.toFixed(4)),
            action: result.decision.action,
            allow,
            explanation: result.explanation.map((step) => ({
                ...step,
                details: step.details ? { ...step.details } : undefined,
            })),
            policy: {
                ...result.decision,
                obligations: result.decision.obligations ? [...result.decision.obligations] : undefined,
                transforms: result.decision.transforms ? [...result.decision.transforms] : undefined,
                redactFields: result.decision.redactFields ? [...result.decision.redactFields] : undefined,
            },
            correlationId: request.correlationId,
        };
    },
});
exports.createRsrAdapter = createRsrAdapter;
