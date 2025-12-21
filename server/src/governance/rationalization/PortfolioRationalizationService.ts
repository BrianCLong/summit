import crypto from 'crypto';
import { PortfolioRationalizationRepository } from './PortfolioRationalizationRepository.js';
import {
  CompatModeToggle,
  CompatWindow,
  DeprecationPlan,
  DuplicateOutcomeArea,
  FeatureUsageGraph,
  MigrationAdapter,
  ModuleClassification,
  ModuleRecord,
  RationalizationState,
  RemovalEvent,
  SegmentImpact,
  TelemetrySnapshot,
  UISurfaceReduction,
} from './types.js';

interface ModuleInput {
  id: string;
  name: string;
  owner: string;
  outcomes: string[];
  features: string[];
  usage: number;
  revenue: number;
  incidentRate: number;
}

interface FeatureRequestContext {
  requester: string;
  description: string;
  execApproved?: boolean;
  gmApproved?: boolean;
}

interface RemovalRequestOptions {
  enforceCompat?: boolean;
  expectedReliabilityGain?: number;
  expectedSpeedGainMs?: number;
  expectedSupportDelta?: number;
}

export class PortfolioRationalizationService {
  private state: RationalizationState = {
    modules: {},
    duplicateOutcomeAreas: [],
    compatModes: [],
    removalEvents: [],
  };
  private readonly repository: PortfolioRationalizationRepository;
  private readonly adapterHandlers: Map<string, (payload: any) => any> = new Map();
  private readonly ready: Promise<void>;

  constructor(repository = new PortfolioRationalizationRepository()) {
    this.repository = repository;
    this.ready = this.initialize();
  }

  private async initialize() {
    this.state = await this.repository.load();
  }

  private async persist() {
    await this.repository.save(this.state);
  }

  async upsertModule(input: ModuleInput): Promise<ModuleRecord> {
    await this.ready;
    const existing = this.state.modules[input.id];
    const record: ModuleRecord = {
      ...existing,
      ...input,
      classification: existing?.classification ?? 'MAINTAIN',
      horizonMonths: existing?.horizonMonths ?? 6,
      telemetry: existing?.telemetry ?? [],
      migrationAdapters: existing?.migrationAdapters ?? [],
      duplicateOutcomeArea: existing?.duplicateOutcomeArea,
      canonicalPath: existing?.canonicalPath,
      featureFreeze: existing?.featureFreeze,
      featureFreezeApprovedBy: existing?.featureFreezeApprovedBy,
      uiSurfaceReduction: existing?.uiSurfaceReduction,
      retiredAt: existing?.retiredAt,
    };
    this.state.modules[input.id] = record;
    await this.persist();
    return record;
  }

  async listModules(): Promise<ModuleRecord[]> {
    await this.ready;
    return Object.values(this.state.modules);
  }

  async getModule(id: string): Promise<ModuleRecord | undefined> {
    await this.ready;
    return this.state.modules[id];
  }

  async classifyModule(
    moduleId: string,
    classification: ModuleClassification,
    reason: string,
    horizonMonths = 6,
  ): Promise<ModuleRecord> {
    await this.ready;
    const module = this.state.modules[moduleId];
    if (!module) throw new Error(`Module ${moduleId} not found`);
    module.classification = classification;
    module.classificationReason = reason;
    module.horizonMonths = horizonMonths;
    module.featureFreeze = classification === 'RETIRE';
    module.featureFreezeApprovedBy = undefined;
    await this.persist();
    return module;
  }

  assertFeatureDeliveryAllowed(moduleId: string, request: FeatureRequestContext): void {
    if (!this.state) {
      throw new Error('Service not initialized');
    }
    const module = this.state.modules[moduleId];
    if (!module) throw new Error(`Module ${moduleId} not found`);
    if (module.classification === 'RETIRE' && module.featureFreeze) {
      if (request.execApproved && request.gmApproved) {
        module.featureFreezeApprovedBy = `${request.requester}:exec+gm`;
        return;
      }
      throw new Error(
        `Feature delivery frozen for module ${moduleId}; exec and GM approval required for exceptions`,
      );
    }
  }

  async registerDuplicateOutcome(
    name: string,
    modules: string[],
    canonicalModuleId: string,
    evidence: string,
  ): Promise<DuplicateOutcomeArea> {
    await this.ready;
    if (!modules.includes(canonicalModuleId)) {
      throw new Error('Canonical module must be part of the duplicate set');
    }
    const entry: DuplicateOutcomeArea = {
      name,
      modules: [...new Set(modules)],
      canonicalModuleId,
      detectedAt: new Date().toISOString(),
      evidence,
    };
    this.state.duplicateOutcomeAreas.push(entry);
    entry.modules.forEach((id) => {
      const module = this.state.modules[id];
      if (module) {
        module.duplicateOutcomeArea = name;
        module.canonicalPath = canonicalModuleId;
      }
    });
    await this.persist();
    return entry;
  }

  suggestDuplicateOutcomesFromUsageGraph(
    usageGraph: FeatureUsageGraph,
    similarityThreshold = 0.6,
  ): DuplicateOutcomeArea[] {
    if (!this.state) {
      throw new Error('Service not initialized');
    }
    const areas: DuplicateOutcomeArea[] = [];
    const moduleIds = Object.keys(this.state.modules);
    for (let i = 0; i < moduleIds.length; i += 1) {
      for (let j = i + 1; j < moduleIds.length; j += 1) {
        const first = this.state.modules[moduleIds[i]];
        const second = this.state.modules[moduleIds[j]];
        const similarity = this.calculateOutcomeSimilarity(first, second, usageGraph);
        if (similarity >= similarityThreshold) {
          areas.push({
            name: `${first.name}-${second.name}-duplicate-outcome`,
            modules: [first.id, second.id],
            canonicalModuleId: first.usage >= second.usage ? first.id : second.id,
            detectedAt: new Date().toISOString(),
            evidence: `Outcome overlap ${(similarity * 100).toFixed(1)}% with shared features`,
          });
        }
      }
    }
    return areas;
  }

  private calculateOutcomeSimilarity(
    first: ModuleRecord,
    second: ModuleRecord,
    usageGraph: FeatureUsageGraph,
  ): number {
    const featureKey = (id: string) => `${id}`;
    const firstFeatures = new Set(first.features.map((f) => featureKey(f)));
    const secondFeatures = new Set(second.features.map((f) => featureKey(f)));
    const sharedFeatures = [...firstFeatures].filter((f) => secondFeatures.has(f));
    if (!sharedFeatures.length) return 0;
    let overlapScore = 0;
    let totalScore = 0;
    sharedFeatures.forEach((feature) => {
      const usage = usageGraph[feature] || [];
      const totals = usage.reduce((sum, entry) => sum + entry.count, 0);
      const dominantOutcome = usage.reduce(
        (acc, entry) => (entry.count > acc.count ? entry : acc),
        { outcome: '', count: 0 },
      );
      totalScore += totals;
      const contributesToFirst = first.outcomes.includes(dominantOutcome.outcome);
      const contributesToSecond = second.outcomes.includes(dominantOutcome.outcome);
      if (contributesToFirst && contributesToSecond) {
        overlapScore += dominantOutcome.count;
      }
    });
    if (totalScore === 0) return 0;
    return overlapScore / totalScore;
  }

  async recordTelemetry(moduleId: string, telemetry: TelemetrySnapshot): Promise<ModuleRecord> {
    await this.ready;
    const module = this.state.modules[moduleId];
    if (!module) throw new Error(`Module ${moduleId} not found`);
    module.telemetry.push(telemetry);
    module.usage = telemetry.activeUsers;
    await this.persist();
    return module;
  }

  async planDeprecation(
    moduleId: string,
    segments: SegmentImpact[],
    compat: CompatWindow,
    exceptionPolicy: string[],
  ): Promise<ModuleRecord> {
    await this.ready;
    const module = this.state.modules[moduleId];
    if (!module) throw new Error(`Module ${moduleId} not found`);
    const calendarId = crypto.createHash('sha256').update(`${moduleId}-${Date.now()}`).digest('hex');
    const plan: DeprecationPlan = {
      calendarId,
      segments,
      compat,
      exceptionPolicy,
    };
    module.deprecationPlan = plan;
    await this.persist();
    return module;
  }

  async registerMigrationAdapter(
    moduleId: string,
    adapter: Omit<MigrationAdapter, 'registeredAt'>,
    handler: (payload: any) => any,
  ): Promise<MigrationAdapter> {
    await this.ready;
    const module = this.state.modules[moduleId];
    if (!module) throw new Error(`Module ${moduleId} not found`);
    const registration: MigrationAdapter = {
      ...adapter,
      registeredAt: new Date().toISOString(),
    };
    module.migrationAdapters.push(registration);
    this.adapterHandlers.set(`${moduleId}:${adapter.name}`, handler);
    await this.persist();
    return registration;
  }

  executeMigrationAdapter(moduleId: string, adapterName: string, payload: any): any {
    if (!this.state) {
      throw new Error('Service not initialized');
    }
    const key = `${moduleId}:${adapterName}`;
    const handler = this.adapterHandlers.get(key);
    if (!handler) {
      throw new Error(`Adapter ${adapterName} not registered for module ${moduleId}`);
    }
    return handler(payload);
  }

  async recordUISurfaceReduction(
    moduleId: string,
    reduction: UISurfaceReduction,
  ): Promise<ModuleRecord> {
    await this.ready;
    const module = this.state.modules[moduleId];
    if (!module) throw new Error(`Module ${moduleId} not found`);
    module.uiSurfaceReduction = reduction;
    await this.persist();
    return module;
  }

  async requestRemoval(moduleId: string, options: RemovalRequestOptions = {}): Promise<RemovalEvent> {
    await this.ready;
    const module = this.state.modules[moduleId];
    if (!module) throw new Error(`Module ${moduleId} not found`);
    if (module.classification !== 'RETIRE') {
      throw new Error(`Module ${moduleId} not approved for retirement`);
    }
    if (!module.deprecationPlan) {
      throw new Error('Deprecation plan required before removal');
    }
    const recentTelemetry = module.telemetry.filter((t) => {
      const daysOld = (Date.now() - new Date(t.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      return daysOld <= 30;
    });
    if (!recentTelemetry.length) {
      throw new Error('Recent telemetry evidence is required before removal');
    }
    if (!module.migrationAdapters.length) {
      throw new Error('At least one migration adapter must exist for legacy callers');
    }
    if (options.enforceCompat !== false) {
      const compatEnd = new Date(module.deprecationPlan.compat.endsAt).getTime();
      if (Date.now() < compatEnd) {
        throw new Error('Compat window still active; cannot hard cut yet');
      }
    }
    module.retiredAt = new Date().toISOString();
    const reliabilityGainPct = options.expectedReliabilityGain ?? Math.max(0, 10 - module.incidentRate);
    const speedGainMs = options.expectedSpeedGainMs ?? 50;
    const supportLoadDelta = options.expectedSupportDelta ?? Math.ceil(module.incidentRate * 0.2);
    const event: RemovalEvent = {
      moduleId,
      removedAt: module.retiredAt,
      speedGainMs,
      reliabilityGainPct,
      supportLoadDelta,
    };
    this.state.removalEvents.push(event);
    await this.persist();
    return event;
  }

  async toggleCompatModeForCohort(
    cohort: string,
    enabled: boolean,
    reason: string,
    expiresAt?: string,
  ): Promise<CompatModeToggle> {
    await this.ready;
    const toggle: CompatModeToggle = {
      cohort,
      enabled,
      reason,
      expiresAt,
      toggledAt: new Date().toISOString(),
    };
    const filtered = this.state.compatModes.filter((entry) => entry.cohort !== cohort);
    this.state.compatModes = [...filtered, toggle];
    await this.persist();
    return toggle;
  }

  isCompatModeEnabled(cohort: string): boolean {
    const toggle = this.state.compatModes.find((entry) => entry.cohort === cohort);
    if (!toggle) return false;
    if (toggle.expiresAt && Date.now() > new Date(toggle.expiresAt).getTime()) {
      return false;
    }
    return toggle.enabled;
  }

  enforceCanonicalNavigation(navigationEntries: string[]): string[] {
    const canonicalized = new Set<string>();
    const duplicateToCanonical = new Map<string, string>();
    this.state.duplicateOutcomeAreas.forEach((area) => {
      area.modules.forEach((moduleId) => duplicateToCanonical.set(moduleId, area.canonicalModuleId));
    });
    navigationEntries.forEach((entry) => {
      const canonical = duplicateToCanonical.get(entry) || entry;
      canonicalized.add(canonical);
    });
    return Array.from(canonicalized);
  }

  generateDeletionReport(month: string): {
    removed: RemovalEvent[];
    retained: string[];
    wins: { speed: number; reliability: number; support: number };
  } {
    const removed = this.state.removalEvents.filter((event) =>
      event.removedAt.startsWith(month),
    );
    const wins = removed.reduce(
      (acc, event) => ({
        speed: acc.speed + event.speedGainMs,
        reliability: acc.reliability + event.reliabilityGainPct,
        support: acc.support + event.supportLoadDelta,
      }),
      { speed: 0, reliability: 0, support: 0 },
    );
    const retained = Object.values(this.state.modules)
      .filter((module) => module.classification !== 'RETIRE' || !module.retiredAt)
      .map((module) => module.id);
    return { removed, retained, wins };
  }
}
