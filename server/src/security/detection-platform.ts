/**
 * Defensive Threat Detection and Validation Platform
 *
 * Provides MITRE ATT&CK aligned detection rule management, safe validation
 * workflows, control effectiveness reporting, and threat hunting analytics
 * without executing destructive payloads. Designed to support purple team
 * collaboration and continuous improvement of detection coverage.
 */

export type DetectionSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DetectionType = 'signature' | 'behavioral' | 'anomaly';

export interface MitreAttackMapping {
  tactic: string;
  techniqueId: string;
  technique: string;
  subTechnique?: string;
}

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  severity: DetectionSeverity;
  detectionType: DetectionType;
  mitre: MitreAttackMapping;
  dataSources: string[];
  detectionLogic: string;
  enabled: boolean;
  validationStatus: 'draft' | 'validated' | 'needs_tuning';
  owner?: string;
}

export type SimulationSafetyLevel =
  | 'lab'
  | 'canary'
  | 'controlled-production';

export interface DetectionScenario {
  id: string;
  name: string;
  description: string;
  tactic: string;
  techniqueId: string;
  expectedSignals: string[];
  validationChecks: string[];
  safetyLevel: SimulationSafetyLevel;
  safeguards: string[];
  hypothesis: string;
}

export type ValidationOutcome = 'pass' | 'needs_tuning' | 'coverage_gap';

export interface ValidationResult {
  scenarioId: string;
  matchedRules: string[];
  coverageGaps: string[];
  outcome: ValidationOutcome;
  safeToExecute: boolean;
  recommendations: string[];
}

export interface CoverageMap {
  tactic: string;
  techniques: Set<string>;
  rules: DetectionRule[];
}

export interface ControlEffectivenessReport {
  totalRules: number;
  validatedRules: number;
  coverageByTactic: Record<string, CoverageMap>;
  scenariosTested: number;
  coverageGaps: string[];
  needsTuning: string[];
}

export interface PurpleTeamEntry {
  id: string;
  title: string;
  ruleId?: string;
  scenarioId?: string;
  owner: string;
  status: 'planned' | 'in-progress' | 'ready-for-validation' | 'validated';
  nextAction?: string;
  updates: { timestamp: Date; actor: string; note: string }[];
}

export interface HuntingSignal {
  techniqueId: string;
  severity: DetectionSeverity;
  classification: 'true_positive' | 'false_positive' | 'informational';
  dwellTimeMinutes?: number;
}

export interface ThreatHuntingAnalyticsReport {
  detectionVolumeBySeverity: Record<DetectionSeverity, number>;
  falsePositiveRate: number;
  medianDwellTimeMinutes: number;
  techniquesByPrevalence: string[];
}

export class DetectionRuleRegistry {
  private readonly rules: Map<string, DetectionRule> = new Map();

  constructor(initialRules: DetectionRule[] = []) {
    initialRules.forEach((rule) => this.registerRule(rule));
  }

  registerRule(rule: DetectionRule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule with id ${rule.id} already exists`);
    }
    this.rules.set(rule.id, rule);
  }

  updateRule(id: string, updates: Partial<DetectionRule>): DetectionRule {
    const existing = this.rules.get(id);
    if (!existing) {
      throw new Error(`Rule with id ${id} not found`);
    }
    const updated = { ...existing, ...updates } as DetectionRule;
    this.rules.set(id, updated);
    return updated;
  }

  listAll(): DetectionRule[] {
    return Array.from(this.rules.values());
  }

  listByTactic(tactic: string): DetectionRule[] {
    return this.listAll().filter(
      (rule) => rule.mitre.tactic.toLowerCase() === tactic.toLowerCase(),
    );
  }

  findByTechnique(techniqueId: string): DetectionRule[] {
    return this.listAll().filter(
      (rule) => rule.mitre.techniqueId === techniqueId,
    );
  }

  coverageByTactic(): Record<string, CoverageMap> {
    return this.listAll().reduce<Record<string, CoverageMap>>(
      (acc, rule) => {
        const key = rule.mitre.tactic;
        if (!acc[key]) {
          acc[key] = {
            tactic: key,
            techniques: new Set<string>(),
            rules: [],
          };
        }
        acc[key].techniques.add(rule.mitre.techniqueId);
        acc[key].rules.push(rule);
        return acc;
      },
      {},
    );
  }
}

export class DetectionScenarioValidator {
  constructor(private readonly registry: DetectionRuleRegistry) {}

  validateScenario(scenario: DetectionScenario): ValidationResult {
    const matchedRules = this.registry
      .findByTechnique(scenario.techniqueId)
      .filter((rule) => rule.enabled);

    const coverageGaps = scenario.expectedSignals.filter(
      (signal) =>
        !matchedRules.some((rule) =>
          rule.dataSources.some(
            (source) => source.toLowerCase() === signal.toLowerCase(),
          ),
        ),
    );

    const outcome: ValidationOutcome = matchedRules.length === 0
      ? 'coverage_gap'
      : coverageGaps.length > 0
        ? 'needs_tuning'
        : 'pass';

    const safeToExecute =
      scenario.safetyLevel !== 'controlled-production' ||
      scenario.safeguards.includes('kill-switch');

    const recommendations: string[] = [];
    if (matchedRules.length === 0) {
      recommendations.push(
        `Add detection for ${scenario.techniqueId} (${scenario.tactic}) aligned to MITRE ATT&CK`,
      );
    }
    if (coverageGaps.length > 0) {
      recommendations.push(
        `Augment data sources to capture: ${coverageGaps.join(', ')}`,
      );
    }
    if (!safeToExecute) {
      recommendations.push(
        'Add safeguards (kill-switch, canary scope) before running in production',
      );
    }

    return {
      scenarioId: scenario.id,
      matchedRules: matchedRules.map((rule) => rule.id),
      coverageGaps,
      outcome,
      safeToExecute,
      recommendations,
    };
  }

  validateMany(scenarios: DetectionScenario[]): ValidationResult[] {
    return scenarios.map((scenario) => this.validateScenario(scenario));
  }
}

export class ControlEffectivenessAnalyzer {
  constructor(private readonly registry: DetectionRuleRegistry) {}

  generateReport(results: ValidationResult[]): ControlEffectivenessReport {
    const coverageByTactic = this.registry.coverageByTactic();

    const coverageGaps = results
      .filter((result) => result.outcome === 'coverage_gap')
      .map((result) => result.scenarioId);
    const needsTuning = results
      .filter((result) => result.outcome === 'needs_tuning')
      .map((result) => result.scenarioId);

    const validatedRules = this.registry
      .listAll()
      .filter((rule) => rule.validationStatus === 'validated').length;

    return {
      totalRules: this.registry.listAll().length,
      validatedRules,
      coverageByTactic,
      scenariosTested: results.length,
      coverageGaps,
      needsTuning,
    };
  }
}

export class PurpleTeamRunbook {
  private readonly entries: Map<string, PurpleTeamEntry> = new Map();

  addEntry(entry: PurpleTeamEntry): PurpleTeamEntry {
    if (this.entries.has(entry.id)) {
      throw new Error(`Entry with id ${entry.id} already exists`);
    }
    this.entries.set(entry.id, entry);
    return entry;
  }

  updateStatus(id: string, status: PurpleTeamEntry['status']): PurpleTeamEntry {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`Entry ${id} not found`);
    }
    const updated: PurpleTeamEntry = { ...entry, status };
    this.entries.set(id, updated);
    return updated;
  }

  logUpdate(id: string, actor: string, note: string): PurpleTeamEntry {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`Entry ${id} not found`);
    }
    const update = { timestamp: new Date(), actor, note };
    const updated: PurpleTeamEntry = {
      ...entry,
      updates: [...entry.updates, update],
    };
    this.entries.set(id, updated);
    return updated;
  }

  list(status?: PurpleTeamEntry['status']): PurpleTeamEntry[] {
    const entries = Array.from(this.entries.values());
    if (!status) {
      return entries;
    }
    return entries.filter((entry) => entry.status === status);
  }
}

export class ThreatHuntingAnalytics {
  private readonly signals: HuntingSignal[] = [];

  recordSignal(signal: HuntingSignal): void {
    this.signals.push(signal);
  }

  generateReport(): ThreatHuntingAnalyticsReport {
    const detectionVolumeBySeverity: Record<DetectionSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let falsePositives = 0;
    const dwellTimes: number[] = [];
    const techniqueCounts: Record<string, number> = {};

    for (const signal of this.signals) {
      detectionVolumeBySeverity[signal.severity] += 1;
      if (signal.classification === 'false_positive') {
        falsePositives += 1;
      }
      if (signal.dwellTimeMinutes) {
        dwellTimes.push(signal.dwellTimeMinutes);
      }
      techniqueCounts[signal.techniqueId] =
        (techniqueCounts[signal.techniqueId] || 0) + 1;
    }

    const falsePositiveRate = this.signals.length
      ? Number(((falsePositives / this.signals.length) * 100).toFixed(2))
      : 0;

    const medianDwellTimeMinutes = this.calculateMedian(dwellTimes);
    const techniquesByPrevalence = Object.entries(techniqueCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([techniqueId]) => techniqueId);

    return {
      detectionVolumeBySeverity,
      falsePositiveRate,
      medianDwellTimeMinutes,
      techniquesByPrevalence,
    };
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }
}
