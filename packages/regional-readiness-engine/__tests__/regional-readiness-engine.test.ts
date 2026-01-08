import {
  EvidenceExporter,
  RegionalDigitalTwin,
  ScreeningQualityLoop,
  evaluateLaunchGate,
  forwardLookingEnhancements,
  launchGateControls,
  localizationChecklist,
  nonNegotiables,
  procurementChecklist,
  regionCriteria,
  regulatoryRequirements,
  runTabletopExercises,
  subprocessorAvailability,
  tabletopScenarios,
} from "../src/index.js";
import { ResidencyPolicyEngine } from "../src/residency.js";
import { SubprocessorRegistry } from "../src/subprocessors.js";
import { RegionId, ResidencyControlState, TabletopExerciseInputs } from "../src/types.js";

describe("regional readiness engine", () => {
  it("provides go/hold/no-go criteria for target regions", () => {
    const germany = regionCriteria.find((entry) => entry.regionId === "european-union-germany");
    expect(germany?.go).toContain("GDPR Article 28 DPA + SCCs in place");
    expect(germany?.noGo).toContain("Missing DSAR automation");

    const singapore = regionCriteria.find((entry) => entry.regionId === "singapore");
    expect(singapore?.hold).toContain("Regional backups unverified");
  });

  it("enforces residency with default deny for cross-region access and allows governed exceptions", () => {
    const engine = new ResidencyPolicyEngine();
    const controlState: ResidencyControlState = {
      residencyEnforced: true,
      kmsKeyId: "kms-eu",
      kmsRotationVerifiedAt: new Date("2024-12-01T00:00:00Z"),
      backupsVerified: true,
      egressAllowlist: ["united-states"],
    };
    engine.registerRegionControls("european-union-germany", controlState);
    engine.setTenantHomeRegion("tenant-1", "european-union-germany");

    const deny = engine.canAccess(
      "tenant-1",
      "european-union-germany",
      "singapore",
      "pii",
      "analytics"
    );
    expect(deny.allowed).toBe(false);
    expect(deny.reasons).toContain("Requested region is not in egress allowlist");

    engine.allowCrossBorderTransfer({
      tenantId: "tenant-1",
      fromRegion: "european-union-germany",
      toRegion: "united-states",
      dataClasses: ["pii"],
      purpose: "analytics",
      approvedBy: "legal",
    });

    const allowed = engine.canAccess(
      "tenant-1",
      "european-union-germany",
      "united-states",
      "pii",
      "analytics insights"
    );
    expect(allowed.allowed).toBe(true);
  });

  it("evaluates launch gate evidence against mandatory controls", () => {
    const evidence = evaluateLaunchGate({
      residency: {
        residencyEnforced: true,
        kmsKeyId: "kms-us",
        kmsRotationVerifiedAt: new Date(),
        backupsVerified: true,
        egressAllowlist: ["united-states"],
      },
      screeningLiveWithAuditTrails: true,
      exceptionRegistryExists: true,
      procurementPacketComplete: true,
      contractRidersVerified: true,
      taxReadinessVerified: true,
      localizationSmokeComplete: true,
      regionalSloDashboardsLive: true,
      loadTestsRun: true,
      failoverPostureLogged: true,
      supportRunbooksTested: true,
      helperServicesActive: false,
    });

    expect(evidence.ready).toBe(true);
    expect(evidence.failures).toEqual([]);
  });

  it("blocks missing launch evidence to prevent premature go-live", () => {
    const evidence = evaluateLaunchGate({
      residency: {
        residencyEnforced: false,
        backupsVerified: false,
        egressAllowlist: [],
      } as ResidencyControlState,
      screeningLiveWithAuditTrails: false,
      exceptionRegistryExists: false,
      procurementPacketComplete: false,
      contractRidersVerified: false,
      taxReadinessVerified: false,
      localizationSmokeComplete: false,
      regionalSloDashboardsLive: false,
      loadTestsRun: false,
      failoverPostureLogged: false,
      supportRunbooksTested: false,
    });

    expect(evidence.ready).toBe(false);
    expect(evidence.failures).toEqual(
      expect.arrayContaining([
        "residency is missing or false",
        "Residency enforcement must be validated",
        "Regional KMS key must be configured",
        "Regional backups/restores must be validated",
      ])
    );
  });

  it("maintains subprocessor availability map and enforces contracts", () => {
    const registry = new SubprocessorRegistry();
    subprocessorAvailability.forEach((entry) => registry.register(entry));

    expect(
      registry.isAllowed("global-messaging", "european-union-germany", "communication-metadata")
    ).toBe(true);
    expect(registry.isAllowed("global-messaging", "singapore", "communication-metadata")).toBe(
      false
    );
    expect(registry.getCustomerView("singapore")).toHaveLength(1);
  });

  it("runs tabletop exercises and returns actionable gaps", () => {
    const inputs: TabletopExerciseInputs = {
      evidencePackReady: true,
      incidentCommsTemplatesReady: false,
      failoverPlaybookTested: true,
      dsarWorkflowAutomated: false,
      escalationSlaMet: true,
    };

    const result = runTabletopExercises(inputs);
    expect(result.passed).toBe(false);
    expect(result.gaps).toEqual(
      expect.arrayContaining([
        "Incident communications templates are missing for the region",
        "DSAR workflow is not automated end-to-end",
      ])
    );
  });

  it("exports evidence-as-code artifacts per region", () => {
    const exporter = new EvidenceExporter();
    const now = new Date();
    const events = [
      {
        type: "residency",
        regionId: "united-states" as RegionId,
        timestamp: new Date(now.getTime() - 1000),
        payload: { key: "kms-us" },
      },
      {
        type: "screening",
        regionId: "united-states" as RegionId,
        timestamp: now,
        payload: { cadence: "quarterly" },
      },
      {
        type: "residency",
        regionId: "united-states" as RegionId,
        timestamp: now,
        payload: { backups: "verified" },
      },
    ];

    const pack = exporter.buildEvidencePack(events, "united-states");
    expect(pack.events).toHaveLength(2);
    expect(pack.events.find((e) => e.type === "residency")?.payload).toEqual({
      backups: "verified",
    });
  });

  it("simulates residency vs availability tradeoffs with a regional digital twin", () => {
    const twin = new RegionalDigitalTwin();
    const result = twin.simulate("eu-failover", false, 0.8);
    expect(result.residencyRiskScore).toBeGreaterThan(0.1);
    expect(result.availabilityScore).toBeGreaterThan(0.7);
    expect(result.recommendation).toMatch(/controlled cross-region/);
  });

  it("adjusts screening thresholds when false negatives exceed limits", () => {
    const loop = new ScreeningQualityLoop(0.05);
    const result = loop.evaluate(10, 100);
    expect(result.falseNegativeRate).toBeCloseTo(0.1);
    expect(result.thresholdsAdjusted).toBe(true);
    expect(result.newThreshold).toBeLessThan(0.05);
  });

  it("exposes checklists and non-negotiables to block bespoke region forks", () => {
    expect(localizationChecklist.items).toContain(
      "Fallback behavior: missing strings fall back to English with telemetry"
    );
    expect(procurementChecklist.items).toContain(
      "Fast lane vs slow lane criteria with SLAs for legal/security review"
    );
    expect(launchGateControls).toContain(
      "Residency enforcement validated (storage, backups, keys, egress allowlists)"
    );
    expect(tabletopScenarios).toContain(
      "DSAR: intake → verification → retrieval → redaction → delivery within local timelines"
    );
    expect(nonNegotiables).toContain(
      "No bespoke forks or country-only code branches; everything behind configuration/feature flags"
    );
    expect(forwardLookingEnhancements).toContain(
      "Automated screening quality loop: quarterly false-negative audit feeding model retraining and rule updates"
    );
  });
});
