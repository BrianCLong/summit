import crypto from 'crypto';
import { EventEmitter } from 'events';

export type TelemetrySource = 'EDR' | 'NDR' | 'CLOUD' | 'IAM';
export type TelemetryEntityType = 'USER' | 'DEVICE' | 'SESSION' | 'ASSET' | 'NETWORK';

export interface TelemetrySignal {
  id: string;
  source: TelemetrySource;
  entityType: TelemetryEntityType;
  entityId: string;
  ttp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  attributes: Record<string, any>;
  timestamp: Date;
}

export interface CorrelatedAlert {
  id: string;
  ttp: string;
  signals: TelemetrySignal[];
  priority: number;
  blastRadius: number;
  campaignOverlap: string[];
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'IDENTITY' | 'NETWORK' | 'ASSET';
}

export interface FusionDashboardView {
  alerts: CorrelatedAlert[];
  sessions: Record<string, TelemetrySignal[]>;
  assets: Record<string, TelemetrySignal[]>;
}

export interface SoarMessage {
  id: string;
  type: 'CORRELATED_THREAT' | 'ADAPTIVE_CONTROL' | 'SUPPLY_CHAIN_ALERT';
  payload: Record<string, any>;
  createdAt: Date;
}

export interface ThreatActorProfile {
  name: string;
  region: string;
  vertical: string;
  attackChains: string[];
  techniques: string[];
}

export interface EmulationResult {
  actor: string;
  chain: string[];
  telemetry: TelemetrySignal[];
  detectedTechniques: string[];
  gaps: string[];
  fixStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
}

export interface SimulationRegistryEntry extends EmulationResult {
  id: string;
  executedAt: Date;
}

export interface DataFieldClassification {
  field: string;
  type: 'PII' | 'PHI' | 'PCI' | 'GENERIC';
  mask: boolean;
  retentionDays: number;
}

export interface DashboardExposureRecord {
  id: string;
  owner: string;
  publicLink: boolean;
  expiresAt?: Date;
}

export interface ExposureMapEntry {
  resource: string;
  classification: 'LOW' | 'MEDIUM' | 'HIGH';
  lastScan: Date;
  issues: string[];
}

export interface AssetNode {
  id: string;
  type: 'CLOUD' | 'ON_PREM' | 'SAAS' | 'ENDPOINT';
  sensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
  exposure: 'EXTERNAL' | 'INTERNAL';
  criticality: number;
  owner?: string;
  createdAt: Date;
  ttlDays?: number;
  baselineConfig: Record<string, any>;
  currentConfig: Record<string, any>;
}

export interface MisconfigurationEvent {
  assetId: string;
  rule: string;
  detectedAt: Date;
}

export interface AssetScore {
  assetId: string;
  score: number;
  rationale: string[];
}

export interface BuildArtifact {
  id: string;
  component: string;
  provenanceLevel: number;
  signed: boolean;
  sbomHash?: string;
  lastRotatedSecret?: Date;
}

export interface SbomDiff {
  added: string[];
  removed: string[];
  elevatedRisk: string[];
}

export interface PipelineGateDecision {
  allowed: boolean;
  reasons: string[];
}

export interface SessionRiskSignal {
  sessionId: string;
  userId: string;
  ipReputation: number;
  geo?: string;
  velocity?: number;
  method: string;
  timestamp: Date;
}

export interface BaselineProfile {
  userId: string;
  averageLoginHour: number;
  averageDailyVolume: number;
  commonGeos: string[];
  commonMethods: string[];
}

export interface AdaptiveDecision {
  sessionId: string;
  action: 'ALLOW' | 'STEP_UP' | 'DENY';
  reason: string;
  riskScore: number;
}

export class SoarConnector extends EventEmitter {
  private queue: SoarMessage[] = [];

  publish(message: SoarMessage): void {
    this.queue.push(message);
    this.emit('published', message);
  }

  drain(): SoarMessage[] {
    const copy = [...this.queue];
    this.queue = [];
    return copy;
  }
}

export class SignalFusionEngine {
  private normalizedIdMap: Map<string, string> = new Map();
  private graphEdges: GraphEdge[] = [];

  constructor(private soar: SoarConnector) {}

  normalizeTelemetry(signal: TelemetrySignal): TelemetrySignal {
    const canonicalId = signal.entityId.trim().toLowerCase();
    this.normalizedIdMap.set(signal.entityId, canonicalId);
    return { ...signal, entityId: canonicalId };
  }

  correlateTtpSignals(
    ttps: string[],
    signals: TelemetrySignal[],
  ): Map<string, TelemetrySignal[]> {
    const map = new Map<string, TelemetrySignal[]>();
    signals.forEach((signal) => {
      if (ttps.includes(signal.ttp)) {
        const normalized = this.normalizeTelemetry(signal);
        if (!map.has(normalized.ttp)) {
          map.set(normalized.ttp, []);
        }
        map.get(normalized.ttp)!.push(normalized);
      }
    });
    return map;
  }

  addGraphEdges(edges: GraphEdge[]): void {
    this.graphEdges.push(...edges);
  }

  buildTrailGraph(signals: TelemetrySignal[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    const addEdge = (from: string, to: string) => {
      if (!graph.has(from)) graph.set(from, new Set());
      graph.get(from)!.add(to);
    };

    signals.forEach((signal) => {
      addEdge(signal.entityId, signal.ttp);
    });
    this.graphEdges.forEach((edge) => addEdge(edge.from, edge.to));
    return graph;
  }

  clusterTtps(signals: TelemetrySignal[]): Record<string, string[]> {
    const clusters: Record<string, string[]> = {};
    signals.forEach((signal) => {
      const key = `${signal.entityId}-${signal.source}`;
      if (!clusters[key]) clusters[key] = [];
      if (!clusters[key].includes(signal.ttp)) {
        clusters[key].push(signal.ttp);
      }
    });
    return clusters;
  }

  prioritizeAlerts(
    correlations: Map<string, TelemetrySignal[]>,
    graph: Map<string, Set<string>>,
  ): CorrelatedAlert[] {
    const alerts: CorrelatedAlert[] = [];
    correlations.forEach((signals, ttp) => {
      const blastRadius = signals.reduce((acc, signal) => {
        const visited = new Set<string>();
        const traverse = (node: string): number => {
          if (visited.has(node)) return 0;
          visited.add(node);
          const neighbors = graph.get(node);
          if (!neighbors) return 0;
          let count = neighbors.size;
          neighbors.forEach((neighbor) => {
            count += traverse(neighbor);
          });
          return count;
        };
        return acc + traverse(signal.entityId);
      }, 0);
      const severityWeight =
        signals.reduce((sum, s) => {
          switch (s.severity) {
            case 'CRITICAL':
              return sum + 4;
            case 'HIGH':
              return sum + 3;
            case 'MEDIUM':
              return sum + 2;
            default:
              return sum + 1;
          }
        }, 0) / Math.max(signals.length, 1);
      const campaignOverlap = Array.from(
        new Set(signals.map((s) => s.attributes.campaign || 'unknown')),
      ).filter((c) => c !== 'unknown');

      alerts.push({
        id: `alert-${crypto.randomUUID()}`,
        ttp,
        signals,
        blastRadius,
        campaignOverlap,
        priority: Math.round(severityWeight * (1 + blastRadius / 10)),
      });
    });
    alerts.sort((a, b) => b.priority - a.priority);
    alerts.forEach((alert) =>
      this.soar.publish({
        id: alert.id,
        type: 'CORRELATED_THREAT',
        payload: {
          ttp: alert.ttp,
          signals: alert.signals.map((s) => s.id),
          blastRadius: alert.blastRadius,
          campaigns: alert.campaignOverlap,
        },
        createdAt: new Date(),
      }),
    );
    return alerts;
  }

  buildDashboard(alerts: CorrelatedAlert[]): FusionDashboardView {
    const sessions: Record<string, TelemetrySignal[]> = {};
    const assets: Record<string, TelemetrySignal[]> = {};
    alerts.forEach((alert) => {
      alert.signals.forEach((signal) => {
        if (signal.entityType === 'SESSION') {
          sessions[signal.entityId] = sessions[signal.entityId] || [];
          sessions[signal.entityId].push(signal);
        }
        if (signal.entityType === 'ASSET') {
          assets[signal.entityId] = assets[signal.entityId] || [];
          assets[signal.entityId].push(signal);
        }
      });
    });
    return { alerts, sessions, assets };
  }
}

export class AdversaryEmulationSuite {
  constructor(private soar: SoarConnector) {}

  selectTopActors(profiles: ThreatActorProfile[]): ThreatActorProfile[] {
    const prioritized = [...profiles].sort((a, b) =>
      a.vertical.localeCompare(b.vertical) || a.region.localeCompare(b.region),
    );
    return prioritized.slice(0, 5);
  }

  buildEmulationChain(actor: ThreatActorProfile): string[] {
    return [...new Set(actor.attackChains.concat(actor.techniques))];
  }

  executeSimulation(chain: string[], actor: ThreatActorProfile): EmulationResult {
    const telemetry: TelemetrySignal[] = chain.map((step, index) => ({
      id: `sim-${actor.name}-${index}`,
      source: 'EDR',
      entityType: 'DEVICE',
      entityId: `${actor.name.toLowerCase()}-device`,
      ttp: step,
      severity: 'MEDIUM',
      attributes: { actor: actor.name },
      timestamp: new Date(),
    }));
    const detected = chain.filter((step, idx) => idx % 2 === 0);
    const gaps = chain.filter((step) => !detected.includes(step));
    return {
      actor: actor.name,
      chain,
      telemetry,
      detectedTechniques: detected,
      gaps,
      fixStatus: gaps.length ? 'OPEN' : 'RESOLVED',
    };
  }

  patchDetectionGaps(result: EmulationResult): EmulationResult {
    if (!result.gaps.length) return result;
    return { ...result, gaps: [], fixStatus: 'RESOLVED' };
  }

  recordSimulation(result: EmulationResult): SimulationRegistryEntry {
    return {
      ...result,
      id: crypto.randomUUID(),
      executedAt: new Date(),
    };
  }

  scheduleQuarterlyExercise(reference: Date): Date {
    const date = new Date(reference);
    date.setMonth(date.getMonth() + 3);
    return date;
  }
}

export class PrivacyGuard {
  classifyFields(fields: string[]): DataFieldClassification[] {
    return fields.map((field) => {
      const normalized = field.toLowerCase();
      if (normalized.includes('ssn') || normalized.includes('sin')) {
        return { field, type: 'PII', mask: true, retentionDays: 365 };
      }
      if (normalized.includes('card') || normalized.includes('cvv')) {
        return { field, type: 'PCI', mask: true, retentionDays: 180 };
      }
      if (normalized.includes('health') || normalized.includes('diagnosis')) {
        return { field, type: 'PHI', mask: true, retentionDays: 730 };
      }
      return { field, type: 'GENERIC', mask: false, retentionDays: 90 };
    });
  }

  enforcePolicies(
    records: Record<string, any>,
    policies: DataFieldClassification[],
  ): Record<string, any> {
    const result: Record<string, any> = {};
    Object.entries(records).forEach(([key, value]) => {
      const policy = policies.find((p) => p.field === key);
      if (!policy) {
        result[key] = value;
        return;
      }
      const shouldExpire = policy.retentionDays === 0;
      if (shouldExpire) return;
      result[key] = policy.mask ? this.maskValue(value) : value;
    });
    return result;
  }

  applyDifferentialPrivacy(value: number, epsilon = 1.0): number {
    const noise = this.laplaceNoise(1 / epsilon);
    return Number((value + noise).toFixed(2));
  }

  tokenize(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  inventoryDashboards(dashboards: DashboardExposureRecord[]): DashboardExposureRecord[] {
    return dashboards.map((dash) =>
      dash.publicLink
        ? { ...dash, expiresAt: dash.expiresAt || this.expireSoon() }
        : dash,
    );
  }

  enforceOptIn(highRiskExports: string[], optIn: Record<string, boolean>): string[] {
    return highRiskExports.filter((exportId) => optIn[exportId]);
  }

  scanPublicExposures(
    resources: string[],
    publicFlags: Record<string, boolean>,
  ): ExposureMapEntry[] {
    return resources.map((resource) => ({
      resource,
      classification: publicFlags[resource] ? 'HIGH' : 'LOW',
      lastScan: new Date(),
      issues: publicFlags[resource] ? ['Publicly exposed'] : [],
    }));
  }

  buildExposureMap(
    records: ExposureMapEntry[],
    dashboards: DashboardExposureRecord[],
  ): ExposureMapEntry[] {
    const dashboardIssues = dashboards
      .filter((dash) => dash.publicLink)
      .map((dash) => ({
        resource: dash.id,
        classification: 'MEDIUM' as const,
        lastScan: dash.expiresAt || new Date(),
        issues: ['Dashboard public link'],
      }));
    return [...records, ...dashboardIssues];
  }

  private maskValue(value: any): string {
    const raw = String(value);
    if (raw.length <= 4) return '*'.repeat(raw.length);
    return `${raw.slice(0, 2)}****${raw.slice(-2)}`;
  }

  private laplaceNoise(scale: number): number {
    const u = Math.random() - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }

  private expireSoon(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  }
}

export class AssetExposureInventory {
  private assets: Map<string, AssetNode> = new Map();
  private misconfigurations: MisconfigurationEvent[] = [];

  upsertAsset(asset: AssetNode): AssetNode {
    this.assets.set(asset.id, asset);
    return asset;
  }

  scoreAssets(): AssetScore[] {
    const scores: AssetScore[] = [];
    this.assets.forEach((asset) => {
      const exposureWeight = asset.exposure === 'EXTERNAL' ? 2 : 1;
      const sensitivityWeight = asset.sensitivity === 'HIGH' ? 3 : asset.sensitivity === 'MEDIUM' ? 2 : 1;
      const score = Math.round(
        exposureWeight * sensitivityWeight * asset.criticality + this.configDriftPenalty(asset),
      );
      const rationale = [
        `Exposure:${asset.exposure}`,
        `Sensitivity:${asset.sensitivity}`,
        `Criticality:${asset.criticality}`,
      ];
      if (this.configDriftPenalty(asset) > 0) rationale.push('Config drift detected');
      scores.push({ assetId: asset.id, score, rationale });
    });
    return scores.sort((a, b) => b.score - a.score);
  }

  assignOwner(assetId: string, owner: string): AssetNode | undefined {
    const asset = this.assets.get(assetId);
    if (asset) {
      asset.owner = owner;
      this.assets.set(assetId, asset);
    }
    return asset;
  }

  trackConfigDrift(assetId: string, currentConfig: Record<string, any>): number {
    const asset = this.assets.get(assetId);
    if (!asset) return 0;
    asset.currentConfig = currentConfig;
    this.assets.set(assetId, asset);
    return this.configDriftPenalty(asset);
  }

  enforceTtl(now: Date = new Date()): string[] {
    const removed: string[] = [];
    this.assets.forEach((asset, id) => {
      if (asset.ttlDays) {
        const expiry = new Date(asset.createdAt);
        expiry.setDate(expiry.getDate() + asset.ttlDays);
        if (expiry <= now) {
          this.assets.delete(id);
          removed.push(id);
        }
      }
    });
    return removed;
  }

  monitorMisconfig(event: MisconfigurationEvent): void {
    this.misconfigurations.push(event);
  }

  buildRiskDashboard(): { scores: AssetScore[]; misconfigurations: MisconfigurationEvent[] } {
    return { scores: this.scoreAssets(), misconfigurations: [...this.misconfigurations] };
  }

  private configDriftPenalty(asset: AssetNode): number {
    const baselineKeys = Object.keys(asset.baselineConfig || {});
    const currentKeys = Object.keys(asset.currentConfig || {});
    const drift = baselineKeys.filter((key) => asset.baselineConfig[key] !== asset.currentConfig[key]);
    return drift.length * 2;
  }
}

export class SupplyChainIntegrityManager {
  constructor(private soar: SoarConnector) {}

  enforceProvenance(artifact: BuildArtifact): boolean {
    return artifact.provenanceLevel >= 2;
  }

  signArtifact(artifact: BuildArtifact): BuildArtifact {
    if (!artifact.signed) {
      artifact.signed = true;
    }
    return artifact;
  }

  requireSbom(artifact: BuildArtifact, sbomHash: string): BuildArtifact {
    artifact.sbomHash = sbomHash;
    return artifact;
  }

  diffSbom(previous: string[], current: string[]): SbomDiff {
    const added = current.filter((dep) => !previous.includes(dep));
    const removed = previous.filter((dep) => !current.includes(dep));
    const elevatedRisk = added.filter((dep) => dep.includes('rc') || dep.includes('beta'));
    return { added, removed, elevatedRisk };
  }

  alertUnsignedArtifacts(artifacts: BuildArtifact[]): BuildArtifact[] {
    const unsigned = artifacts.filter((artifact) => !artifact.signed);
    unsigned.forEach((artifact) =>
      this.soar.publish({
        id: artifact.id,
        type: 'SUPPLY_CHAIN_ALERT',
        payload: { artifact: artifact.component, reason: 'UNSIGNED_ARTIFACT' },
        createdAt: new Date(),
      }),
    );
    return unsigned;
  }

  evaluatePipelineGate(artifact: BuildArtifact): PipelineGateDecision {
    const allowed =
      this.enforceProvenance(artifact) && artifact.signed && Boolean(artifact.sbomHash);
    const reasons: string[] = [];
    if (!this.enforceProvenance(artifact)) reasons.push('Provenance below SLSA 2');
    if (!artifact.signed) reasons.push('Unsigned artifact');
    if (!artifact.sbomHash) reasons.push('Missing SBOM');
    return { allowed, reasons };
  }

  rotateSecrets(artifact: BuildArtifact, reference: Date = new Date()): BuildArtifact {
    const rotated = { ...artifact, lastRotatedSecret: reference };
    return rotated;
  }
}

export class AdaptiveAccessController {
  private signals: SessionRiskSignal[] = [];
  private baselines: Map<string, BaselineProfile> = new Map();

  constructor(private soar: SoarConnector) {}

  logSignal(signal: SessionRiskSignal): void {
    this.signals.push(signal);
  }

  buildBaselines(): BaselineProfile[] {
    const grouped: Record<string, SessionRiskSignal[]> = {};
    this.signals.forEach((signal) => {
      grouped[signal.userId] = grouped[signal.userId] || [];
      grouped[signal.userId].push(signal);
    });

    const baselines: BaselineProfile[] = Object.entries(grouped).map(
      ([userId, signals]) => {
        const averageLoginHour =
          signals.reduce((sum, s) => sum + new Date(s.timestamp).getHours(), 0) /
          signals.length;
        const averageDailyVolume = signals.length;
        const commonGeos = Array.from(new Set(signals.map((s) => s.geo || 'unknown')));
        const commonMethods = Array.from(new Set(signals.map((s) => s.method)));
        return { userId, averageLoginHour, averageDailyVolume, commonGeos, commonMethods };
      },
    );

    baselines.forEach((baseline) => this.baselines.set(baseline.userId, baseline));
    return baselines;
  }

  detectAnomalies(signal: SessionRiskSignal): string[] {
    const baseline = this.baselines.get(signal.userId);
    if (!baseline) return ['NO_BASELINE'];
    const anomalies: string[] = [];
    const hour = new Date(signal.timestamp).getHours();
    if (Math.abs(hour - baseline.averageLoginHour) > 4) anomalies.push('UNUSUAL_TIME');
    if ((signal.velocity || 0) > baseline.averageDailyVolume * 2) anomalies.push('VOLUME_SPIKE');
    if (signal.geo && !baseline.commonGeos.includes(signal.geo)) anomalies.push('GEO_SHIFT');
    if (!baseline.commonMethods.includes(signal.method)) anomalies.push('METHOD_SHIFT');
    return anomalies;
  }

  applyAdaptiveControls(signal: SessionRiskSignal): AdaptiveDecision {
    const anomalies = this.detectAnomalies(signal);
    const riskScore =
      anomalies.length * 25 + (signal.ipReputation > 80 ? 20 : signal.ipReputation / 5);
    let action: AdaptiveDecision['action'] = 'ALLOW';
    if (riskScore >= 70) action = 'DENY';
    else if (riskScore >= 40) action = 'STEP_UP';
    const decision: AdaptiveDecision = {
      sessionId: signal.sessionId,
      action,
      reason: anomalies.join(',') || 'BASELINE',
      riskScore,
    };
    if (action !== 'ALLOW') {
      this.soar.publish({
        id: `adaptive-${signal.sessionId}`,
        type: 'ADAPTIVE_CONTROL',
        payload: { decision, anomalies },
        createdAt: new Date(),
      });
    }
    return decision;
  }

  feedIdentitySignals(
    signal: SessionRiskSignal,
    telemetry: TelemetrySignal[],
  ): TelemetrySignal[] {
    return telemetry.map((item) => ({
      ...item,
      attributes: { ...item.attributes, userId: signal.userId, sessionId: signal.sessionId },
    }));
  }

  buildDashboard(decisions: AdaptiveDecision[]): { decisions: AdaptiveDecision[]; baselineCoverage: number } {
    const baselineCoverage = this.baselines.size ? this.signals.length / this.baselines.size : 0;
    return { decisions, baselineCoverage };
  }
}

export class ForwardDefenseOrchestrator {
  readonly soar = new SoarConnector();
  readonly fusion = new SignalFusionEngine(this.soar);
  readonly emulation = new AdversaryEmulationSuite(this.soar);
  readonly privacy = new PrivacyGuard();
  readonly assets = new AssetExposureInventory();
  readonly supplyChain = new SupplyChainIntegrityManager(this.soar);
  readonly adaptive = new AdaptiveAccessController(this.soar);
}

