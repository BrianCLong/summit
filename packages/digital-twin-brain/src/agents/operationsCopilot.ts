import { DiagnosticsAgent } from './diagnosticsAgent.js';
import { OptimizationAgent } from './optimizationAgent.js';
import { ComplianceAgent } from './complianceAgent.js';
import { DriftSignal, Modality } from '../core/types.js';
import { OnlineLearner } from '../core/onlineLearner.js';

export interface Recommendation {
  summary: string;
  diagnostics?: string[];
  proposalId?: string;
  drift?: DriftSignal | null;
}

export class OperationsCopilot {
  constructor(
    private readonly diagnostics: DiagnosticsAgent,
    private readonly optimizer: OptimizationAgent,
    private readonly compliance: ComplianceAgent,
    private readonly onlineLearner: OnlineLearner
  ) {}

  triage(assetId: string, modality: Modality, candidateActions: Record<string, unknown>[], state: Record<string, number>): Recommendation {
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
    } else {
      summaryParts.push('Compliant with all policies.');
    }
    if (anomaly) summaryParts.push(`Detected anomaly score ${(anomaly.score * 100).toFixed(1)}%.`);
    if (drift) summaryParts.push(drift.reason);

    return {
      summary: summaryParts.join(' '),
      diagnostics: anomaly?.factors,
      proposalId: top.proposal.id,
      drift,
    };
  }
}
