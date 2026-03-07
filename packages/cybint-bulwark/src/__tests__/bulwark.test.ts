import {
  DetectionEngineeringService,
  GovernanceGuardrails,
  IdentityTripwireFramework,
  InfrastructureHygieneManager,
  RapidResponseModernizer,
  TelemetryLake,
  TelemetryUnifier,
  type DetectionRule,
  type RawTelemetryEvent,
  type TelemetrySource,
} from "../index";

describe("BULWARK implementation", () => {
  const telemetrySources: TelemetrySource[] = [
    {
      id: "edr-1",
      domain: "EDR",
      retentionDays: 30,
      sensitivity: "CONFIDENTIAL",
      minimalFields: ["host", "user", "event"],
      freshnessSloMinutes: 15,
      classificationTags: ["h1"],
    },
    {
      id: "ndr-1",
      domain: "NDR",
      retentionDays: 14,
      sensitivity: "SECRET",
      minimalFields: ["src", "dst", "bytes"],
      freshnessSloMinutes: 10,
    },
  ];

  const buildTelemetry = () => {
    const lake = new TelemetryLake([
      { name: "confidential", allowedSensitivities: ["CONFIDENTIAL"] },
      { name: "secret", allowedSensitivities: ["SECRET"] },
    ]);
    const unifier = new TelemetryUnifier(lake);
    telemetrySources.forEach((source) => unifier.inventorySource(source));
    return { lake, unifier };
  };

  it("normalizes telemetry, scores trust, and detects drift", () => {
    const { unifier, lake } = buildTelemetry();
    const normalized = unifier.normalize({
      sourceId: "edr-1",
      timestamp: new Date(),
      body: { host: "h1", user: "analyst", event: "proc_start" },
    });

    expect(normalized.classification).toContain("edr");
    expect(lake.getView("confidential")?.events).toHaveLength(1);

    const trust = unifier.buildTrustScore("edr-1", 0.9, 10, 10);
    expect(trust.overall).toBeGreaterThan(0.5);

    const drift = unifier.detectDrift({
      sourceId: "ndr-1",
      timestamp: new Date(),
      body: { src: "10.0.0.1" },
    } as RawTelemetryEvent);
    expect(drift).toEqual(expect.any(Array));
  });

  it("converts detections to sigma and validates synthetic traffic", () => {
    const { unifier } = buildTelemetry();
    const detections = new DetectionEngineeringService(unifier);
    const rule: DetectionRule = {
      id: "rule-1",
      name: "Impossible travel",
      legacyConditions: [
        { field: "user", operator: "equals", value: "analyst" },
        { field: "distance_km", operator: "gt", value: 8000 },
      ],
      telemetryDomains: ["IDP"],
      tactics: ["TA0001"],
      owner: "secops",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
      renewAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      riskToOrg: 0.8,
      detectionGap: 0.7,
    };

    const sigma = detections.convertToSigma(rule);
    expect(sigma).toContain("Impossible travel");
    expect(sigma).toContain("TA0001");

    const synthetic: RawTelemetryEvent[] = [
      {
        sourceId: "edr-1",
        timestamp: new Date(),
        body: { user: "analyst", distance_km: 10000, expectedAlert: true },
      },
      {
        sourceId: "edr-1",
        timestamp: new Date(),
        body: { user: "analyst", distance_km: 1, expectedAlert: false },
      },
    ];

    const validation = detections.validateWithSyntheticData(rule, synthetic);
    expect(validation.triggered).toBeGreaterThan(0);
    expect(validation.falseNegatives).toBe(0);
  });

  it("chains evidence and enforces containment-first playbooks", () => {
    const responder = new RapidResponseModernizer();
    responder.createPlaybook("malware", [
      { name: "isolate", command: "edr.isolate", containmentFirst: true },
      { name: "collect-hash", command: "edr.hash", containmentFirst: false },
    ]);

    const executed = responder.execute("malware", "asset-1");
    expect(executed.find((a) => a.containmentFirst)).toBeDefined();

    const entry = responder.appendEvidence("isolate", "analyst", { asset: "asset-1" });
    expect(entry.hash).toHaveLength(64);
    expect(responder.verifyChainOfCustody()).toBe(true);
  });

  it("scores identity tripwires and raises honeytoken risk", () => {
    const identity = new IdentityTripwireFramework();
    identity.registerAccount({
      id: "svc-email",
      roles: ["service"],
      mfaEnforced: true,
      conditionalAccess: true,
      privileges: ["read"],
    });
    identity.insertHoneytoken("svc-email");

    const logged = identity.logEvent({
      actor: "svc-email",
      action: "admin-elevation",
      resource: "mailbox",
      justification: "",
      location: "untrusted",
    });

    expect(logged.honeytoken).toBe(true);
    expect(identity.riskBasedSessionScore("svc-email")).toBeGreaterThan(0.9);
  });

  it("enforces infra hygiene and governance guardrails", () => {
    const infra = new InfrastructureHygieneManager();
    infra.registerAsset({
      id: "web-1",
      environment: "test",
      exposedPorts: [80, 443],
      expiration: new Date(Date.now() - 1000),
      baselineConfig: { cis: "v1" },
      active: true,
    });

    expect(infra.scanExpirations()).toContain("web-1");
    expect(infra.enforceBaseline("web-1", { cis: "v2" })).toBe(true);
    expect(infra.inventorySecrets("secret_key = abcdefghijklmnop")).toHaveLength(1);
    expect(infra.verifyAttestation({ sbom: true, slsaLevel: 3, signatureValid: true })).toBe(true);

    const governance = new GovernanceGuardrails();
    governance.registerPolicy("deny-public-s3", (input) => input["public"] !== true);
    governance.mapRiskToControl("data-exposure", "deny-public-s3");
    governance.addException({
      id: "temp",
      control: "deny-public-s3",
      owner: "ciso",
      expiresAt: new Date(Date.now() - 1000),
      reason: "emergency",
    });

    const decisions = governance.evaluate({ public: false });
    expect(decisions[0].allowed).toBe(true);
    expect(governance.sweepExpired()).toContain("temp");
    const scoreboard = governance.controlScoreboard(0.9);
    expect(scoreboard.coverage).toBeGreaterThan(0);
  });
});
