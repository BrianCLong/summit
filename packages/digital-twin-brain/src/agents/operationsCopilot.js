"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationsCopilot = void 0;
class OperationsCopilot {
    diagnostics;
    optimizer;
    compliance;
    onlineLearner;
    constructor(diagnostics, optimizer, compliance, onlineLearner) {
        this.diagnostics = diagnostics;
        this.optimizer = optimizer;
        this.compliance = compliance;
        this.onlineLearner = onlineLearner;
    }
    triage(assetId, modality, candidateActions, state) {
        const drift = this.onlineLearner.detectDrift(assetId, modality);
        const anomaly = this.diagnostics.detect(assetId, modality);
        const optimizations = this.optimizer.search(assetId, candidateActions, state);
        const top = optimizations[0];
        if (!top) {
            return {
                summary: 'No viable optimizations available under current constraints.',
                diagnostics: anomaly?.factors,
                drift,
            };
        }
        const complianceResult = this.compliance.evaluate(top.proposal);
        const summaryParts = [`Top action: ${top.proposal.description}`];
        if (complianceResult.violations.length > 0) {
            summaryParts.push(`Blocked by ${complianceResult.violations.length} compliance rules.`);
        }
        else {
            summaryParts.push('Compliant with all policies.');
        }
        if (anomaly)
            summaryParts.push(`Detected anomaly score ${(anomaly.score * 100).toFixed(1)}%.`);
        if (drift)
            summaryParts.push(drift.reason);
        return {
            summary: summaryParts.join(' '),
            diagnostics: anomaly?.factors,
            proposalId: top.proposal.id,
            drift,
        };
    }
}
exports.OperationsCopilot = OperationsCopilot;
