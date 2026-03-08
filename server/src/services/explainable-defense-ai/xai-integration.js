"use strict";
/**
 * XAI Integration Bridge
 *
 * Bridges the ExplainableDefenseAI service with the existing XAI Overlay Service,
 * providing a unified explainability layer for all mission-critical decisions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.unifiedXAI = exports.UnifiedXAIService = void 0;
exports.convertTraceToExplanation = convertTraceToExplanation;
exports.convertExplanationToTrace = convertExplanationToTrace;
exports.createChainNodeFromTrace = createChainNodeFromTrace;
const ExplainableDefenseAI_js_1 = require("../explainable-defense-ai/ExplainableDefenseAI.js");
/**
 * Converts XAI Overlay ReasoningTrace to Defense AI DecisionExplanation
 */
function convertTraceToExplanation(trace) {
    const reasoningSteps = trace.intermediateSteps.map((step, i) => ({
        id: `${trace.traceId}-step-${i}`,
        sequence: i + 1,
        operation: step.step,
        description: step.description,
        inputs: [],
        outputs: [typeof step.value === 'object' ? JSON.stringify(step.value) : String(step.value)],
        algorithm: trace.modelMetadata.modelName,
        parameters: trace.modelMetadata.parameters,
        confidenceIn: 1.0,
        confidenceOut: 1.0,
        duration_ms: 0,
        timestamp: trace.timestamp,
        humanReadable: step.description,
    }));
    const featureContributions = trace.saliencyExplanations.map((sal) => ({
        feature: sal.featureName,
        value: sal.featureValue,
        weight: sal.weight,
        contribution: sal.contribution,
        direction: sal.direction === 'increases_risk' ? 'positive' : sal.direction === 'decreases_risk' ? 'negative' : 'neutral',
        explanation: sal.humanReadable,
    }));
    const topFeatures = featureContributions
        .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
        .slice(0, 3);
    return {
        id: trace.traceId,
        decisionType: 'RISK_ASSESSMENT',
        outcome: JSON.stringify(trace.modelOutput),
        confidence: calculateConfidenceFromSaliency(trace.saliencyExplanations),
        reasoning: reasoningSteps,
        featureContributions,
        supportingEvidence: [],
        contraEvidence: [],
        alternativesConsidered: [],
        humanReadableSummary: `Risk assessment using ${trace.modelMetadata.modelName} v${trace.modelMetadata.modelVersion}. ` +
            `Key factors: ${topFeatures.map((f) => f.feature).join(', ')}.`,
        limitations: [],
        uncertaintyFactors: [],
    };
}
/**
 * Converts Defense AI DecisionExplanation to XAI Overlay format
 */
function convertExplanationToTrace(explanation) {
    const saliencyExplanations = explanation.featureContributions.map((fc) => ({
        featureName: fc.feature,
        featureValue: typeof fc.value === 'number' ? fc.value : 0,
        weight: fc.weight,
        contribution: fc.contribution,
        contributionPercent: fc.contribution * 100,
        direction: fc.direction === 'positive' ? 'increases_risk' : fc.direction === 'negative' ? 'decreases_risk' : 'neutral',
        importance: Math.abs(fc.contribution) > 0.3 ? 'critical' : Math.abs(fc.contribution) > 0.2 ? 'high' : Math.abs(fc.contribution) > 0.1 ? 'medium' : 'low',
        humanReadable: fc.explanation,
    }));
    return {
        traceId: explanation.id,
        modelOutput: explanation.outcome,
        saliencyExplanations,
        intermediateSteps: explanation.reasoning.map((step) => ({
            step: step.operation,
            description: step.humanReadable,
            value: step.outputs[0] || null,
        })),
        timestamp: new Date(),
    };
}
/**
 * Creates chain of trust node from XAI trace
 */
function createChainNodeFromTrace(trace, parentId) {
    return {
        id: trace.traceId,
        parentId: parentId || null,
        nodeType: 'ANALYZE',
        component: trace.modelMetadata.modelName,
        operation: `${trace.modelMetadata.modelType} analysis`,
        timestamp: trace.timestamp,
        inputHashes: [trace.inputSummary.inputHash],
        outputHash: trace.traceDigest,
        signature: trace.signature || '',
        attestation: {
            attesterId: trace.signatureMetadata?.notarizedBy?.[0] || 'xai-overlay',
            attesterType: 'SERVICE',
            statement: `Analysis completed by ${trace.modelMetadata.modelName}`,
            timestamp: trace.signatureMetadata?.signedAt || trace.timestamp,
            signature: trace.signatureMetadata?.hsmSignature || '',
        },
    };
}
function calculateConfidenceFromSaliency(saliency) {
    if (saliency.length === 0)
        return 0.5;
    const criticalCount = saliency.filter((s) => s.importance === 'critical').length;
    const highCount = saliency.filter((s) => s.importance === 'high').length;
    const totalContribution = saliency.reduce((sum, s) => sum + Math.abs(s.contribution), 0);
    // Higher confidence when more critical features contribute
    const importanceWeight = (criticalCount * 0.4 + highCount * 0.3) / saliency.length;
    const contributionWeight = Math.min(1, totalContribution);
    return Math.min(0.99, 0.5 + (importanceWeight * 0.25) + (contributionWeight * 0.25));
}
/**
 * Unified XAI Service combining both systems
 */
class UnifiedXAIService {
    defenseAI;
    constructor() {
        this.defenseAI = new ExplainableDefenseAI_js_1.ExplainableDefenseAI('unified-xai-service');
    }
    getDefenseAI() {
        return this.defenseAI;
    }
    /**
     * Wrap XAI Overlay trace with chain of trust
     */
    wrapTraceWithChainOfTrust(trace, productId) {
        const explanation = convertTraceToExplanation(trace);
        const chainNode = createChainNodeFromTrace(trace);
        return { explanation, chainNode };
    }
    /**
     * Generate combined audit for compliance
     */
    async generateComplianceAudit() {
        const manifest = this.defenseAI.exportAuditManifest();
        const summary = `Compliance audit generated at ${manifest.exportedAt.toISOString()}. ` +
            `${manifest.records.length} audit records with Merkle root: ${manifest.merkleRoot.substring(0, 16)}...`;
        return { auditManifest: manifest, summary };
    }
}
exports.UnifiedXAIService = UnifiedXAIService;
exports.unifiedXAI = new UnifiedXAIService();
exports.default = UnifiedXAIService;
