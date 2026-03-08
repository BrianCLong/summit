import { projectAssessmentGraph } from '../graph_projection';

describe('graph projection', () => {
  it('projects indicator and evidence nodes', () => {
    const graph = projectAssessmentGraph({
      case_id: 'CASE-1',
      context: 'general',
      risk_score: 0.5,
      risk_level: 'ELEVATED',
      confidence: 0.8,
      score_breakdown: {
        base: 1,
        context_prior: 1,
        interaction_bonus: 1,
        protective_suppression: 0,
        uncertainty_penalty: 0,
      },
      triggered_indicators: ['TA_COMM_001'],
      contributing_factors: ['threat_communications'],
      suppressing_factors: [],
      evidence_ids: ['EVID:mosaic-threat-model:MSG:001'],
      recommendations: ['analyst_escalation'],
    });

    expect(graph.nodes.find((n) => n.label === 'Indicator')).toBeDefined();
    expect(graph.edges.find((e) => e.type === 'SUPPORTED_BY')).toBeDefined();
  });
});
