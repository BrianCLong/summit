import {
  AccessManager,
  BattlecardLibrary,
  BrandHygiene,
  BulkTooling,
  ChampionKit,
  ClaimLibrary,
  CollaborationGravity,
  CompetitiveCouncil,
  CompetitiveResponseTracker,
  CompatModeManager,
  CompetitorMatrix,
  DefamationPolicy,
  DeprecationManager,
  EntitlementEngine,
  EnterpriseControls,
  ErrorRemediation,
  FirstValuePackage,
  IPAudit,
  ImporterManager,
  IntegrationAdapterRegistry,
  InviteLoop,
  LatencyTracker,
  LegalReviewScheduler,
  MigrationOfferManager,
  MigrationValidator,
  MetricsTracker,
  NarrativeOps,
  OSSCompliance,
  PartnerAnalytics,
  PartnerCertification,
  PartnerProgram,
  PortabilityPlaybook,
  PricingExperimentManager,
  QuestionnaireAutomation,
  ReleaseCadenceTracker,
  RiskRegister,
  SBOMGate,
  SecretManager,
  StatusPage,
  SwitchCostInventory,
  SyntheticChecker,
  SLOManager,
  TeardownRepo,
  VendorRegister,
  VerbatimIntake,
  WinLossPipeline,
  WorkspaceManager,
  UsageDashboard,
} from "../src";

const DAYS = 24 * 60 * 60 * 1000;

describe("Competitive Execution Engine", () => {
  it("tracks competitor matrix freshness", () => {
    const matrix = new CompetitorMatrix();
    matrix.addOrUpdate({
      name: "RivalOne",
      features: ["feature-a"],
      pricing: ["tiered"],
      packaging: ["bundle"],
      segments: ["enterprise"],
      claims: ["fast"],
      proofPoints: ["case-study"],
      verificationStatus: "verified",
      updatedAt: new Date(Date.now() - 10 * DAYS),
    });
    expect(matrix.staleProfiles().map((p) => p.name)).toContain("RivalOne");
  });

  it("enforces mandatory win/loss fields and review cadence", () => {
    const pipeline = new WinLossPipeline();
    const deal = pipeline.addDeal({
      id: "deal-1",
      competitor: "RivalOne",
      segment: "public-sector",
      useCase: "intel",
      objection: "price",
      reasonCodes: ["budget"],
      tags: ["claim-1"],
    });
    pipeline.markReviewed(deal.id, new Date(Date.now() - 8 * DAYS));
    expect(pipeline.dealsNeedingReview().map((d) => d.id)).toContain(deal.id);
  });

  it("blocks hearsay and redacts PII in verbatims", () => {
    const intake = new VerbatimIntake();
    const verbatim = intake.submit({
      id: "v1",
      customer: "ACME",
      text: "User email john@example.com reported success",
      sourceType: "first-party",
    });
    expect(verbatim.anonymizedText).not.toContain("john@example.com");
    expect(() =>
      intake.submit({
        id: "v2",
        customer: "ACME",
        text: "hearsay",
        sourceType: "hearsay",
      })
    ).toThrow("Hearsay is not accepted");
  });

  it("rejects speculative claims and tracks reverification needs", () => {
    const claims = new ClaimLibrary();
    claims.addClaim({
      id: "c1",
      statement: "99% uptime",
      source: "status page",
      evidenceRating: 4,
      legalStatus: "approved",
      speculative: false,
      lastVerified: new Date(Date.now() - 31 * DAYS),
    });
    expect(claims.needsReverification().map((c) => c.id)).toContain("c1");
    expect(() =>
      claims.addClaim({
        id: "c2",
        statement: "maybe",
        source: "none",
        evidenceRating: 1,
        legalStatus: "rejected",
        speculative: true,
      })
    ).toThrow("Speculative claims are rejected");
  });

  it("flags release cadence gaps", () => {
    const tracker = new ReleaseCadenceTracker();
    tracker.addEvent({
      competitor: "Rival",
      description: "big launch",
      mappedRoadmapDelta: new Date(Date.now() - 40 * DAYS),
    });
    expect(tracker.gaps().length).toBe(1);
  });

  it("maintains top risks with severity replacement", () => {
    const register = new RiskRegister();
    for (let i = 0; i < 10; i += 1) {
      register.upsert({
        id: `r${i}`,
        threat: `t${i}`,
        mitigation: "m",
        owner: "owner",
        dueDate: new Date(),
        severity: 5,
      });
    }
    expect(() =>
      register.upsert({
        id: "new-low",
        threat: "low",
        mitigation: "m",
        owner: "o",
        dueDate: new Date(),
        severity: 5,
      })
    ).toThrow("Risk register full");
    register.upsert({
      id: "high",
      threat: "high",
      mitigation: "m",
      owner: "o",
      dueDate: new Date(),
      severity: 1,
    });
    expect(register.topThreats()[0].id).toBe("high");
  });

  it("expires battlecards lacking recent review", () => {
    const claims = new ClaimLibrary();
    claims.addClaim({
      id: "c1",
      statement: "verifiable",
      source: "link",
      evidenceRating: 5,
      legalStatus: "approved",
      speculative: false,
    });
    const cards = new BattlecardLibrary(claims);
    cards.add({
      id: "b1",
      competitor: "Rival",
      approvedLanguage: "safe",
      evidenceIds: ["c1"],
      lastReviewed: new Date(Date.now() - 61 * DAYS),
    });
    expect(cards.expired().map((c) => c.id)).toContain("b1");
  });

  it("hashes teardown assets and validates provenance", () => {
    const repo = new TeardownRepo();
    const asset = repo.add({
      id: "a1",
      competitor: "Rival",
      type: "screenshot",
      content: "image-bytes",
      metadata: { flow: "onboarding" },
    });
    expect(repo.verify(asset.id)).toBe(true);
  });

  it("detects switch-cost coverage gaps", () => {
    const inventory = new SwitchCostInventory();
    inventory.add({
      id: "s1",
      competitor: "Rival",
      data: ["users"],
      workflows: [],
      users: [],
      integrations: [],
      approvals: [],
      importerCoverage: [],
    });
    expect(inventory.coverageGaps().map((i) => i.id)).toContain("s1");
  });

  it("enforces monthly council spacing", () => {
    const council = new CompetitiveCouncil();
    council.recordMeeting({ decisions: ["do"], actions: [] });
    expect(() =>
      council.recordMeeting({
        decisions: ["too soon"],
        actions: [],
        meetingDate: new Date(Date.now() + 10 * DAYS),
      })
    ).toThrow("monthly");
  });

  it("requires monthly competitive responses", () => {
    const tracker = new CompetitiveResponseTracker();
    tracker.add({ id: "resp1", shippedAt: new Date() });
    const missing = tracker.missingMonths(new Date(), 1);
    expect(missing.length).toBe(0);
  });

  it("produces importer parity diff reports", () => {
    const manager = new ImporterManager();
    manager.register("Rival", (input) => ({ created: input, updated: [], missing: [] }));
    const result = manager.run("Rival", ["a", "b"], ["a", "c"]);
    expect(result.missing).toContain("c");
  });

  it("applies compat mappings per workspace", () => {
    const manager = new CompatModeManager();
    manager.defineMapping("Rival", { incident: "case" });
    manager.enable("ws1", "Rival");
    expect(manager.translate("ws1", "incident")).toBe("case");
    manager.disable("ws1");
    expect(manager.translate("ws1", "incident")).toBe("incident");
  });

  it("audits and allows undo for bulk operations", () => {
    const tooling = new BulkTooling();
    const records = [{ name: "one" }];
    tooling.bulkEdit("ws", records, (record) => {
      record.name = "updated";
    });
    expect(records[0].name).toBe("updated");
    expect(tooling.undoLast("ws")).toBe(true);
    expect(tooling.auditLog().length).toBeGreaterThan(0);
  });

  it("builds migration validation reports", () => {
    const validator = new MigrationValidator();
    const report = validator.buildReport(["a", "b"], ["a"]);
    expect(report.missing).toEqual(["b"]);
    expect(report.parity).toBe(50);
  });

  it("enforces integration signatures and retries", () => {
    const registry = new IntegrationAdapterRegistry();
    registry.register({ id: "adapter", signatureSecret: "secret", retries: 1 });
    const result = registry.execute("adapter", "payload", 2);
    expect(result.signature).toBeDefined();
    expect(result.success).toBe(false);
  });

  it("captures collaboration gravity events", () => {
    const gravity = new CollaborationGravity();
    gravity.addRole("ws", "admin", "alice");
    gravity.approval("ws", "req", "bob");
    gravity.comment("ws", "thread", "carol", "note");
    gravity.notify("ws", "ping");
    expect(gravity.history().length).toBe(4);
  });

  it("applies enterprise controls per workspace", () => {
    const controls = new EnterpriseControls();
    controls.apply("ws", { customerManagedKey: "key", retentionDays: 30 });
    expect(controls.get("ws")?.retentionDays).toBe(30);
  });

  it("tracks migration metrics", () => {
    const metrics = new MetricsTracker();
    metrics.recordMigration(100);
    metrics.recordMigration(200);
    expect(metrics.averageMigrationSeconds()).toBe(150);
  });

  it("delivers first value package artifact", () => {
    const pkg = new FirstValuePackage("Workspace {workspace}: {summary}");
    const result = pkg.provision("ws", "executive report");
    expect(result.artifact).toContain("executive report");
  });

  it("upgrades workspaces with clean boundaries", () => {
    const manager = new WorkspaceManager();
    manager.create({ id: "ws", team: "alpha", upgradePath: [], scimReady: true });
    const upgraded = manager.upgrade("ws", "pro");
    expect(upgraded.upgradePath).toContain("pro");
  });

  it("sends invitations with roles", () => {
    const notifications: string[] = [];
    const loop = new InviteLoop((message) => notifications.push(message));
    loop.invite("user@example.com", "editor");
    expect(notifications[0]).toContain("editor");
  });

  it("generates ROI dashboards for champions", () => {
    const kit = new ChampionKit();
    const roi = kit.roiDashboard("cohort", 100, 150);
    expect(roi.roi).toBe(50);
  });

  it("returns expansion playbook actions", () => {
    const playbook = new ExpansionPlaybook();
    playbook.add({ trigger: "high-usage", actions: ["upsell"] });
    expect(playbook.nextActions("high-usage")).toContain("upsell");
  });

  it("enforces entitlements from configuration", () => {
    const engine = new EntitlementEngine({ pro: ["feature-a"] });
    expect(engine.isEntitled("pro", "feature-a")).toBe(true);
  });

  it("activates time-boxed migration offers", () => {
    const manager = new MigrationOfferManager();
    manager.create({ name: "promo", expiresAt: new Date(Date.now() + DAYS), discountPercent: 10 });
    expect(manager.active().length).toBe(1);
  });

  it("records trustworthy usage dashboards", () => {
    const dashboard = new UsageDashboard();
    dashboard.record("requests", 10);
    dashboard.record("requests", 5);
    expect(dashboard.snapshot().requests).toBe(15);
  });

  it("guards pricing experiments with churn guardrails", () => {
    const manager = new PricingExperimentManager();
    manager.run({ name: "exp", holdoutPercentage: 10, churnGuardrail: 1, upliftTarget: 5 });
    expect(() => manager.evaluate("exp", 0.5)).toThrow("Churn guardrail violated");
    const evaluated = manager.evaluate("exp", 2);
    expect(evaluated.observedUplift).toBe(2);
  });

  it("auto-rolls back on SLO burn", () => {
    const manager = new SLOManager();
    manager.define({
      id: "journey1",
      journey: "search",
      target: 99.9,
      measurementWindowDays: 30,
      errorBudget: 1,
    });
    expect(manager.evaluateRelease("journey1", 2)).toBe("rollback");
  });

  it("triggers rollback on failed synthetic checks", () => {
    const checker = new SyntheticChecker();
    checker.add({ id: "check1", description: "end-to-end" });
    expect(checker.run("check1", false)).toBe("rollback");
  });

  it("tracks and resolves top customer-visible errors", () => {
    const remediation = new ErrorRemediation();
    remediation.track("E1");
    remediation.resolve("E1");
    expect(remediation.outstanding()).toEqual([]);
  });

  it("improves latency for demo-critical endpoints", () => {
    const tracker = new LatencyTracker();
    tracker.record("GET /demo", 1200);
    const updated = tracker.improve("GET /demo", 200);
    expect(updated).toBe(1000);
  });

  it("stores incidents and templates on status page", () => {
    const status = new StatusPage();
    status.setTemplates(["template"]);
    const incident = status.addIncident({ id: "inc", description: "down" });
    status.resolve(incident.id);
    expect(status.history()[0].resolvedAt).toBeDefined();
    expect(status.commsTemplates()).toContain("template");
  });

  it("requires MFA and expirations for access", () => {
    const access = new AccessManager();
    access.grantAccess({
      user: "alice",
      roles: ["admin"],
      expiresAt: new Date(Date.now() - DAYS),
      mfa: true,
    });
    expect(access.review()).toContain("alice");
    expect(() =>
      access.grantAccess({ user: "bob", roles: [], expiresAt: new Date(), mfa: false })
    ).toThrow("MFA required");
  });

  it("enforces secret rotation schedules", () => {
    const secrets = new SecretManager();
    secrets.add({ name: "key", rotationDays: 1, lastRotated: new Date(Date.now() - 2 * DAYS) });
    expect(secrets.rotationDue().map((s) => s.name)).toContain("key");
  });

  it("blocks banned licenses via SBOM gate", () => {
    const gate = new SBOMGate(["GPL"]);
    expect(() => gate.enforce(["MIT", "GPL"])).toThrow("Banned licenses detected");
  });

  it("automates questionnaire answers", () => {
    const automation = new QuestionnaireAutomation({ question: "answer" });
    expect(automation.respond("question")).toBe("answer");
  });

  it("tracks narrative assets with evidence-backed pillars", () => {
    const claims = new ClaimLibrary();
    claims.addClaim({
      id: "c1",
      statement: "fast",
      source: "benchmark",
      evidenceRating: 5,
      legalStatus: "approved",
      speculative: false,
    });
    const narrative = new NarrativeOps(claims);
    narrative.definePillar({ pillar: "speed", evidenceIds: ["c1"] });
    narrative.addTalkTrack("talk");
    narrative.publishWhatsNew("feature");
    narrative.addCaseStudy("case");
    expect(narrative.metrics().pillars).toBe(1);
  });

  it("certifies partners and tracks analytics", () => {
    const program = new PartnerProgram();
    program.addTier({ name: "gold", benefits: ["support"], obligations: ["sla"] });
    const partner = { id: "p1", name: "Partner", tier: "gold", certified: false };
    program.register(partner);
    const certification = new PartnerCertification(["test"]);
    expect(certification.certify(partner).passed).toBe(true);
    const analytics = new PartnerAnalytics();
    analytics.record(partner.id, { installs: 5, revenue: 100 });
    expect(analytics.report(partner.id).installs).toBe(5);
  });

  it("standardizes bespoke integrations", () => {
    const manager = new DeprecationManager();
    manager.addLegacy("hack");
    manager.standardize("hack");
    expect(manager.outstanding()).toEqual([]);
  });

  it("audits IP ownership and OSS compliance", () => {
    const audit = new IPAudit();
    audit.add({ id: "c1", owner: "company", signed: false });
    expect(audit.unsigned().map((r) => r.id)).toContain("c1");
    const compliance = new OSSCompliance();
    expect(() => compliance.enforce(["MIT"], [])).toThrow("Missing OSS attribution");
  });

  it("enforces brand hygiene uniqueness", () => {
    const hygiene = new BrandHygiene();
    hygiene.register("mark1");
    expect(() => hygiene.register("mark1")).toThrow("Duplicate mark");
  });

  it("publishes defamation-safe statements backed by evidence", () => {
    const claims = new ClaimLibrary();
    claims.addClaim({
      id: "c1",
      statement: "accurate",
      source: "source",
      evidenceRating: 5,
      legalStatus: "approved",
      speculative: false,
    });
    const policy = new DefamationPolicy(claims);
    expect(policy.publish("statement", ["c1"])).toBe("statement");
  });

  it("prepares portability playbook outputs", () => {
    const playbook = new PortabilityPlaybook();
    const result = playbook.prepare(["data1", "restricted-secret"]);
    expect(result.blocked).toContain("restricted-secret");
  });

  it("validates vendor readiness", () => {
    const register = new VendorRegister();
    expect(() => register.add({ name: "vendor", dpaSigned: false, sccReady: true })).toThrow(
      "Vendor not ready"
    );
  });

  it("schedules quarterly legal reviews", () => {
    const scheduler = new LegalReviewScheduler();
    const first = new Date("2023-01-01");
    scheduler.schedule(first);
    expect(() => scheduler.schedule(new Date("2023-02-01"))).toThrow("quarterly");
  });
});
