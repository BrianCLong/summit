"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatAnalyticsEngine = void 0;
const alert_manager_1 = require("./alert-manager");
const behavioral_model_1 = require("./behavioral-model");
const correlation_engine_1 = require("./correlation-engine");
const entity_resolution_1 = require("./entity-resolution");
const pattern_recognition_1 = require("./pattern-recognition");
const rule_engine_1 = require("./rule-engine");
const threat_scoring_1 = require("./threat-scoring");
const temporal_analysis_1 = require("./temporal-analysis");
const triage_1 = require("./triage");
function matchIndicators(event, indicators) {
    const matches = [];
    for (const indicator of indicators) {
        if (indicator.type === 'ip' && indicator.value === event.context?.ip) {
            matches.push(indicator);
        }
        if (indicator.type === 'user' && indicator.value === event.actor) {
            matches.push(indicator);
        }
        if (indicator.type === 'domain' && typeof event.attributes?.host === 'string') {
            if (event.attributes.host.includes(indicator.value)) {
                matches.push(indicator);
            }
        }
        if (indicator.type === 'hash' && event.attributes?.hash === indicator.value) {
            matches.push(indicator);
        }
        if (indicator.type === 'uri' && typeof event.attributes?.uri === 'string') {
            if (event.attributes.uri.includes(indicator.value)) {
                matches.push(indicator);
            }
        }
    }
    return matches;
}
class ThreatAnalyticsEngine {
    behavior;
    patterns;
    temporal = new temporal_analysis_1.TemporalAnalyzer();
    correlation = new correlation_engine_1.CorrelationEngine();
    triage = new triage_1.TriageEngine();
    alerts = new alert_manager_1.AlertManager();
    entities = new entity_resolution_1.EntityResolver();
    rules;
    scorer = new threat_scoring_1.ThreatScorer();
    intelClients = [];
    intelIndicators = [];
    intelOptions;
    constructor(options) {
        this.behavior = new behavioral_model_1.BehavioralModel(options?.behavior);
        this.patterns = new pattern_recognition_1.PatternRecognizer(options?.patternLibrary ?? (0, pattern_recognition_1.defaultPatterns)());
        this.rules = new rule_engine_1.DetectionRuleEngine(options?.rules ?? []);
        this.intelOptions = {
            minConfidence: options?.intel?.minConfidence ?? 0,
            now: options?.intel?.now ?? Date.now,
        };
    }
    registerIntelClient(client) {
        this.intelClients.push(client);
    }
    registerRule(rule) {
        this.rules.register(rule);
    }
    registerEntity(profile) {
        this.entities.registerProfile(profile);
    }
    async syncIntel() {
        const indicators = [];
        for (const client of this.intelClients) {
            const fetched = await client.fetchIndicators();
            indicators.push(...fetched);
        }
        const now = this.intelOptions.now();
        const byKey = new Map();
        for (const indicator of indicators) {
            if (indicator.confidence < this.intelOptions.minConfidence) {
                continue;
            }
            if (indicator.validUntil) {
                const expires = Date.parse(indicator.validUntil);
                if (Number.isFinite(expires) && expires < now) {
                    continue;
                }
            }
            const key = `${indicator.type}:${indicator.value}`;
            const existing = byKey.get(key);
            if (!existing) {
                byKey.set(key, indicator);
                continue;
            }
            if (indicator.confidence > existing.confidence) {
                byKey.set(key, indicator);
            }
            else if (indicator.confidence === existing.confidence) {
                const existingExpiry = existing.validUntil ? Date.parse(existing.validUntil) : undefined;
                const candidateExpiry = indicator.validUntil ? Date.parse(indicator.validUntil) : undefined;
                if (existingExpiry !== undefined && candidateExpiry !== undefined &&
                    Number.isFinite(existingExpiry) &&
                    Number.isFinite(candidateExpiry) &&
                    candidateExpiry > existingExpiry) {
                    byKey.set(key, indicator);
                }
            }
        }
        this.intelIndicators = Array.from(byKey.values());
        return this.intelIndicators;
    }
    processEvent(event) {
        const resolved = this.entities.resolve(event);
        const behavior = this.behavior.analyze(resolved);
        const patternMatches = this.patterns.observe(resolved);
        const temporal = this.temporal.observe(resolved);
        const indicatorHits = matchIndicators(resolved, this.intelIndicators);
        const correlation = this.correlation.correlate({
            event: resolved,
            behavior: behavior ?? undefined,
            patterns: patternMatches,
            indicators: indicatorHits,
        });
        const ruleHits = this.rules.evaluate({
            event: resolved,
            behavior: behavior ?? undefined,
            patterns: patternMatches,
            temporal,
            indicators: indicatorHits,
        });
        const score = this.scorer.score(resolved.entityId, behavior ?? undefined, patternMatches, correlation, ruleHits.map((rule) => rule.id));
        const triage = this.triage.plan(score);
        const alerts = [];
        if (behavior || patternMatches.length > 0 || ruleHits.length > 0 || indicatorHits.length > 0) {
            alerts.push(this.alerts.raise({
                entityId: resolved.entityId,
                title: 'Advanced threat detection alert',
                description: this.describeAlert(score, patternMatches, indicatorHits),
                severity: score.severity,
                score: score.score,
                indicators: indicatorHits,
                patternMatches,
                behavior: behavior ?? undefined,
                temporal,
                triage,
                ruleIds: ruleHits.map((rule) => rule.id),
            }));
        }
        return alerts;
    }
    listAlerts() {
        return this.alerts.list();
    }
    describeAlert(score, patterns, indicators) {
        const parts = [`composite threat score ${score.score.toFixed(2)} (${score.severity})`];
        if (patterns.length > 0) {
            parts.push(`patterns: ${patterns.map((p) => p.pattern).join(', ')}`);
        }
        if (indicators.length > 0) {
            parts.push(`intel hits: ${indicators.map((i) => `${i.type}:${i.value}`).join(', ')}`);
        }
        return parts.join(' | ');
    }
}
exports.ThreatAnalyticsEngine = ThreatAnalyticsEngine;
