import {
  AdaptiveAccessController,
  AdversaryEmulationSuite,
  AssetExposureInventory,
  BuildArtifact,
  ForwardDefenseOrchestrator,
  PrivacyGuard,
  SessionRiskSignal,
  SignalFusionEngine,
  SupplyChainIntegrityManager,
  TelemetrySignal,
  ThreatActorProfile,
} from '../src/security/ForwardDefenseOrchestrator';

describe('ForwardDefenseOrchestrator epics 7-12 implementation', () => {
  test('signal fusion correlates TTPs, builds graph, prioritizes alerts, and feeds SOAR', () => {
    const orchestrator = new ForwardDefenseOrchestrator();
    const signals: TelemetrySignal[] = [
      {
        id: 'sig-1',
        source: 'EDR',
        entityType: 'SESSION',
        entityId: 'User-1',
        ttp: 'T1059',
        severity: 'HIGH',
        attributes: { campaign: 'alpha' },
        timestamp: new Date(),
      },
      {
        id: 'sig-2',
        source: 'CLOUD',
        entityType: 'ASSET',
        entityId: 'Asset-9',
        ttp: 'T1059',
        severity: 'MEDIUM',
        attributes: { campaign: 'alpha' },
        timestamp: new Date(),
      },
      {
        id: 'sig-3',
        source: 'IAM',
        entityType: 'USER',
        entityId: 'User-1',
        ttp: 'T1078',
        severity: 'CRITICAL',
        attributes: { campaign: 'bravo' },
        timestamp: new Date(),
      },
    ];

    orchestrator.fusion.addGraphEdges([
      { from: 'user-1', to: 'asset-9', type: 'IDENTITY' },
      { from: 'asset-9', to: 'network-1', type: 'NETWORK' },
    ]);

    const correlations = orchestrator.fusion.correlateTtpSignals(['T1059', 'T1078'], signals);
    const graph = orchestrator.fusion.buildTrailGraph(signals);
    const alerts = orchestrator.fusion.prioritizeAlerts(correlations, graph);
    const dashboard = orchestrator.fusion.buildDashboard(alerts);
    const soarMessages = orchestrator.soar.drain();

    expect(correlations.get('T1059')?.length).toBe(2);
    expect(graph.size).toBeGreaterThan(0);
    expect(alerts[0].priority).toBeGreaterThan(alerts[alerts.length - 1].priority);
    expect(dashboard.sessions['user-1']).toBeDefined();
    expect(soarMessages.some((msg) => msg.type === 'CORRELATED_THREAT')).toBe(true);
  });

  test('adversary emulation executes chains, patches gaps, and records registry entries', () => {
    const orchestrator = new ForwardDefenseOrchestrator();
    const actors: ThreatActorProfile[] = [
      {
        name: 'ActorA',
        region: 'EU',
        vertical: 'Finance',
        attackChains: ['T1059', 'T1078'],
        techniques: ['T1003'],
      },
      {
        name: 'ActorB',
        region: 'US',
        vertical: 'Energy',
        attackChains: ['T1027'],
        techniques: ['T1047'],
      },
    ];

    const topActors = orchestrator.emulation.selectTopActors(actors);
    const chain = orchestrator.emulation.buildEmulationChain(topActors[0]);
    const result = orchestrator.emulation.executeSimulation(chain, topActors[0]);
    const patched = orchestrator.emulation.patchDetectionGaps(result);
    const registry = orchestrator.emulation.recordSimulation(patched);
    const nextExercise = orchestrator.emulation.scheduleQuarterlyExercise(new Date('2024-01-01'));

    expect(topActors.length).toBe(2);
    expect(chain).toContain('T1059');
    expect(result.gaps.length).toBeLessThan(chain.length);
    expect(patched.gaps.length).toBe(0);
    expect(registry.id).toBeDefined();
    expect(nextExercise.getMonth()).toBe(3);
  });

  test('privacy guard classifies, masks, enforces opt-in, and builds exposure map', () => {
    const privacy = new PrivacyGuard();
    const classifications = privacy.classifyFields(['ssn', 'cardNumber', 'notes']);
    const enforced = privacy.enforcePolicies(
      { ssn: '123456789', cardNumber: '4111111111111111', notes: 'ok' },
      classifications,
    );
    const noisy = privacy.applyDifferentialPrivacy(100, 0.5);
    const token = privacy.tokenize('sensitive');
    const dashboards = privacy.inventoryDashboards([
      { id: 'dash-1', owner: 'alice', publicLink: true },
      { id: 'dash-2', owner: 'bob', publicLink: false },
    ]);
    const optIn = privacy.enforceOptIn(['exp-1', 'exp-2'], { 'exp-1': true, 'exp-2': false });
    const exposures = privacy.scanPublicExposures(['bucket-1', 'doc-1'], { 'bucket-1': true, 'doc-1': false });
    const exposureMap = privacy.buildExposureMap(exposures, dashboards);

    expect(classifications.find((c) => c.field === 'ssn')?.mask).toBe(true);
    expect(enforced.ssn).toContain('*');
    expect(noisy).not.toBe(100);
    expect(token.length).toBe(64);
    expect(dashboards.find((d) => d.id === 'dash-1')?.expiresAt).toBeDefined();
    expect(optIn).toEqual(['exp-1']);
    expect(exposureMap.some((entry) => entry.issues.length > 0)).toBe(true);
  });

  test('asset inventory scores exposure, handles drift, ttl enforcement, and misconfigurations', () => {
    const inventory = new AssetExposureInventory();
    const asset = inventory.upsertAsset({
      id: 'asset-1',
      type: 'CLOUD',
      sensitivity: 'HIGH',
      exposure: 'EXTERNAL',
      criticality: 5,
      owner: 'team-1',
      createdAt: new Date('2023-12-01'),
      ttlDays: 30,
      baselineConfig: { firewall: 'on', logging: 'enabled' },
      currentConfig: { firewall: 'off', logging: 'enabled' },
    });

    inventory.trackConfigDrift(asset.id, { firewall: 'off', logging: 'disabled' });
    const scores = inventory.scoreAssets();
    const removed = inventory.enforceTtl(new Date('2024-02-15'));
    inventory.monitorMisconfig({ assetId: asset.id, rule: 'S3PublicRead', detectedAt: new Date() });
    const dashboard = inventory.buildRiskDashboard();

    expect(scores[0].score).toBeGreaterThan(0);
    expect(removed).toContain('asset-1');
    expect(dashboard.misconfigurations.length).toBeGreaterThan(0);
  });

  test('supply chain manager enforces provenance, signing, sbom, alerts, gate, and rotation', () => {
    const orchestrator = new ForwardDefenseOrchestrator();
    const manager = orchestrator.supplyChain;
    const artifact: BuildArtifact = {
      id: 'artifact-1',
      component: 'api',
      provenanceLevel: 1,
      signed: false,
    };

    const signed = manager.signArtifact(artifact);
    const withSbom = manager.requireSbom(signed, 'sbom-hash');
    const diff = manager.diffSbom(['a@1.0.0'], ['a@1.0.0', 'b@2.0.0-rc.1']);
    const unsigned = manager.alertUnsignedArtifacts([withSbom, { ...artifact, signed: false, component: 'worker' }]);
    const gate = manager.evaluatePipelineGate(withSbom);
    const rotated = manager.rotateSecrets(withSbom, new Date('2024-02-01'));

    expect(manager.enforceProvenance({ ...withSbom, provenanceLevel: 2 })).toBe(true);
    expect(withSbom.signed).toBe(true);
    expect(diff.added).toContain('b@2.0.0-rc.1');
    expect(unsigned.some((art) => art.component === 'worker')).toBe(true);
    expect(gate.allowed).toBe(true);
    expect(rotated.lastRotatedSecret?.toISOString()).toContain('2024-02-01');
    expect(orchestrator.soar.drain().length).toBeGreaterThan(0);
  });

  test('adaptive access builds baselines, detects anomalies, applies controls, and feeds signals', () => {
    const controller = new AdaptiveAccessController(new ForwardDefenseOrchestrator().soar);
    const baselineSignals: SessionRiskSignal[] = [
      {
        sessionId: 'sess-1',
        userId: 'user-1',
        ipReputation: 10,
        geo: 'US',
        velocity: 1,
        method: 'password',
        timestamp: new Date('2024-01-01T10:00:00Z'),
      },
      {
        sessionId: 'sess-2',
        userId: 'user-1',
        ipReputation: 5,
        geo: 'US',
        velocity: 1,
        method: 'password',
        timestamp: new Date('2024-01-02T11:00:00Z'),
      },
    ];
    baselineSignals.forEach((signal) => controller.logSignal(signal));
    controller.buildBaselines();

    const riskySignal: SessionRiskSignal = {
      sessionId: 'sess-3',
      userId: 'user-1',
      ipReputation: 90,
      geo: 'DE',
      velocity: 10,
      method: 'oauth',
      timestamp: new Date('2024-01-03T22:00:00Z'),
    };

    const decision = controller.applyAdaptiveControls(riskySignal);
    const enrichedTelemetry = controller.feedIdentitySignals(riskySignal, [
      {
        id: 'telemetry-1',
        source: 'NDR',
        entityType: 'NETWORK',
        entityId: 'net-1',
        ttp: 'T1027',
        severity: 'MEDIUM',
        attributes: {},
        timestamp: new Date(),
      },
    ]);

    const dashboard = controller.buildDashboard([decision]);

    expect(decision.action).toBe('DENY');
    expect(enrichedTelemetry[0].attributes.userId).toBe('user-1');
    expect(dashboard.baselineCoverage).toBeGreaterThan(0);
  });
});
