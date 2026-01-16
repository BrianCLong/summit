import {
  ConfidenceReport,
  createEmptyVerificationSignals,
  EvidenceNoiseSignals,
  ProvenanceCoverage,
  RiskTier,
  VerificationSignals,
} from '../confidence/ConfidenceReport.js';
import {
  applyEvidenceNoiseCap,
  DEFAULT_EVIDENCE_CAP_CONFIG,
  EvidenceBundle,
  EvidenceCapConfig,
  scoreEvidenceNoise,
} from '../confidence/evidenceNoise.js';
import {
  applyCalibration,
  CalibrationParams,
  DEFAULT_CALIBRATION_PARAMS,
} from '../confidence/calibrator.js';
import { ToolType } from '../confidence/toolType.js';

const defaultNoiseSignals: EvidenceNoiseSignals = {
  source_agreement_score: 0,
  retrieval_entropy: 0,
  contradiction_count: 0,
  provenance_coverage: 0,
  recency_risk: 0.5,
  recency_known: false,
};

const defaultProvenance: ProvenanceCoverage = {
  coverage: 0,
  sources_with_provenance: 0,
  total_sources: 0,
};

export interface ConfidenceMiddlewareOptions {
  risk_tier: RiskTier;
  calibration_params?: CalibrationParams;
  evidence_cap_config?: EvidenceCapConfig;
  now?: Date;
}

export interface ConfidenceMiddleware {
  recordToolCall: (toolType: ToolType) => void;
  recordEvidenceBundle: (bundle: EvidenceBundle) => void;
  recordVerificationSignal: (signal: keyof VerificationSignals) => void;
  finalizeReport: (rawPCorrect: number, timestamp?: string) => ConfidenceReport;
}

export const createConfidenceMiddleware = (
  options: ConfidenceMiddlewareOptions,
): ConfidenceMiddleware => {
  const toolTypes = new Set<ToolType>();
  let noiseSignals = { ...defaultNoiseSignals };
  let provenanceCoverage = { ...defaultProvenance };
  let contradictionCount = 0;
  const verificationSignals = createEmptyVerificationSignals();
  const notes: string[] = [];

  const now = options.now ?? new Date();

  return {
    recordToolCall: (toolType) => {
      toolTypes.add(toolType);
    },
    recordEvidenceBundle: (bundle) => {
      const scored = scoreEvidenceNoise(bundle, now);
      noiseSignals = scored.noise;
      provenanceCoverage = scored.provenance;
      contradictionCount = scored.noise.contradiction_count;
    },
    recordVerificationSignal: (signal) => {
      verificationSignals[signal] += 1;
    },
    finalizeReport: (rawPCorrect, timestamp = new Date().toISOString()) => {
      const toolTypesUsed =
        toolTypes.size > 0 ? Array.from(toolTypes) : ['HUMAN'];
      const calibrated = applyCalibration(
        rawPCorrect,
        toolTypesUsed,
        options.calibration_params ?? DEFAULT_CALIBRATION_PARAMS,
      );

      const capResult = applyEvidenceNoiseCap(
        calibrated,
        toolTypesUsed,
        noiseSignals,
        verificationSignals,
        options.evidence_cap_config ?? DEFAULT_EVIDENCE_CAP_CONFIG,
      );

      notes.push(...capResult.notes);

      if (
        (options.risk_tier === 'high' || options.risk_tier === 'critical') &&
        Object.values(verificationSignals).every((value) => value === 0)
      ) {
        notes.push(
          'High-risk action without verification: require approval or verification gate.',
        );
      }

      return {
        p_correct: capResult.p_correct,
        tool_types_used: toolTypesUsed,
        noise_signals: noiseSignals,
        verification_signals: verificationSignals,
        contradiction_count: contradictionCount,
        provenance_coverage: provenanceCoverage,
        risk_tier: options.risk_tier,
        notes: [...notes],
        timestamp,
      };
    },
  };
};
