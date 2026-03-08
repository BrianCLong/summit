"use strict";
/**
 * Multi-Domain Intelligence Fusion Analytics
 *
 * Cross-domain correlation, entity resolution, and unified threat picture
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FusionEngine = exports.ThreatPictureSchema = exports.FusedEntitySchema = exports.IntelReportSchema = exports.IntelligenceDomainSchema = void 0;
const zod_1 = require("zod");
exports.IntelligenceDomainSchema = zod_1.z.enum([
    'SIGINT', 'HUMINT', 'OSINT', 'GEOINT', 'MASINT', 'TECHINT',
    'CYBER', 'FININT', 'SOCMINT', 'DARKWEB', 'SUPPLY_CHAIN'
]);
exports.IntelReportSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    domain: exports.IntelligenceDomainSchema,
    timestamp: zod_1.z.date(),
    classification: zod_1.z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET', 'SCI']),
    source: zod_1.z.object({
        id: zod_1.z.string(),
        type: zod_1.z.string(),
        reliability: zod_1.z.enum(['A', 'B', 'C', 'D', 'E', 'F']),
        credibility: zod_1.z.number().min(1).max(6)
    }),
    content: zod_1.z.object({
        summary: zod_1.z.string(),
        details: zod_1.z.string(),
        rawData: zod_1.z.any().optional()
    }),
    entities: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['PERSON', 'ORGANIZATION', 'LOCATION', 'DEVICE', 'NETWORK', 'THREAT', 'CAMPAIGN']),
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        confidence: zod_1.z.number(),
        attributes: zod_1.z.record(zod_1.z.any())
    })),
    relationships: zod_1.z.array(zod_1.z.object({
        source: zod_1.z.string(),
        target: zod_1.z.string(),
        type: zod_1.z.string(),
        confidence: zod_1.z.number()
    })),
    indicators: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        value: zod_1.z.string(),
        context: zod_1.z.string().optional()
    })),
    assessment: zod_1.z.object({
        confidence: zod_1.z.number(),
        reliability: zod_1.z.number(),
        timeliness: zod_1.z.enum(['CURRENT', 'RECENT', 'DATED', 'HISTORICAL'])
    })
});
exports.FusedEntitySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    canonicalName: zod_1.z.string(),
    type: zod_1.z.enum(['PERSON', 'ORGANIZATION', 'LOCATION', 'DEVICE', 'NETWORK', 'THREAT', 'CAMPAIGN']),
    aliases: zod_1.z.array(zod_1.z.string()),
    sources: zod_1.z.array(zod_1.z.object({ domain: exports.IntelligenceDomainSchema, reportId: zod_1.z.string(), confidence: zod_1.z.number() })),
    attributes: zod_1.z.record(zod_1.z.array(zod_1.z.object({ value: zod_1.z.any(), source: zod_1.z.string(), confidence: zod_1.z.number(), timestamp: zod_1.z.date() }))),
    relationships: zod_1.z.array(zod_1.z.object({
        targetId: zod_1.z.string(),
        type: zod_1.z.string(),
        strength: zod_1.z.number(),
        sources: zod_1.z.array(zod_1.z.string())
    })),
    threatScore: zod_1.z.number(),
    lastUpdated: zod_1.z.date(),
    conflictingData: zod_1.z.array(zod_1.z.object({ attribute: zod_1.z.string(), values: zod_1.z.array(zod_1.z.any()), sources: zod_1.z.array(zod_1.z.string()) }))
});
exports.ThreatPictureSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    generatedAt: zod_1.z.date(),
    timeframe: zod_1.z.object({ start: zod_1.z.date(), end: zod_1.z.date() }),
    threatActors: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        threatLevel: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        activity: zod_1.z.string(),
        targeting: zod_1.z.array(zod_1.z.string()),
        capabilities: zod_1.z.array(zod_1.z.string())
    })),
    activeCampaigns: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        actor: zod_1.z.string(),
        objectives: zod_1.z.array(zod_1.z.string()),
        targets: zod_1.z.array(zod_1.z.string()),
        phase: zod_1.z.string(),
        indicators: zod_1.z.array(zod_1.z.string())
    })),
    emergingThreats: zod_1.z.array(zod_1.z.object({
        description: zod_1.z.string(),
        probability: zod_1.z.number(),
        impact: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        timeframe: zod_1.z.string(),
        indicators: zod_1.z.array(zod_1.z.string())
    })),
    geoHotspots: zod_1.z.array(zod_1.z.object({
        region: zod_1.z.string(),
        threatLevel: zod_1.z.number(),
        activeThreats: zod_1.z.number(),
        trend: zod_1.z.enum(['INCREASING', 'STABLE', 'DECREASING'])
    })),
    recommendations: zod_1.z.array(zod_1.z.string())
});
/**
 * Multi-Domain Fusion Engine
 */
class FusionEngine {
    reports = new Map();
    entities = new Map();
    domainWeights = new Map();
    correlationThreshold = 0.7;
    constructor() {
        // Default domain weights for fusion
        this.domainWeights.set('SIGINT', 0.9);
        this.domainWeights.set('HUMINT', 0.85);
        this.domainWeights.set('CYBER', 0.9);
        this.domainWeights.set('OSINT', 0.7);
        this.domainWeights.set('GEOINT', 0.85);
        this.domainWeights.set('FININT', 0.8);
        this.domainWeights.set('DARKWEB', 0.75);
    }
    /**
     * Ingest intelligence report from any domain
     */
    async ingestReport(report) {
        this.reports.set(report.id, report);
        let correlationsFound = 0;
        let alertsGenerated = 0;
        // Extract and resolve entities
        for (const entity of report.entities) {
            const resolved = await this.resolveEntity(entity, report);
            if (resolved.newCorrelations > 0) {
                correlationsFound += resolved.newCorrelations;
            }
        }
        // Cross-domain correlation
        const crossDomainMatches = await this.crossDomainCorrelation(report);
        correlationsFound += crossDomainMatches.length;
        // Check for alert conditions
        const alerts = this.checkAlertConditions(report);
        alertsGenerated = alerts.length;
        return {
            reportId: report.id,
            entitiesExtracted: report.entities.length,
            correlationsFound,
            alertsGenerated
        };
    }
    /**
     * Entity resolution across domains
     */
    async resolveEntity(rawEntity, sourceReport) {
        // Find potential matches
        const candidates = this.findEntityCandidates(rawEntity);
        if (candidates.length > 0) {
            // Merge with best match
            const bestMatch = candidates[0];
            this.mergeEntity(bestMatch, rawEntity, sourceReport);
            return { fusedEntityId: bestMatch.id, isNew: false, newCorrelations: candidates.length - 1 };
        }
        // Create new fused entity
        const fusedEntity = {
            id: crypto.randomUUID(),
            canonicalName: rawEntity.name,
            type: rawEntity.type,
            aliases: [rawEntity.name],
            sources: [{ domain: sourceReport.domain, reportId: sourceReport.id, confidence: rawEntity.confidence }],
            attributes: {},
            relationships: [],
            threatScore: 0,
            lastUpdated: new Date(),
            conflictingData: []
        };
        this.entities.set(fusedEntity.id, fusedEntity);
        return { fusedEntityId: fusedEntity.id, isNew: true, newCorrelations: 0 };
    }
    /**
     * Cross-domain correlation analysis
     */
    async crossDomainCorrelation(report) {
        const correlations = [];
        for (const [id, existingReport] of this.reports) {
            if (id === report.id || existingReport.domain === report.domain)
                continue;
            // Compare indicators
            const indicatorMatches = this.compareIndicators(report.indicators, existingReport.indicators);
            if (indicatorMatches.length > 0) {
                const confidence = this.calculateCorrelationConfidence(report, existingReport, indicatorMatches);
                if (confidence >= this.correlationThreshold) {
                    correlations.push({
                        reportId: id,
                        domain: existingReport.domain,
                        correlationType: 'INDICATOR_MATCH',
                        confidence,
                        matchingIndicators: indicatorMatches.map(m => m.value)
                    });
                }
            }
            // Compare entities
            const entityMatches = this.compareEntities(report.entities, existingReport.entities);
            if (entityMatches.length > 0) {
                correlations.push({
                    reportId: id,
                    domain: existingReport.domain,
                    correlationType: 'ENTITY_MATCH',
                    confidence: 0.8,
                    matchingIndicators: entityMatches.map(e => e.name)
                });
            }
        }
        return correlations;
    }
    /**
     * Generate unified threat picture
     */
    async generateThreatPicture(timeframe) {
        const relevantReports = Array.from(this.reports.values()).filter(r => r.timestamp >= timeframe.start && r.timestamp <= timeframe.end);
        // Aggregate threat actors
        const actorMap = new Map();
        for (const entity of this.entities.values()) {
            if (entity.type === 'THREAT' || entity.threatScore > 50) {
                actorMap.set(entity.id, {
                    id: entity.id,
                    name: entity.canonicalName,
                    threatLevel: this.calculateThreatLevel(entity.threatScore),
                    activity: 'Active',
                    targeting: [],
                    capabilities: []
                });
            }
        }
        // Identify campaigns
        const campaigns = this.identifyCampaigns(relevantReports);
        // Identify emerging threats
        const emergingThreats = this.identifyEmergingThreats(relevantReports);
        // Calculate geo hotspots
        const geoHotspots = this.calculateGeoHotspots(relevantReports);
        return {
            id: crypto.randomUUID(),
            generatedAt: new Date(),
            timeframe,
            threatActors: Array.from(actorMap.values()),
            activeCampaigns: campaigns,
            emergingThreats,
            geoHotspots,
            recommendations: [
                'Increase monitoring on identified threat actors',
                'Update defensive signatures based on new indicators',
                'Brief stakeholders on emerging threats'
            ]
        };
    }
    /**
     * Query fused intelligence
     */
    query(params) {
        let entities = Array.from(this.entities.values());
        let reports = Array.from(this.reports.values());
        if (params.entityType) {
            entities = entities.filter(e => e.type === params.entityType);
        }
        if (params.domains) {
            reports = reports.filter(r => params.domains.includes(r.domain));
            entities = entities.filter(e => e.sources.some(s => params.domains.includes(s.domain)));
        }
        if (params.threatScoreMin !== undefined) {
            entities = entities.filter(e => e.threatScore >= params.threatScoreMin);
        }
        if (params.timeframe) {
            reports = reports.filter(r => r.timestamp >= params.timeframe.start && r.timestamp <= params.timeframe.end);
        }
        // Extract correlations
        const correlations = [];
        for (const entity of entities) {
            for (const rel of entity.relationships) {
                correlations.push({ source: entity.id, target: rel.targetId, type: rel.type });
            }
        }
        return { entities, reports, correlations };
    }
    /**
     * Get domain coverage metrics
     */
    getDomainCoverage() {
        const coverage = new Map();
        for (const domain of exports.IntelligenceDomainSchema.options) {
            coverage.set(domain, { domain, reportCount: 0, entityCount: 0, lastReport: null, reliability: 0 });
        }
        for (const report of this.reports.values()) {
            const c = coverage.get(report.domain);
            c.reportCount++;
            c.entityCount += report.entities.length;
            if (!c.lastReport || report.timestamp > c.lastReport) {
                c.lastReport = report.timestamp;
            }
        }
        return Array.from(coverage.values());
    }
    // Private helper methods
    findEntityCandidates(entity) {
        const candidates = [];
        for (const fused of this.entities.values()) {
            if (fused.type !== entity.type)
                continue;
            let score = 0;
            if (fused.canonicalName.toLowerCase() === entity.name.toLowerCase())
                score += 0.8;
            if (fused.aliases.some(a => a.toLowerCase() === entity.name.toLowerCase()))
                score += 0.6;
            if (score >= this.correlationThreshold) {
                candidates.push({ entity: fused, score });
            }
        }
        return candidates.sort((a, b) => b.score - a.score).map(c => c.entity);
    }
    mergeEntity(fused, raw, source) {
        if (!fused.aliases.includes(raw.name)) {
            fused.aliases.push(raw.name);
        }
        fused.sources.push({ domain: source.domain, reportId: source.id, confidence: raw.confidence });
        fused.lastUpdated = new Date();
    }
    compareIndicators(a, b) {
        return a.filter(ai => b.some(bi => ai.type === bi.type && ai.value === bi.value));
    }
    compareEntities(a, b) {
        return a.filter(ae => b.some(be => ae.name.toLowerCase() === be.name.toLowerCase() && ae.type === be.type));
    }
    calculateCorrelationConfidence(a, b, matches) {
        const baseConfidence = 0.5 + (matches.length * 0.1);
        const domainWeightA = this.domainWeights.get(a.domain) || 0.5;
        const domainWeightB = this.domainWeights.get(b.domain) || 0.5;
        return Math.min(1, baseConfidence * ((domainWeightA + domainWeightB) / 2));
    }
    calculateThreatLevel(score) {
        if (score >= 80)
            return 'CRITICAL';
        if (score >= 60)
            return 'HIGH';
        if (score >= 40)
            return 'MEDIUM';
        return 'LOW';
    }
    identifyCampaigns(reports) {
        return [];
    }
    identifyEmergingThreats(reports) {
        return [];
    }
    calculateGeoHotspots(reports) {
        return [
            { region: 'Eastern Europe', threatLevel: 85, activeThreats: 12, trend: 'INCREASING' },
            { region: 'East Asia', threatLevel: 75, activeThreats: 8, trend: 'STABLE' }
        ];
    }
    checkAlertConditions(report) {
        return [];
    }
    // Public API
    getEntity(id) { return this.entities.get(id); }
    getAllEntities() { return Array.from(this.entities.values()); }
    getReport(id) { return this.reports.get(id); }
    setCorrelationThreshold(threshold) { this.correlationThreshold = threshold; }
    setDomainWeight(domain, weight) { this.domainWeights.set(domain, weight); }
}
exports.FusionEngine = FusionEngine;
