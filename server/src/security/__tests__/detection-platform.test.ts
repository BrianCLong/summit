import {
  ControlEffectivenessAnalyzer,
  DetectionRuleRegistry,
  DetectionScenario,
  DetectionScenarioValidator,
  PurpleTeamRunbook,
  ThreatHuntingAnalytics,
} from '../detection-platform';

describe('Defensive detection platform', () => {
  const baseRule = {
    id: 'rule-edr-suspicious-token',
    name: 'Suspicious access token creation',
    description: 'Detects unusual token minting aligned to ATT&CK T1552',
    severity: 'high' as const,
    detectionType: 'behavioral' as const,
    mitre: {
      tactic: 'credential-access',
      techniqueId: 'T1552',
      technique: 'Unsecured Credentials',
    },
    dataSources: ['auth_logs', 'iam'],
    detectionLogic: 'Detect spikes in token issuance with rare scopes',
    enabled: true,
    validationStatus: 'validated' as const,
    owner: 'blue-team@defender.io',
  };

  const endpointRule = {
    id: 'rule-endpoint-persistence',
    name: 'Persistence implant detection',
    description: 'Detects persistence attempts on endpoints',
    severity: 'critical' as const,
    detectionType: 'anomaly' as const,
    mitre: {
      tactic: 'persistence',
      techniqueId: 'T1053.005',
      technique: 'Scheduled Task/Job',
      subTechnique: 'Scheduled Task',
    },
    dataSources: ['edr', 'windows-event-logs'],
    detectionLogic: 'Flag new scheduled tasks created by untrusted processes',
    enabled: true,
    validationStatus: 'draft' as const,
  };

  const registry = new DetectionRuleRegistry([baseRule, endpointRule]);

  it('tracks MITRE coverage by tactic', () => {
    const coverage = registry.coverageByTactic();
    expect(coverage['credential-access'].techniques.has('T1552')).toBe(true);
    expect(coverage['persistence'].rules).toHaveLength(1);
  });

  it('validates scenarios with safe simulation guidance', () => {
    const validator = new DetectionScenarioValidator(registry);
    const scenario: DetectionScenario = {
      id: 'scenario-token-abuse',
      name: 'Token creation anomaly',
      description: 'Simulate a constrained, non-destructive token abuse',
      tactic: 'credential-access',
      techniqueId: 'T1552',
      expectedSignals: ['auth_logs', 'auditd'],
      validationChecks: ['ensure canary user only'],
      safetyLevel: 'controlled-production',
      safeguards: ['kill-switch'],
      hypothesis: 'Defender should alert on anomalous token minting',
    };

    const result = validator.validateScenario(scenario);

    expect(result.outcome).toBe('needs_tuning');
    expect(result.coverageGaps).toContain('auditd');
    expect(result.safeToExecute).toBe(true);
    expect(result.recommendations).toContain(
      'Augment data sources to capture: auditd',
    );
  });

  it('highlights coverage gaps when no rule is mapped', () => {
    const validator = new DetectionScenarioValidator(registry);
    const scenario: DetectionScenario = {
      id: 'scenario-lateral-movement',
      name: 'Lateral movement pathing',
      description: 'Validates detection of lateral movement events',
      tactic: 'lateral-movement',
      techniqueId: 'T1021',
      expectedSignals: ['network'],
      validationChecks: ['use synthetic traffic only'],
      safetyLevel: 'lab',
      safeguards: ['segmented-lab'],
      hypothesis: 'Lateral movement should be blocked and detected',
    };

    const result = validator.validateScenario(scenario);

    expect(result.outcome).toBe('coverage_gap');
    expect(result.safeToExecute).toBe(true);
    expect(result.recommendations[0]).toContain('Add detection for T1021');
  });

  it('summarizes control effectiveness across scenarios', () => {
    const validator = new DetectionScenarioValidator(registry);
    const scenarios: DetectionScenario[] = [
      {
        id: 'scenario-endpoint-persistence',
        name: 'Endpoint persistence',
        description: 'Non-destructive scheduled task creation',
        tactic: 'persistence',
        techniqueId: 'T1053.005',
        expectedSignals: ['edr'],
        validationChecks: ['ensure rollback'],
        safetyLevel: 'canary',
        safeguards: ['snapshot'],
        hypothesis: 'EDR should alert on new scheduled task by unknown process',
      },
      {
        id: 'scenario-token-abuse',
        name: 'Token creation anomaly',
        description: 'Simulate a constrained, non-destructive token abuse',
        tactic: 'credential-access',
        techniqueId: 'T1552',
        expectedSignals: ['auth_logs', 'iam'],
        validationChecks: ['ensure canary user only'],
        safetyLevel: 'lab',
        safeguards: ['segmented-lab'],
        hypothesis: 'Defender should alert on anomalous token minting',
      },
    ];

    const results = validator.validateMany(scenarios);
    const analyzer = new ControlEffectivenessAnalyzer(registry);
    const report = analyzer.generateReport(results);

    expect(report.totalRules).toBe(2);
    expect(report.validatedRules).toBe(1);
    expect(report.coverageGaps).toHaveLength(0);
    expect(report.needsTuning).toContain('scenario-endpoint-persistence');
  });

  it('captures purple team collaboration updates', () => {
    const runbook = new PurpleTeamRunbook();
    runbook.addEntry({
      id: 'entry-1',
      title: 'Tune persistence detection',
      owner: 'purple-team',
      status: 'planned',
      updates: [],
      ruleId: endpointRule.id,
      scenarioId: 'scenario-endpoint-persistence',
      nextAction: 'Review telemetry gaps',
    });

    runbook.updateStatus('entry-1', 'in-progress');
    const updated = runbook.logUpdate(
      'entry-1',
      'analyst-a',
      'Added new telemetry sources for scheduled tasks',
    );

    expect(updated.status).toBe('in-progress');
    expect(updated.updates).toHaveLength(1);
    expect(runbook.list('in-progress')).toHaveLength(1);
  });

  it('produces threat hunting analytics for validation cycles', () => {
    const analytics = new ThreatHuntingAnalytics();
    analytics.recordSignal({
      techniqueId: 'T1552',
      severity: 'high',
      classification: 'true_positive',
      dwellTimeMinutes: 45,
    });
    analytics.recordSignal({
      techniqueId: 'T1053.005',
      severity: 'critical',
      classification: 'false_positive',
      dwellTimeMinutes: 15,
    });
    analytics.recordSignal({
      techniqueId: 'T1053.005',
      severity: 'critical',
      classification: 'true_positive',
    });

    const report = analytics.generateReport();

    expect(report.detectionVolumeBySeverity.critical).toBe(2);
    expect(report.falsePositiveRate).toBeCloseTo(33.33, 1);
    expect(report.techniquesByPrevalence[0]).toBe('T1053.005');
    expect(report.medianDwellTimeMinutes).toBe(30);
  });
});
