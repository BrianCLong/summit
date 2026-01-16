import { ConfidenceReport } from './ConfidenceReport.js';
import { ToolType } from './toolType.js';
import { createConfidenceMiddleware } from '../middleware/confidenceMiddleware.js';
import { applyCalibration } from './calibrator.js';
import { EvidenceBundle } from './evidenceNoise.js';

export interface CalibrationScenarioInput {
  id: string;
  description: string;
  tool_types: ToolType[];
  raw_p_correct: number;
  evidence_bundle?: EvidenceBundle;
  verification_signals?: Array<keyof ConfidenceReport['verification_signals']>;
}

export interface CalibrationScenarioResult {
  id: string;
  description: string;
  tool_types: ToolType[];
  raw_p_correct: number;
  calibrated_p_correct: number;
  final_p_correct: number;
  cap_applied: boolean;
  notes: string[];
  report: ConfidenceReport;
}

export interface CalibrationReport {
  generated_at: string;
  scenarios: CalibrationScenarioResult[];
  summary: {
    total: number;
    capped: number;
    evidence_scenarios: number;
    verification_scenarios: number;
  };
}

const buildScenario = (
  input: CalibrationScenarioInput,
  now: Date,
): CalibrationScenarioResult => {
  const middleware = createConfidenceMiddleware({
    risk_tier: 'medium',
    now,
  });

  input.tool_types.forEach((toolType) => middleware.recordToolCall(toolType));
  if (input.evidence_bundle) {
    middleware.recordEvidenceBundle(input.evidence_bundle);
  }
  input.verification_signals?.forEach((signal) =>
    middleware.recordVerificationSignal(signal),
  );

  const report = middleware.finalizeReport(
    input.raw_p_correct,
    now.toISOString(),
  );

  const calibrated = applyCalibration(input.raw_p_correct, input.tool_types);

  const capApplied = report.notes.some((note) => note.includes('capped'));

  return {
    id: input.id,
    description: input.description,
    tool_types: input.tool_types,
    raw_p_correct: input.raw_p_correct,
    calibrated_p_correct: calibrated,
    final_p_correct: report.p_correct,
    cap_applied: capApplied,
    notes: report.notes,
    report,
  };
};

export const buildCalibrationReport = (now: Date = new Date()): CalibrationReport => {
  const scenarios: CalibrationScenarioInput[] = [
    {
      id: 'evidence-noise',
      description: 'Noisy evidence without verification triggers confidence cap.',
      tool_types: ['EVIDENCE'],
      raw_p_correct: 0.82,
      evidence_bundle: {
        items: [
          {
            url: 'https://source-a.example.com/article',
            snippet: 'Unconfirmed report with limited provenance.',
            retrievedAt: '2024-01-02T00:00:00Z',
          },
          {
            url: 'https://source-b.example.com/blog',
            snippet: 'Conflicting summary without citations.',
            retrievedAt: '2023-01-02T00:00:00Z',
            contradiction: true,
          },
          {
            sourceId: 'anonymous-feed',
            text: 'Unattributed claim.',
          },
        ],
        contradictions: ['source-a vs source-b'],
      },
    },
    {
      id: 'verification-check',
      description: 'Verification tool emits explicit failure signals.',
      tool_types: ['VERIFICATION'],
      raw_p_correct: 0.42,
      verification_signals: ['exec_error', 'assertion_fail'],
    },
  ];

  const results = scenarios.map((scenario) => buildScenario(scenario, now));

  const summary = {
    total: results.length,
    capped: results.filter((result) => result.cap_applied).length,
    evidence_scenarios: results.filter((result) =>
      result.tool_types.includes('EVIDENCE'),
    ).length,
    verification_scenarios: results.filter((result) =>
      result.tool_types.includes('VERIFICATION'),
    ).length,
  };

  return {
    generated_at: now.toISOString(),
    scenarios: results,
    summary,
  };
};

export const renderCalibrationMarkdown = (report: CalibrationReport): string => {
  let md = '# Calibration Smoke Report\n\n';
  md += `**Generated:** ${report.generated_at}\n\n`;
  md += '## Summary\n\n';
  md += `- **Total scenarios:** ${report.summary.total}\n`;
  md += `- **Capped scenarios:** ${report.summary.capped}\n`;
  md += `- **Evidence scenarios:** ${report.summary.evidence_scenarios}\n`;
  md += `- **Verification scenarios:** ${report.summary.verification_scenarios}\n\n`;
  md += '## Scenarios\n\n';

  for (const scenario of report.scenarios) {
    md += `### ${scenario.id}\n\n`;
    md += `${scenario.description}\n\n`;
    md += `- **Tool types:** ${scenario.tool_types.join(', ')}\n`;
    md += `- **Raw p_correct:** ${scenario.raw_p_correct.toFixed(2)}\n`;
    md += `- **Final p_correct:** ${scenario.final_p_correct.toFixed(2)}\n`;
    md += `- **Cap applied:** ${scenario.cap_applied ? 'Yes' : 'No'}\n`;
    if (scenario.notes.length > 0) {
      md += `- **Notes:** ${scenario.notes.join(' ')}\n`;
    }
    md += '\n';
  }

  return md;
};
