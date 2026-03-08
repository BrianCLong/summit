"use strict";
/**
 * HUMINT/CTI Fusion Service
 * Multi-INT fusion for comprehensive threat intelligence analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FusionService = void 0;
/**
 * HUMINT/CTI Fusion Service
 * Fuses multiple intelligence sources for comprehensive threat analysis
 */
class FusionService {
    repository;
    geointService;
    iocService;
    reports;
    fusionResults;
    config;
    constructor(repository, geointService, iocService) {
        this.repository = repository;
        this.geointService = geointService;
        this.iocService = iocService;
        this.reports = new Map();
        this.fusionResults = new Map();
        this.config = {
            weights: {
                HUMINT: 1.0,
                SIGINT: 0.9,
                OSINT: 0.6,
                GEOINT: 0.85,
                MASINT: 0.8,
                TECHINT: 0.75,
                FININT: 0.7,
                CYBERINT: 0.85,
            },
            minConfidence: 40,
            maxCorrelationDistance: 4,
            temporalWindowHours: 72,
            spatialRadiusMeters: 50000,
        };
    }
    // ============================================================================
    // Intelligence Report Management
    // ============================================================================
    /**
     * Ingest intelligence report
     */
    async ingestReport(report) {
        const fullReport = {
            ...report,
            id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        // Extract entities from report content
        const entities = await this.extractEntities(fullReport);
        // Enrich with geospatial data
        for (const location of entities.locations) {
            if (location.coordinates) {
                fullReport.locations.push({
                    name: location.name,
                    coordinates: location.coordinates,
                    relevance: 'PRIMARY',
                    context: `Extracted from report content`,
                });
            }
        }
        // Link to existing threat actors
        for (const actor of entities.threatActors) {
            const existingActors = await this.findThreatActorsByName(actor.name);
            if (existingActors.length > 0) {
                fullReport.relatedThreatActors.push(existingActors[0].id);
            }
        }
        // Link to existing IOCs
        for (const ioc of entities.iocs) {
            const enrichment = await this.iocService.ingestIOC({
                type: ioc.type,
                value: ioc.value,
                confidence: Math.floor(ioc.confidence * 100),
                tenantId: fullReport.tenantId,
            });
            fullReport.relatedIOCs.push(enrichment.ioc.id);
        }
        this.reports.set(fullReport.id, fullReport);
        return fullReport;
    }
    /**
     * Extract entities from report content using NLP (simulated)
     */
    async extractEntities(report) {
        const content = `${report.title} ${report.summary} ${report.content}`;
        // Simulated NLP entity extraction
        // In production, this would use spaCy, Stanford NER, or similar
        const entities = {
            persons: [],
            organizations: [],
            locations: [],
            threatActors: [],
            iocs: [],
            events: [],
        };
        // Extract IP addresses
        const ipRegex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
        const ips = content.match(ipRegex) || [];
        for (const ip of ips) {
            entities.iocs.push({ type: 'IP_ADDRESS', value: ip, confidence: 0.95 });
        }
        // Extract domains
        const domainRegex = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi;
        const domains = content.match(domainRegex) || [];
        for (const domain of domains) {
            if (!domain.includes('@')) {
                entities.iocs.push({ type: 'DOMAIN', value: domain.toLowerCase(), confidence: 0.85 });
            }
        }
        // Extract SHA256 hashes
        const sha256Regex = /\b[a-f0-9]{64}\b/gi;
        const hashes = content.match(sha256Regex) || [];
        for (const hash of hashes) {
            entities.iocs.push({ type: 'FILE_HASH_SHA256', value: hash.toLowerCase(), confidence: 0.98 });
        }
        // Extract emails
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const emails = content.match(emailRegex) || [];
        for (const email of emails) {
            entities.iocs.push({ type: 'EMAIL', value: email.toLowerCase(), confidence: 0.95 });
        }
        // Known threat actor patterns (simulated)
        const knownActors = ['APT28', 'APT29', 'Lazarus Group', 'FIN7', 'Cobalt Gang'];
        for (const actor of knownActors) {
            if (content.toLowerCase().includes(actor.toLowerCase())) {
                entities.threatActors.push({ name: actor, confidence: 0.9 });
            }
        }
        return entities;
    }
    // ============================================================================
    // Multi-INT Fusion
    // ============================================================================
    /**
     * Execute multi-INT fusion analysis
     */
    async executeFusion(params) {
        const startTime = performance.now();
        // Gather all intelligence sources
        const reports = params.reportIds?.map(id => this.reports.get(id)).filter(Boolean) || [];
        // Execute Neo4j fusion query
        const neoResult = await this.repository.executeFusionQuery({
            threatActorIds: params.threatActorIds,
            timeRange: params.timeRange,
        });
        // Perform pattern analysis
        const patterns = await this.analyzePatterns(reports, neoResult.data);
        // Perform attribution analysis
        const attribution = await this.analyzeAttribution(reports, neoResult.data);
        // Generate threat heatmap
        const heatmap = params.spatialBounds
            ? await this.repository.generateThreatHeatmap({ bbox: params.spatialBounds })
            : { data: [] };
        // Build comprehensive fusion result
        const fusionResult = {
            id: `fusion_${Date.now()}`,
            fusionType: 'MULTI_INT',
            inputSources: this.categorizeInputSources(reports),
            correlations: this.buildCorrelations(neoResult.data, reports, patterns),
            insights: this.generateInsights(patterns, attribution),
            threatAssessment: {
                overallThreat: this.calculateOverallThreat(neoResult.data, attribution),
                threatVector: attribution.indicators.ttps[0],
                potentialTargets: this.identifyPotentialTargets(reports, neoResult.data),
                timelineEstimate: patterns.predictions[0]?.timeframe,
                mitigationPriority: this.calculateMitigationPriority(neoResult.data.threatAssessment.overallThreat),
            },
            geospatialSummary: {
                affectedRegions: this.extractAffectedRegions(reports),
                threatHeatmap: heatmap.data,
                criticalInfrastructureAtRisk: await this.identifyCriticalInfraAtRisk(params.spatialBounds, neoResult.data.threatAssessment.overallThreat),
            },
            processingTime: performance.now() - startTime,
            confidence: this.calculateFusionConfidence(reports, neoResult.data),
            tenantId: reports[0]?.tenantId || 'system',
            createdAt: new Date().toISOString(),
        };
        this.fusionResults.set(fusionResult.id, fusionResult);
        return fusionResult;
    }
    /**
     * Analyze patterns across intelligence sources
     */
    async analyzePatterns(reports, fusionData) {
        const patterns = [];
        const anomalies = [];
        const predictions = [];
        // Temporal pattern analysis
        const temporalClusters = this.findTemporalClusters(reports);
        if (temporalClusters.length > 0) {
            patterns.push({
                type: 'TEMPORAL',
                description: `Activity cluster detected: ${temporalClusters.length} related events`,
                confidence: 75,
                entities: temporalClusters.map(c => c.reportId),
                indicators: [],
                timeRange: {
                    start: temporalClusters[0].date,
                    end: temporalClusters[temporalClusters.length - 1].date,
                },
            });
        }
        // Spatial pattern analysis
        const spatialClusters = this.findSpatialClusters(reports);
        for (const cluster of spatialClusters) {
            patterns.push({
                type: 'SPATIAL',
                description: `Geographic activity concentration: ${cluster.locationCount} locations`,
                confidence: cluster.confidence,
                entities: cluster.reportIds,
                indicators: [],
                spatialExtent: cluster.extent,
            });
        }
        // Behavioral pattern analysis
        const behavioralPatterns = this.analyzeBehavioralPatterns(reports);
        patterns.push(...behavioralPatterns);
        // Network analysis
        if (fusionData.correlations.length > 5) {
            patterns.push({
                type: 'NETWORK',
                description: `Complex threat network identified: ${fusionData.correlations.length} connections`,
                confidence: 70,
                entities: fusionData.correlations.flatMap(c => c.entities),
                indicators: fusionData.correlations.flatMap(c => c.evidence),
            });
        }
        // Anomaly detection
        const detectedAnomalies = this.detectAnomalies(reports, fusionData);
        anomalies.push(...detectedAnomalies);
        // Predictive analysis
        if (patterns.length > 0) {
            predictions.push({
                type: 'ACTIVITY_FORECAST',
                description: 'Continued threat activity likely based on observed patterns',
                probability: 0.7,
                timeframe: '7-14 days',
                basis: patterns.map(p => p.description),
            });
        }
        return { patterns, anomalies, predictions };
    }
    /**
     * Analyze attribution for threat activity
     */
    async analyzeAttribution(reports, fusionData) {
        const attributionScores = new Map();
        // Score based on direct mentions in reports
        for (const report of reports) {
            for (const actorId of report.relatedThreatActors) {
                const current = attributionScores.get(actorId) || { score: 0, evidence: [] };
                current.score += this.getSourceWeight(report.sources[0]?.type || 'OSINT');
                current.evidence.push(`Mentioned in report: ${report.title}`);
                attributionScores.set(actorId, current);
            }
        }
        // Score based on IOC correlation
        for (const correlation of fusionData.correlations) {
            for (const entity of correlation.entities) {
                if (entity.startsWith('threat_actor_')) {
                    const current = attributionScores.get(entity) || { score: 0, evidence: [] };
                    current.score += correlation.confidence * 0.01;
                    current.evidence.push(`IOC correlation: ${correlation.type}`);
                    attributionScores.set(entity, current);
                }
            }
        }
        // Sort by score
        const sortedAttributions = Array.from(attributionScores.entries())
            .map(([id, data]) => ({
            threatActorId: id,
            threatActorName: id.replace('threat_actor_', ''),
            confidence: Math.min(data.score * 20, 95),
            evidence: data.evidence,
        }))
            .sort((a, b) => b.confidence - a.confidence);
        // Extract indicators
        const indicators = {
            ttps: this.extractTTPs(reports),
            infrastructure: this.extractInfrastructure(fusionData),
            malware: this.extractMalwareFamilies(reports),
            timing: this.extractTimingPatterns(reports),
            targeting: this.extractTargetingPatterns(reports),
        };
        // Check for false flags
        const falseFlags = this.detectFalseFlags(reports, sortedAttributions);
        return {
            primaryAttribution: sortedAttributions[0] || null,
            alternativeAttributions: sortedAttributions.slice(1, 4),
            indicators,
            falseFlags,
        };
    }
    // ============================================================================
    // Geospatial Intelligence Fusion
    // ============================================================================
    /**
     * Fuse GEOINT with HUMINT/CTI
     */
    async fuseGEOINTwithCTI(params) {
        // Get terrain analysis for region
        const terrainAnalysis = await this.geointService.analyzeTerrainRegion(params.region);
        // Get IOCs in region
        const centerLat = (params.region.minLat + params.region.maxLat) / 2;
        const centerLon = (params.region.minLon + params.region.maxLon) / 2;
        const radius = Math.max((params.region.maxLat - params.region.minLat) * 111320, (params.region.maxLon - params.region.minLon) * 111320 * Math.cos(centerLat * Math.PI / 180)) / 2;
        const iocsInRegion = await this.iocService.findIOCsInRegion({ latitude: centerLat, longitude: centerLon }, radius);
        // Correlate strategic terrain features with threat intelligence
        const correlatedFeatures = [];
        for (const observationPoint of terrainAnalysis.strategicValue.observationPoints) {
            const nearbyIOCs = iocsInRegion.filter(ioc => {
                if (!ioc.geolocation)
                    return false;
                const distance = this.haversineDistance(observationPoint.latitude, observationPoint.longitude, ioc.geolocation.latitude, ioc.geolocation.longitude);
                return distance < 5000; // 5km
            });
            if (nearbyIOCs.length > 0) {
                correlatedFeatures.push({
                    feature: {
                        type: 'OBSERVATION_POINT',
                        location: observationPoint,
                        strategicValue: observationPoint.score,
                    },
                    relatedReports: params.reportIds,
                    relatedIOCs: nearbyIOCs.map(ioc => ioc.id),
                    threatLevel: nearbyIOCs.length * 20,
                });
            }
        }
        // Generate recommendations
        const recommendations = [];
        if (correlatedFeatures.length > 0) {
            recommendations.push(`${correlatedFeatures.length} strategic terrain features have nearby threat indicators`);
            recommendations.push('Recommend enhanced surveillance of identified observation points');
        }
        if (terrainAnalysis.accessibility.vehicleAccessible > 50) {
            recommendations.push('High vehicle accessibility may facilitate adversary movement');
        }
        return {
            fusionId: `geoint_cti_fusion_${Date.now()}`,
            correlatedFeatures,
            recommendations,
        };
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    async findThreatActorsByName(name) {
        // This would query the repository in production
        return [];
    }
    getSourceWeight(sourceType) {
        return this.config.weights[sourceType] || 0.5;
    }
    categorizeInputSources(reports) {
        const sourceMap = new Map();
        for (const report of reports) {
            for (const source of report.sources) {
                const existing = sourceMap.get(source.type) || [];
                existing.push(report.id);
                sourceMap.set(source.type, existing);
            }
        }
        return Array.from(sourceMap.entries()).map(([type, sourceIds]) => ({
            type,
            sourceIds,
            weight: this.config.weights[type],
        }));
    }
    buildCorrelations(fusionData, reports, patterns) {
        const correlations = [...fusionData.correlations];
        // Add correlations from pattern analysis
        for (const pattern of patterns.patterns) {
            correlations.push({
                type: pattern.type,
                entities: pattern.entities,
                confidence: pattern.confidence,
                evidence: pattern.indicators,
                geospatialContext: pattern.spatialExtent
                    ? {
                        location: pattern.spatialExtent.center,
                        proximity: pattern.spatialExtent.radiusKm * 1000,
                    }
                    : undefined,
            });
        }
        return correlations;
    }
    generateInsights(patterns, attribution) {
        const insights = [];
        if (attribution.primaryAttribution) {
            insights.push({
                title: 'Primary Attribution Identified',
                description: `High confidence attribution to ${attribution.primaryAttribution.threatActorName}`,
                importance: 'HIGH',
                actionable: true,
                recommendedActions: [
                    'Review threat actor TTP profile',
                    'Implement targeted detection rules',
                    'Brief relevant stakeholders',
                ],
            });
        }
        for (const pattern of patterns.patterns) {
            if (pattern.confidence > 70) {
                insights.push({
                    title: `${pattern.type} Pattern Detected`,
                    description: pattern.description,
                    importance: pattern.confidence > 85 ? 'CRITICAL' : 'HIGH',
                    actionable: true,
                    recommendedActions: ['Investigate correlated entities', 'Monitor for similar activity'],
                });
            }
        }
        for (const prediction of patterns.predictions) {
            if (prediction.probability > 0.6) {
                insights.push({
                    title: 'Predictive Warning',
                    description: prediction.description,
                    importance: prediction.probability > 0.8 ? 'CRITICAL' : 'HIGH',
                    actionable: true,
                    recommendedActions: ['Increase monitoring posture', 'Prepare incident response'],
                });
            }
        }
        return insights;
    }
    calculateOverallThreat(fusionData, attribution) {
        let threat = fusionData.threatAssessment.overallThreat;
        if (attribution.primaryAttribution && attribution.primaryAttribution.confidence > 70) {
            threat += 15;
        }
        return Math.min(threat, 100);
    }
    identifyPotentialTargets(reports, fusionData) {
        const targets = new Set();
        for (const report of reports) {
            for (const entity of report.entities) {
                if (entity.type === 'ORGANIZATION' || entity.type === 'INFRASTRUCTURE') {
                    targets.add(entity.name);
                }
            }
        }
        return Array.from(targets).slice(0, 10);
    }
    calculateMitigationPriority(threatLevel) {
        if (threatLevel >= 80)
            return 'CRITICAL';
        if (threatLevel >= 60)
            return 'HIGH';
        if (threatLevel >= 40)
            return 'MEDIUM';
        return 'LOW';
    }
    extractAffectedRegions(reports) {
        const regions = new Set();
        for (const report of reports) {
            for (const location of report.locations) {
                if (location.name) {
                    regions.add(location.name);
                }
            }
        }
        return Array.from(regions);
    }
    async identifyCriticalInfraAtRisk(bounds, threatLevel) {
        if (!bounds || !threatLevel)
            return [];
        // In production, this would query a critical infrastructure database
        return [
            {
                name: 'Power Grid Substation A',
                type: 'ENERGY',
                location: {
                    latitude: (bounds.minLat + bounds.maxLat) / 2,
                    longitude: (bounds.minLon + bounds.maxLon) / 2,
                },
                riskLevel: threatLevel > 70 ? 'HIGH' : 'MEDIUM',
            },
        ];
    }
    calculateFusionConfidence(reports, fusionData) {
        let confidence = fusionData.confidence;
        // Adjust based on source diversity
        const sourceTypes = new Set(reports.flatMap(r => r.sources.map(s => s.type)));
        confidence += sourceTypes.size * 5;
        // Adjust based on source reliability
        const avgReliability = reports.reduce((sum, r) => {
            const relScore = r.sources[0]?.reliability ? 'ABCDEF'.indexOf(r.sources[0].reliability) : 3;
            return sum + (5 - relScore) * 10;
        }, 0) / (reports.length || 1);
        confidence = (confidence + avgReliability) / 2;
        return Math.min(Math.round(confidence), 100);
    }
    findTemporalClusters(reports) {
        return reports
            .filter(r => r.reportDate)
            .map(r => ({ reportId: r.id, date: r.reportDate }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    findSpatialClusters(reports) {
        const clusters = [];
        const reportsWithLocations = reports.filter(r => r.locations.length > 0);
        if (reportsWithLocations.length > 0) {
            const allLocations = reportsWithLocations.flatMap(r => r.locations);
            if (allLocations.length > 0 && allLocations[0].coordinates) {
                clusters.push({
                    reportIds: reportsWithLocations.map(r => r.id),
                    locationCount: allLocations.length,
                    confidence: 70,
                    extent: {
                        center: allLocations[0].coordinates,
                        radiusKm: 100,
                    },
                });
            }
        }
        return clusters;
    }
    analyzeBehavioralPatterns(reports) {
        const patterns = [];
        // Analyze MITRE ATT&CK technique patterns
        const techniqueFrequency = new Map();
        for (const report of reports) {
            for (const entity of report.entities) {
                if (entity.type === 'THREAT_ACTOR' && entity.attributes?.techniques) {
                    for (const technique of entity.attributes.techniques) {
                        techniqueFrequency.set(technique, (techniqueFrequency.get(technique) || 0) + 1);
                    }
                }
            }
        }
        if (techniqueFrequency.size > 0) {
            const sortedTechniques = Array.from(techniqueFrequency.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            patterns.push({
                type: 'BEHAVIORAL',
                description: `Common techniques observed: ${sortedTechniques.map(t => t[0]).join(', ')}`,
                confidence: 75,
                entities: reports.map(r => r.id),
                indicators: sortedTechniques.map(t => t[0]),
            });
        }
        return patterns;
    }
    detectAnomalies(reports, fusionData) {
        const anomalies = [];
        // Detect unusual source patterns
        const sourceCount = reports.reduce((sum, r) => sum + r.sources.length, 0);
        if (sourceCount > reports.length * 3) {
            anomalies.push({
                type: 'MULTI_SOURCE',
                description: 'Unusually high number of sources per report',
                severity: 'LOW',
                confidence: 60,
            });
        }
        // Detect high-severity clustering
        const highSeverityReports = reports.filter(r => r.assessment.threatLevel === 'HIGH' || r.assessment.threatLevel === 'SEVERE');
        if (highSeverityReports.length > reports.length * 0.5) {
            anomalies.push({
                type: 'THREAT_ESCALATION',
                description: 'High proportion of severe threat assessments',
                severity: 'HIGH',
                confidence: 80,
            });
        }
        return anomalies;
    }
    detectFalseFlags(reports, attributions) {
        const falseFlags = [];
        // Detect conflicting attributions
        if (attributions.length >= 2) {
            const topTwo = attributions.slice(0, 2);
            if (topTwo[0].confidence - topTwo[1].confidence < 15) {
                falseFlags.push({
                    description: 'Close confidence scores between top attributions may indicate false flag operation',
                    confidence: 50,
                });
            }
        }
        return falseFlags;
    }
    extractTTPs(reports) {
        const ttps = new Set();
        for (const report of reports) {
            for (const entity of report.entities) {
                if (entity.attributes?.techniques) {
                    for (const t of entity.attributes.techniques) {
                        ttps.add(t);
                    }
                }
            }
        }
        return Array.from(ttps);
    }
    extractInfrastructure(fusionData) {
        return fusionData.correlations
            .filter(c => c.type === 'THREAT_ACTOR_INFRASTRUCTURE')
            .flatMap(c => c.entities);
    }
    extractMalwareFamilies(reports) {
        const families = new Set();
        for (const report of reports) {
            for (const entity of report.entities) {
                if (entity.type === 'MALWARE') {
                    families.add(entity.name);
                }
            }
        }
        return Array.from(families);
    }
    extractTimingPatterns(reports) {
        const patterns = [];
        const dates = reports.map(r => new Date(r.reportDate));
        if (dates.length >= 2) {
            const dayOfWeek = dates.map(d => d.getDay());
            const weekdayCount = dayOfWeek.filter(d => d >= 1 && d <= 5).length;
            if (weekdayCount > dates.length * 0.8) {
                patterns.push('Activity concentrated on weekdays');
            }
        }
        return patterns;
    }
    extractTargetingPatterns(reports) {
        const sectors = new Set();
        for (const report of reports) {
            for (const entity of report.entities) {
                if (entity.type === 'ORGANIZATION' && entity.attributes?.sector) {
                    sectors.add(entity.attributes.sector);
                }
            }
        }
        return Array.from(sectors);
    }
    haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
exports.FusionService = FusionService;
exports.default = FusionService;
