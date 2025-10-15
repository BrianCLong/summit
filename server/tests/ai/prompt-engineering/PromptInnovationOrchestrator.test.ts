import { PromptInnovationOrchestrator } from '../../../src/ai/prompt-engineering/PromptInnovationOrchestrator';

describe('PromptInnovationOrchestrator', () => {
  const orchestrator = new PromptInnovationOrchestrator();

  const blueprint = orchestrator.buildBlueprint({
    objective: 'Stabilize incident response summarization across global operations.',
    successCriteria: ['Precision >= 0.92', 'Latency <= 1.2s'],
    riskLevel: 'high',
    complianceRegimes: ['SOC2', 'HIPAA'],
    audience: {
      role: 'Global Response Commander',
      expertise: 'expert',
      locale: 'en-US',
    },
    knowledgeAssets: [
      { name: 'Incident Handbook', type: 'document', priority: 0.9 },
      { name: 'Global Runbooks', type: 'workflow', priority: 0.8 },
      { name: 'Knowledge Graph', type: 'graph', priority: 0.7 },
    ],
    guardrails: ['Never expose PHI', 'Honor classified data boundaries'],
    telemetry: {
      route: 'quality-orchestration',
      frequency: 'per-call',
      signals: ['capture:novelty-index', 'capture:prompt-regret', 'capture:citation-gap'],
    },
  });

  it('constructs a patent-grade blueprint with modules and counterfactual lattice', () => {
    expect(blueprint.modules.length).toBeGreaterThanOrEqual(5);
    const moduleNames = blueprint.modules.map(mod => mod.name);
    expect(moduleNames).toContain('Mission Canonicalization Grid');
    expect(blueprint.counterfactualLattice.length).toBeGreaterThanOrEqual(3);
    expect(blueprint.assurance.signature).toHaveLength(64);
    expect(blueprint.assurance.readinessScore).toBeGreaterThan(0.7);
  });

  it('synthesizes actionable prompt artifacts', () => {
    const artifact = orchestrator.synthesizePrompt(blueprint);
    expect(artifact.primaryPrompt).toContain('[Mission Objective]');
    expect(artifact.primaryPrompt).toContain('### Counterfactual Mesh');
    expect(artifact.diagnosticPrompt).toContain('telemetry sentinel signals');
    expect(artifact.blueprintSignature).toBe(blueprint.assurance.signature);
  });

  it('calculates assurance posture using live metrics', () => {
    const report = orchestrator.runAssurance(blueprint, {
      metrics: {
        accuracy: { mean: 0.68 },
        relevance: { mean: 0.81 },
        novelty: { mean: 0.78 },
      },
      sloCompliance: 0.82,
      historicalFindings: ['Previous drift detected'],
    });

    expect(report.riskScore).toBeGreaterThan(0.5);
    expect(report.highRiskMetric).toBe('accuracy');
    expect(report.recommendations.some(rec => rec.includes('counterfactual probes'))).toBe(true);
    expect(report.recommendations.some(rec => rec.includes(blueprint.assurance.signature.slice(0, 12)))).toBe(true);
  });

  it('produces lifecycle checklist for operationalization', () => {
    const checklist = orchestrator.generateLifecycleChecklist(blueprint);
    expect(checklist.length).toBeGreaterThanOrEqual(4);
    expect(checklist.some(item => item.includes('counterfactual lattice'))).toBe(true);
  });
});
