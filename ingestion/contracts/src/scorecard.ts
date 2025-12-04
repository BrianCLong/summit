import { Scorecard, ValidationFinding } from './types.js';

export function buildScorecard(
  contractId: string,
  version: string,
  findings: ValidationFinding[],
  webhooksDelivered: number
): Scorecard {
  const critical = findings.filter((finding) => finding.severity === 'error').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;

  const completeness = Math.max(0, 100 - warnings * 10 - critical * 20);
  const safety = Math.max(0, 100 - critical * 25);
  const governance = 100 - warnings * 5;

  return {
    contractId,
    version,
    completeness,
    safety,
    governance,
    webhooksDelivered,
    findings
  };
}
