import crypto from "crypto";
import yaml from "yaml";

export type TelemetryDomain = "EDR" | "NDR" | "CLOUD" | "IDP" | "SAAS";

export interface TelemetrySource {
  id: string;
  domain: TelemetryDomain;
  retentionDays: number;
  sensitivity: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "SECRET";
  minimalFields: string[];
  freshnessSloMinutes: number;
  classificationTags?: string[];
  lastSeen?: Date;
}

export interface RawTelemetryEvent {
  sourceId: string;
  timestamp: Date;
  body: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  schemaVersion?: string;
}

export interface NormalizedTelemetryEvent {
  sourceId: string;
  domain: TelemetryDomain;
  timestamp: Date;
  severityText: string;
  body: Record<string, unknown>;
  attributes: Record<string, unknown>;
  resource: Record<string, unknown>;
  classification: string[];
}

export interface DriftFinding {
  type: "SCHEMA" | "CONTENT";
  missingFields?: string[];
  unexpectedFields?: string[];
  fieldTypeMismatches?: Record<string, string>;
  suspiciousContent?: Array<{ field: string; reason: string }>;
}

export interface TrustScore {
  freshness: number;
  completeness: number;
  fidelity: number;
  overall: number;
}

export interface LakeView {
  name: string;
  allowedSensitivities: TelemetrySource["sensitivity"][];
  events: NormalizedTelemetryEvent[];
}

export class TelemetryLake {
  private readonly views: Map<string, LakeView> = new Map();

  constructor(
    viewNames: Array<{ name: string; allowedSensitivities: TelemetrySource["sensitivity"][] }>
  ) {
    viewNames.forEach((view) => {
      this.views.set(view.name, { ...view, events: [] });
    });
  }

  pipe(event: NormalizedTelemetryEvent): void {
    for (const view of this.views.values()) {
      if (
        view.allowedSensitivities.includes(
          event.resource.sensitivity as TelemetrySource["sensitivity"]
        )
      ) {
        view.events.push(event);
      }
    }
  }

  getView(name: string): LakeView | undefined {
    return this.views.get(name);
  }
}

export class TelemetryUnifier {
  private readonly sources = new Map<string, TelemetrySource>();

  constructor(private readonly lake: TelemetryLake) {}

  inventorySource(source: TelemetrySource): void {
    this.sources.set(source.id, source);
  }

  normalize(event: RawTelemetryEvent): NormalizedTelemetryEvent {
    const source = this.sources.get(event.sourceId);
    if (!source) {
      throw new Error(`Unknown telemetry source ${event.sourceId}`);
    }

    const attributes = event.attributes ?? {};
    const body = { ...event.body };

    const missing = source.minimalFields.filter(
      (field) => !(field in body) && !(field in attributes)
    );
    if (missing.length > 0) {
      throw new Error(`Missing minimal fields for ${source.id}: ${missing.join(", ")}`);
    }

    const classification = new Set<string>(["telemetry", source.domain.toLowerCase()]);
    source.classificationTags?.forEach((tag) => classification.add(tag));

    const normalized: NormalizedTelemetryEvent = {
      sourceId: source.id,
      domain: source.domain,
      timestamp: event.timestamp,
      severityText: "INFO",
      body,
      attributes,
      resource: {
        schemaVersion: event.schemaVersion ?? "1.0",
        retentionDays: source.retentionDays,
        sensitivity: source.sensitivity,
        domain: source.domain,
      },
      classification: Array.from(classification),
    };

    this.lake.pipe(normalized);
    this.sources.set(source.id, { ...source, lastSeen: event.timestamp });
    return normalized;
  }

  buildTrustScore(
    sourceId: string,
    validationRate: number,
    expectedEvents: number,
    receivedEvents: number
  ): TrustScore {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Unknown telemetry source ${sourceId}`);
    }

    const freshness = this.calculateFreshnessScore(source);
    const completeness = expectedEvents === 0 ? 1 : Math.min(receivedEvents / expectedEvents, 1);
    const fidelity = Math.max(Math.min(validationRate, 1), 0);
    const overall = Number((freshness * 0.4 + completeness * 0.35 + fidelity * 0.25).toFixed(3));
    return { freshness, completeness, fidelity, overall };
  }

  detectDrift(event: RawTelemetryEvent): DriftFinding[] {
    const source = this.sources.get(event.sourceId);
    if (!source) {
      throw new Error(`Unknown telemetry source ${event.sourceId}`);
    }

    const findings: DriftFinding[] = [];
    const attributes = event.attributes ?? {};
    const bodyKeys = new Set(Object.keys(event.body));
    const attrKeys = new Set(Object.keys(attributes));

    const missingFields = source.minimalFields.filter(
      (field) => !bodyKeys.has(field) && !attrKeys.has(field)
    );
    const unexpectedFields = Array.from(new Set([...bodyKeys, ...attrKeys])).filter(
      (field) => !source.minimalFields.includes(field)
    );
    const fieldTypeMismatches: Record<string, string> = {};

    source.minimalFields.forEach((field) => {
      const candidate = (event.body as Record<string, unknown>)[field] ?? attributes[field];
      if (candidate !== undefined) {
        if (typeof candidate === "string" && candidate.trim() === "") {
          fieldTypeMismatches[field] = "empty-string";
        }
      }
    });

    if (
      missingFields.length ||
      unexpectedFields.length ||
      Object.keys(fieldTypeMismatches).length
    ) {
      findings.push({ type: "SCHEMA", missingFields, unexpectedFields, fieldTypeMismatches });
    }

    const suspiciousContent: Array<{ field: string; reason: string }> = [];
    Object.entries(event.body).forEach(([field, value]) => {
      if (typeof value === "string" && value.toLowerCase().includes("drop table")) {
        suspiciousContent.push({ field, reason: "sql-injection-linguistic-match" });
      }
      if (field.toLowerCase().includes("password")) {
        suspiciousContent.push({ field, reason: "secret-in-body" });
      }
    });

    if (suspiciousContent.length) {
      findings.push({ type: "CONTENT", suspiciousContent });
    }

    return findings;
  }

  private calculateFreshnessScore(source: TelemetrySource): number {
    if (!source.lastSeen) return 0;
    const now = Date.now();
    const deltaMinutes = (now - source.lastSeen.getTime()) / 60000;
    if (deltaMinutes <= source.freshnessSloMinutes) return 1;
    if (deltaMinutes > source.freshnessSloMinutes * 4) return 0;
    const decay = Math.max(0, 1 - deltaMinutes / (source.freshnessSloMinutes * 4));
    return Number(decay.toFixed(3));
  }
}

export interface LegacyRuleCondition {
  field: string;
  operator: "equals" | "contains" | "gt" | "lt";
  value: string | number;
}

export interface DetectionRule {
  id: string;
  name: string;
  legacyConditions: LegacyRuleCondition[];
  telemetryDomains: TelemetryDomain[];
  tactics: string[];
  owner: string;
  expiresAt: Date;
  renewAt: Date;
  riskToOrg: number;
  detectionGap: number;
  campaign?: string;
}

export interface ValidationResult {
  ruleId: string;
  triggered: number;
  falsePositives: number;
  falseNegatives: number;
  telemetryHealthCorrelation: number;
}

export class DetectionEngineeringService {
  constructor(private readonly telemetry: TelemetryUnifier) {}

  convertToSigma(rule: DetectionRule): string {
    const detection: Record<string, Record<string, unknown>> = {};
    rule.legacyConditions.forEach((condition, index) => {
      detection[`condition_${index}`] = {
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
      };
    });

    const sigmaDocument = {
      title: rule.name,
      id: rule.id,
      description: `${rule.name} auto-converted from legacy conditions`,
      status: "experimental",
      logsource: {
        category: rule.telemetryDomains.join(","),
      },
      detection,
      fields: rule.legacyConditions.map((c) => c.field),
      tags: [
        "bulwark",
        ...rule.tactics,
        `owner:${rule.owner}`,
        `renew:${rule.renewAt.toISOString()}`,
      ],
      falsepositives: ["validated by synthetic data harness"],
      level: "medium",
    };

    return yaml.stringify(sigmaDocument);
  }

  prioritizeThreats(rules: DetectionRule[]): DetectionRule[] {
    return [...rules].sort((a, b) => b.riskToOrg * b.detectionGap - a.riskToOrg * a.detectionGap);
  }

  clusterAlerts(alerts: Array<{ tactic: string; campaign?: string }>): Map<string, number> {
    const clusters = new Map<string, number>();
    alerts.forEach((alert) => {
      const key = `${alert.campaign ?? "unknown"}:${alert.tactic}`;
      clusters.set(key, (clusters.get(key) ?? 0) + 1);
    });
    return clusters;
  }

  validateWithSyntheticData(
    rule: DetectionRule,
    syntheticEvents: RawTelemetryEvent[]
  ): ValidationResult {
    let triggered = 0;
    let falsePositives = 0;
    let falseNegatives = 0;

    const evalCondition = (event: RawTelemetryEvent, condition: LegacyRuleCondition): boolean => {
      const haystack =
        (event.body as Record<string, unknown>)[condition.field] ??
        event.attributes?.[condition.field];
      if (haystack === undefined) return false;
      switch (condition.operator) {
        case "equals":
          return haystack === condition.value;
        case "contains":
          return typeof haystack === "string" && haystack.includes(String(condition.value));
        case "gt":
          return typeof haystack === "number" && haystack > Number(condition.value);
        case "lt":
          return typeof haystack === "number" && haystack < Number(condition.value);
        default:
          return false;
      }
    };

    syntheticEvents.forEach((event) => {
      const matches = rule.legacyConditions.every((condition) => evalCondition(event, condition));
      const shouldTrigger = Boolean((event.body as Record<string, unknown>).expectedAlert);
      if (matches) {
        triggered += 1;
        if (!shouldTrigger) falsePositives += 1;
      } else if (shouldTrigger) {
        falseNegatives += 1;
      }
    });

    let health = 0;
    const sourceId = syntheticEvents[0]?.sourceId;
    if (sourceId) {
      try {
        health = this.telemetry.buildTrustScore(
          sourceId,
          0.95,
          syntheticEvents.length,
          syntheticEvents.length
        ).overall;
      } catch {
        health = 0;
      }
    }
    return {
      ruleId: rule.id,
      triggered,
      falsePositives,
      falseNegatives,
      telemetryHealthCorrelation: health,
    };
  }

  buildCoverageHeatmap(rules: DetectionRule[]): Map<string, number> {
    const heatmap = new Map<string, number>();
    rules.forEach((rule) => {
      rule.tactics.forEach((tactic) => {
        heatmap.set(tactic, (heatmap.get(tactic) ?? 0) + 1);
      });
    });
    return heatmap;
  }
}

export interface EvidenceLogEntry {
  id: string;
  timestamp: Date;
  action: string;
  actor: string;
  details: Record<string, unknown>;
  previousHash: string;
  hash: string;
}

export interface PlaybookAction {
  name: string;
  command: string;
  containmentFirst: boolean;
}

export class RapidResponseModernizer {
  private readonly playbooks = new Map<string, PlaybookAction[]>();
  private readonly custodyLog: EvidenceLogEntry[] = [];
  private isolationState = new Map<string, { isolated: boolean; reason: string }>();

  createPlaybook(alertName: string, actions: PlaybookAction[]): void {
    if (!actions.some((a) => a.containmentFirst)) {
      throw new Error("Playbook must include at least one containment-first action");
    }
    this.playbooks.set(alertName, actions);
  }

  execute(alertName: string, assetId: string): PlaybookAction[] {
    const actions = this.playbooks.get(alertName);
    if (!actions) throw new Error(`No playbook for ${alertName}`);

    actions
      .filter((action) => action.containmentFirst)
      .forEach((action) => {
        this.isolationState.set(assetId, { isolated: true, reason: action.name });
      });

    return actions;
  }

  appendEvidence(
    action: string,
    actor: string,
    details: Record<string, unknown>
  ): EvidenceLogEntry {
    const previousHash = this.custodyLog[this.custodyLog.length - 1]?.hash ?? "";
    const payload = `${previousHash}${action}${actor}${JSON.stringify(details)}`;
    const hash = crypto.createHash("sha256").update(payload).digest("hex");
    const entry: EvidenceLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      action,
      actor,
      details,
      previousHash,
      hash,
    };
    this.custodyLog.push(entry);
    return entry;
  }

  verifyChainOfCustody(): boolean {
    for (let i = 0; i < this.custodyLog.length; i += 1) {
      const entry = this.custodyLog[i];
      const expectedPayload = `${entry.previousHash}${entry.action}${entry.actor}${JSON.stringify(entry.details)}`;
      const expectedHash = crypto.createHash("sha256").update(expectedPayload).digest("hex");
      if (entry.hash !== expectedHash) return false;
      if (i > 0 && this.custodyLog[i - 1].hash !== entry.previousHash) return false;
    }
    return true;
  }

  metrics(
    ttd: number[],
    ttr: number[],
    mttr: number[]
  ): { ttd: number; ttr: number; mttr: number } {
    const average = (list: number[]) =>
      list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
    return { ttd: average(ttd), ttr: average(ttr), mttr: average(mttr) };
  }

  readinessTripwire(lastRun: Date, now: Date = new Date()): boolean {
    const deltaDays = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60 * 24);
    return deltaDays <= 30;
  }
}

export interface IdentityEvent {
  actor: string;
  action: string;
  resource: string;
  location?: string;
  justification?: string;
  riskScore?: number;
  honeytoken?: boolean;
}

export interface AccountProfile {
  id: string;
  roles: string[];
  mfaEnforced: boolean;
  conditionalAccess: boolean;
  privileges: string[];
}

export class IdentityTripwireFramework {
  private readonly accounts = new Map<string, AccountProfile>();
  private readonly honeytokens = new Set<string>();
  private readonly eventLog: IdentityEvent[] = [];

  registerAccount(profile: AccountProfile): void {
    if (!profile.mfaEnforced) {
      throw new Error("MFA is mandatory for all accounts");
    }
    this.accounts.set(profile.id, profile);
  }

  insertHoneytoken(accountId: string): void {
    this.honeytokens.add(accountId);
  }

  logEvent(event: IdentityEvent): IdentityEvent {
    const enriched: IdentityEvent = {
      ...event,
      riskScore: this.scoreRisk(event),
      honeytoken: this.honeytokens.has(event.actor),
    };
    this.eventLog.push(enriched);
    return enriched;
  }

  private scoreRisk(event: IdentityEvent): number {
    let score = 0.2;
    if (event.action.includes("admin") || event.action.includes("elevate")) score += 0.4;
    if (event.location && event.location !== "trusted") score += 0.2;
    if (!event.justification) score += 0.2;
    if (this.honeytokens.has(event.actor)) score += 1;
    return Math.min(score, 1);
  }

  riskBasedSessionScore(accountId: string): number {
    const recentEvents = this.eventLog.filter((event) => event.actor === accountId).slice(-5);
    if (!recentEvents.length) return 0;
    const avg = recentEvents.reduce((sum, e) => sum + (e.riskScore ?? 0), 0) / recentEvents.length;
    return Number(avg.toFixed(2));
  }
}

export interface AssetExposure {
  id: string;
  environment: "dev" | "test" | "prod";
  exposedPorts: number[];
  expiration: Date;
  baselineConfig: Record<string, unknown>;
  active: boolean;
}

export class InfrastructureHygieneManager {
  private readonly assets = new Map<string, AssetExposure>();
  private readonly secrets: string[] = [];
  private readonly orphanedResources: Set<string> = new Set();

  registerAsset(asset: AssetExposure): void {
    this.assets.set(asset.id, asset);
  }

  scanExpirations(now: Date = new Date()): string[] {
    const deactivated: string[] = [];
    for (const [id, asset] of this.assets.entries()) {
      if (asset.expiration.getTime() < now.getTime() && asset.active) {
        this.assets.set(id, { ...asset, active: false });
        deactivated.push(id);
      }
    }
    return deactivated;
  }

  enforceBaseline(assetId: string, desired: Record<string, unknown>): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) throw new Error("Unknown asset");
    const drift = Object.entries(desired).some(
      ([key, value]) => asset.baselineConfig[key] !== value
    );
    if (drift) {
      this.assets.set(assetId, { ...asset, baselineConfig: { ...desired } });
    }
    return drift;
  }

  inventorySecrets(payload: string): string[] {
    const findings: string[] = [];
    const secretRegex = /(AKIA[0-9A-Z]{16})|(secret_key\s*=\s*['\"]?[A-Za-z0-9]{16,})/g;
    let match: RegExpExecArray | null;
    while ((match = secretRegex.exec(payload)) !== null) {
      const secret = match[0];
      this.secrets.push(secret);
      findings.push(secret);
    }
    return findings;
  }

  verifyAttestation(artifact: {
    sbom: boolean;
    slsaLevel: number;
    signatureValid: boolean;
  }): boolean {
    return artifact.sbom && artifact.signatureValid && artifact.slsaLevel >= 3;
  }

  reclaimOrphans(orphanIds: string[]): void {
    orphanIds.forEach((id) => this.orphanedResources.add(id));
  }

  getOrphans(): string[] {
    return Array.from(this.orphanedResources);
  }
}

export interface PolicyDecision {
  policy: string;
  allowed: boolean;
  reason?: string;
}

export interface ExceptionRecord {
  id: string;
  control: string;
  owner: string;
  expiresAt: Date;
  reason: string;
}

export class GovernanceGuardrails {
  private readonly policies: Array<(input: Record<string, unknown>) => PolicyDecision> = [];
  private readonly exceptions = new Map<string, ExceptionRecord>();
  private readonly riskMapping = new Map<string, string>();

  registerPolicy(name: string, evaluator: (input: Record<string, unknown>) => boolean): void {
    this.policies.push((input) => ({
      policy: name,
      allowed: evaluator(input),
      reason: evaluator(input) ? "ok" : "deny-by-default",
    }));
  }

  evaluate(input: Record<string, unknown>): PolicyDecision[] {
    return this.policies.map((policy) => policy(input));
  }

  addException(record: ExceptionRecord): void {
    this.exceptions.set(record.id, record);
  }

  sweepExpired(now: Date = new Date()): string[] {
    const expired: string[] = [];
    for (const [id, exception] of this.exceptions.entries()) {
      if (exception.expiresAt.getTime() < now.getTime()) {
        this.exceptions.delete(id);
        expired.push(id);
      }
    }
    return expired;
  }

  mapRiskToControl(risk: string, control: string): void {
    this.riskMapping.set(risk, control);
  }

  controlScoreboard(alertFidelity: number): {
    coverage: number;
    riskDelta: number;
    alertFidelity: number;
  } {
    const coverage = this.policies.length ? Math.min(1, this.policies.length / 10) : 0;
    const riskDelta = this.riskMapping.size * 0.05;
    return {
      coverage: Number(coverage.toFixed(2)),
      riskDelta: Number(riskDelta.toFixed(2)),
      alertFidelity,
    };
  }
}
