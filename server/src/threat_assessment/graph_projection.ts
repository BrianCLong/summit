import { GraphProjection, ThreatAssessmentResult } from './types';

export function projectAssessmentGraph(
  assessment: ThreatAssessmentResult,
): GraphProjection {
  const assessmentNodeId = `assessment:${assessment.case_id}`;
  const caseNodeId = `case:${assessment.case_id}`;
  const nodes = [
    {
      id: caseNodeId,
      label: 'ThreatCase',
      properties: { case_id: assessment.case_id, context: assessment.context },
    },
    {
      id: assessmentNodeId,
      label: 'Assessment',
      properties: {
        risk_level: assessment.risk_level,
        risk_score: assessment.risk_score,
        confidence: assessment.confidence,
      },
    },
  ];

  const edges = [{ from: assessmentNodeId, to: caseNodeId, type: 'FOR_CASE' }];

  for (const indicator of assessment.triggered_indicators) {
    const id = `indicator:${indicator}`;
    nodes.push({ id, label: 'Indicator', properties: { indicator_id: indicator } });
    edges.push({ from: assessmentNodeId, to: id, type: 'TRIGGERED' });
  }

  for (const evidenceId of assessment.evidence_ids) {
    const id = `evidence:${evidenceId}`;
    nodes.push({ id, label: 'Evidence', properties: { evidence_id: evidenceId } });
    edges.push({ from: assessmentNodeId, to: id, type: 'SUPPORTED_BY' });
  }

  return { nodes, edges };
}
