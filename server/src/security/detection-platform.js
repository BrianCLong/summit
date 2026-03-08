"use strict";
/**
 * Defensive Threat Detection and Validation Platform
 *
 * Provides MITRE ATT&CK aligned detection rule management, safe validation
 * workflows, control effectiveness reporting, and threat hunting analytics
 * without executing destructive payloads. Designed to support purple team
 * collaboration and continuous improvement of detection coverage.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatHuntingAnalytics = exports.PurpleTeamRunbook = exports.ControlEffectivenessAnalyzer = exports.DetectionScenarioValidator = exports.DetectionRuleRegistry = void 0;
class DetectionRuleRegistry {
    rules = new Map();
    constructor(initialRules = []) {
        initialRules.forEach((rule) => this.registerRule(rule));
    }
    registerRule(rule) {
        if (this.rules.has(rule.id)) {
            throw new Error(`Rule with id ${rule.id} already exists`);
        }
        this.rules.set(rule.id, rule);
    }
    updateRule(id, updates) {
        const existing = this.rules.get(id);
        if (!existing) {
            throw new Error(`Rule with id ${id} not found`);
        }
        const updated = { ...existing, ...updates };
        this.rules.set(id, updated);
        return updated;
    }
    listAll() {
        return Array.from(this.rules.values());
    }
    listByTactic(tactic) {
        return this.listAll().filter((rule) => rule.mitre.tactic.toLowerCase() === tactic.toLowerCase());
    }
    findByTechnique(techniqueId) {
        return this.listAll().filter((rule) => rule.mitre.techniqueId === techniqueId);
    }
    coverageByTactic() {
        return this.listAll().reduce((acc, rule) => {
            const key = rule.mitre.tactic;
            if (!acc[key]) {
                acc[key] = {
                    tactic: key,
                    techniques: new Set(),
                    rules: [],
                };
            }
            acc[key].techniques.add(rule.mitre.techniqueId);
            acc[key].rules.push(rule);
            return acc;
        }, {});
    }
}
exports.DetectionRuleRegistry = DetectionRuleRegistry;
class DetectionScenarioValidator {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    validateScenario(scenario) {
        const matchedRules = this.registry
            .findByTechnique(scenario.techniqueId)
            .filter((rule) => rule.enabled);
        const coverageGaps = scenario.expectedSignals.filter((signal) => !matchedRules.some((rule) => rule.dataSources.some((source) => source.toLowerCase() === signal.toLowerCase())));
        const outcome = matchedRules.length === 0
            ? 'coverage_gap'
            : coverageGaps.length > 0
                ? 'needs_tuning'
                : 'pass';
        const safeToExecute = scenario.safetyLevel !== 'controlled-production' ||
            scenario.safeguards.includes('kill-switch');
        const recommendations = [];
        if (matchedRules.length === 0) {
            recommendations.push(`Add detection for ${scenario.techniqueId} (${scenario.tactic}) aligned to MITRE ATT&CK`);
        }
        if (coverageGaps.length > 0) {
            recommendations.push(`Augment data sources to capture: ${coverageGaps.join(', ')}`);
        }
        if (!safeToExecute) {
            recommendations.push('Add safeguards (kill-switch, canary scope) before running in production');
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
    validateMany(scenarios) {
        return scenarios.map((scenario) => this.validateScenario(scenario));
    }
}
exports.DetectionScenarioValidator = DetectionScenarioValidator;
class ControlEffectivenessAnalyzer {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    generateReport(results) {
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
exports.ControlEffectivenessAnalyzer = ControlEffectivenessAnalyzer;
class PurpleTeamRunbook {
    entries = new Map();
    addEntry(entry) {
        if (this.entries.has(entry.id)) {
            throw new Error(`Entry with id ${entry.id} already exists`);
        }
        this.entries.set(entry.id, entry);
        return entry;
    }
    updateStatus(id, status) {
        const entry = this.entries.get(id);
        if (!entry) {
            throw new Error(`Entry ${id} not found`);
        }
        const updated = { ...entry, status };
        this.entries.set(id, updated);
        return updated;
    }
    logUpdate(id, actor, note) {
        const entry = this.entries.get(id);
        if (!entry) {
            throw new Error(`Entry ${id} not found`);
        }
        const update = { timestamp: new Date(), actor, note };
        const updated = {
            ...entry,
            updates: [...entry.updates, update],
        };
        this.entries.set(id, updated);
        return updated;
    }
    list(status) {
        const entries = Array.from(this.entries.values());
        if (!status) {
            return entries;
        }
        return entries.filter((entry) => entry.status === status);
    }
}
exports.PurpleTeamRunbook = PurpleTeamRunbook;
class ThreatHuntingAnalytics {
    signals = [];
    recordSignal(signal) {
        this.signals.push(signal);
    }
    generateReport() {
        const detectionVolumeBySeverity = {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0,
        };
        let falsePositives = 0;
        const dwellTimes = [];
        const techniqueCounts = {};
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
    calculateMedian(values) {
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
exports.ThreatHuntingAnalytics = ThreatHuntingAnalytics;
