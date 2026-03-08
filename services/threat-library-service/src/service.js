"use strict";
/**
 * Threat Library Service
 *
 * Business logic layer for the threat pattern library.
 * Provides pattern evaluation spec generation, explanation payloads, and lifecycle management.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatLibraryService = void 0;
exports.createService = createService;
const uuid_1 = require("uuid");
const repository_js_1 = require("./repository.js");
const cypher_generator_js_1 = require("./utils/cypher-generator.js");
const errors_js_1 = require("./errors.js");
// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================
class ThreatLibraryService {
    repository;
    constructor(repository) {
        this.repository = repository ?? (0, repository_js_1.getRepository)();
    }
    // ==========================================================================
    // THREAT ARCHETYPE OPERATIONS
    // ==========================================================================
    /**
     * List all threat archetypes
     */
    async listThreats(filter, pagination) {
        return this.repository.listThreatArchetypes(filter, pagination);
    }
    /**
     * Get a threat archetype by ID
     */
    async getThreatById(id) {
        return this.repository.getThreatArchetypeById(id);
    }
    /**
     * Create a new threat archetype
     */
    async createThreat(data, options) {
        return this.repository.createThreatArchetype(data, options);
    }
    /**
     * Update a threat archetype
     */
    async updateThreat(id, updates, options) {
        return this.repository.updateThreatArchetype(id, updates, options);
    }
    /**
     * Deprecate a threat archetype
     */
    async deprecateThreat(id, options) {
        return this.repository.updateThreatArchetype(id, { status: 'DEPRECATED' }, { ...options, description: 'Deprecated' });
    }
    /**
     * Archive a threat archetype
     */
    async archiveThreat(id, options) {
        await this.repository.deleteThreatArchetype(id, options);
    }
    // ==========================================================================
    // PATTERN OPERATIONS
    // ==========================================================================
    /**
     * List patterns for a specific threat
     */
    async listPatternsForThreat(threatId) {
        return this.repository.getPatternsForThreat(threatId);
    }
    /**
     * List all pattern templates
     */
    async listPatterns(filter, pagination) {
        return this.repository.listPatternTemplates(filter, pagination);
    }
    /**
     * Get a pattern template by ID
     */
    async getPatternById(id) {
        return this.repository.getPatternTemplateById(id);
    }
    /**
     * Create a new pattern template
     */
    async createPattern(data, options) {
        // Validate graph motifs
        for (const motif of data.graphMotifs) {
            this.validateGraphMotif(motif);
        }
        return this.repository.createPatternTemplate(data, options);
    }
    /**
     * Update a pattern template
     */
    async updatePattern(id, updates, options) {
        if (updates.graphMotifs) {
            for (const motif of updates.graphMotifs) {
                this.validateGraphMotif(motif);
            }
        }
        return this.repository.updatePatternTemplate(id, updates, options);
    }
    // ==========================================================================
    // TTP OPERATIONS
    // ==========================================================================
    /**
     * List all TTPs
     */
    async listTTPs(filter, pagination) {
        return this.repository.listTTPs(filter, pagination);
    }
    /**
     * Get a TTP by ID
     */
    async getTTPById(id) {
        return this.repository.getTTPById(id);
    }
    /**
     * Get TTPs by MITRE technique ID
     */
    async getTTPsByTechnique(techniqueId) {
        return this.repository.getTTPsByTechniqueId(techniqueId);
    }
    /**
     * Get all TTPs for a threat
     */
    async getTTPsForThreat(threatId) {
        return this.repository.getTTPsForThreat(threatId);
    }
    /**
     * Create a new TTP
     */
    async createTTP(data, options) {
        return this.repository.createTTP(data, options);
    }
    /**
     * Update a TTP
     */
    async updateTTP(id, updates, options) {
        return this.repository.updateTTP(id, updates, options);
    }
    // ==========================================================================
    // INDICATOR OPERATIONS
    // ==========================================================================
    /**
     * List all indicator patterns
     */
    async listIndicators(pagination) {
        return this.repository.listIndicatorPatterns(pagination);
    }
    /**
     * Get an indicator pattern by ID
     */
    async getIndicatorById(id) {
        return this.repository.getIndicatorPatternById(id);
    }
    /**
     * Get all indicators for a threat
     */
    async getIndicatorsForThreat(threatId) {
        return this.repository.getIndicatorsForThreat(threatId);
    }
    /**
     * Create a new indicator pattern
     */
    async createIndicator(data, options) {
        return this.repository.createIndicatorPattern(data, options);
    }
    // ==========================================================================
    // PATTERN EVALUATION SPEC GENERATOR
    // ==========================================================================
    /**
     * Generate a pattern evaluation specification for Analytics service
     * This is the main interface for detection integration
     */
    async generatePatternEvaluationSpec(request) {
        if (!request.patternId && !request.threatArchetypeId) {
            throw new errors_js_1.ValidationError('Either patternId or threatArchetypeId must be provided');
        }
        let pattern;
        let patterns = [];
        if (request.patternId) {
            pattern = await this.repository.getPatternTemplateById(request.patternId);
            patterns = [pattern];
        }
        else if (request.threatArchetypeId) {
            patterns = await this.repository.getPatternsForThreat(request.threatArchetypeId);
            if (patterns.length === 0) {
                throw new errors_js_1.NotFoundError('PatternTemplates for ThreatArchetype', request.threatArchetypeId);
            }
            pattern = patterns[0]; // Use first pattern as primary
        }
        else {
            throw new errors_js_1.ValidationError('No valid pattern or threat ID provided');
        }
        // Generate Cypher queries for each graph motif
        const cypherQueries = [];
        for (const motif of pattern.graphMotifs) {
            const queries = (0, cypher_generator_js_1.generatePatternQueries)(motif, {
                tenantId: request.graphContext?.entityIds ? undefined : undefined,
                maxResults: request.evaluationOptions.maxMatches,
                returnFormat: 'full',
            });
            for (let i = 0; i < queries.length; i++) {
                cypherQueries.push({
                    id: `${motif.id}_query_${i}`,
                    query: queries[i].query,
                    parameters: queries[i].parameters,
                    purpose: i === 0
                        ? `Match pattern: ${motif.name}`
                        : i === 1
                            ? `Count matches for: ${motif.name}`
                            : `Aggregation for: ${motif.name}`,
                    weight: motif.weight,
                });
            }
        }
        // Generate signal evaluations
        const signalEvaluations = pattern.signals.map((signal) => ({
            signalId: signal.id,
            evaluationLogic: this.generateSignalEvaluationLogic(signal),
            dataSource: signal.dataSource,
            parameters: {
                metric: signal.metric,
                baseline: signal.baseline,
                threshold: signal.threshold,
                operator: signal.operator,
                windowMs: signal.windowMs,
                aggregation: signal.aggregation,
            },
        }));
        // Get indicator checks
        const indicatorChecks = [];
        for (const indicatorId of pattern.indicators) {
            try {
                const indicator = await this.repository.getIndicatorPatternById(indicatorId);
                indicatorChecks.push({
                    indicatorId: indicator.id,
                    pattern: indicator.pattern,
                    patternFormat: indicator.patternFormat,
                });
            }
            catch {
                // Indicator may have been deleted, skip
            }
        }
        const spec = {
            specId: (0, uuid_1.v4)(),
            patternId: pattern.id,
            patternName: pattern.name,
            cypherQueries,
            signalEvaluations,
            indicatorChecks,
            matchCriteria: {
                requiredMotifMatches: pattern.requiredMotifMatches,
                requiredSignalMatches: pattern.requiredSignalMatches,
                minimumConfidence: request.evaluationOptions.minConfidence,
            },
            generatedAt: new Date().toISOString(),
        };
        return spec;
    }
    /**
     * Generate evaluation specs for multiple patterns
     */
    async generateBulkEvaluationSpecs(threatArchetypeId, options) {
        const patterns = await this.repository.getPatternsForThreat(threatArchetypeId);
        const specs = [];
        for (const pattern of patterns) {
            const spec = await this.generatePatternEvaluationSpec({
                patternId: pattern.id,
                evaluationOptions: options,
            });
            specs.push(spec);
        }
        return specs;
    }
    // ==========================================================================
    // EXPLANATION PAYLOAD GENERATOR
    // ==========================================================================
    /**
     * Generate an explanation payload for UI/Copilot
     * Provides human-readable explanations of threats and patterns
     */
    async generateExplanationPayload(threatId) {
        const archetype = await this.repository.getThreatArchetypeById(threatId);
        const ttps = await this.repository.getTTPsForThreat(threatId);
        const patterns = await this.repository.getPatternsForThreat(threatId);
        const indicators = await this.repository.getIndicatorsForThreat(threatId);
        // Build MITRE mapping
        const mitreMapping = this.buildMitreMapping(ttps);
        // Build indicators explanation
        const indicatorExplanations = this.buildIndicatorExplanations(indicators);
        // Build mitigations
        const mitigations = archetype.countermeasures.map((c) => ({
            name: c.name,
            description: c.description,
            effectiveness: c.effectiveness,
        }));
        // Build related threats
        const relatedThreats = [];
        if (archetype.relatedArchetypes) {
            for (const relatedId of archetype.relatedArchetypes) {
                try {
                    const related = await this.repository.getThreatArchetypeById(relatedId);
                    relatedThreats.push({
                        id: related.id,
                        name: related.name,
                        relationship: 'Related threat archetype',
                    });
                }
                catch {
                    // Related archetype may have been deleted
                }
            }
        }
        // Build timeline from TTPs
        const timeline = this.buildAttackTimeline(ttps);
        // Build references
        const references = [];
        if (archetype.externalReferences) {
            for (const ref of archetype.externalReferences) {
                if (ref.url) {
                    references.push({
                        title: ref.description ?? ref.externalId,
                        url: ref.url,
                        source: ref.source,
                    });
                }
            }
        }
        if (archetype.mitreReferences) {
            for (const ref of archetype.mitreReferences) {
                references.push({
                    title: `${ref.techniqueId}: ${ref.techniqueName}`,
                    url: ref.mitreUrl,
                    source: 'MITRE ATT&CK',
                });
            }
        }
        const payload = {
            threatId: archetype.id,
            threatName: archetype.name,
            summary: archetype.summary,
            severity: this.riskScoreToSeverity(archetype.riskScore),
            confidence: 'HIGH', // Based on library data quality
            explanation: {
                whatItIs: archetype.description,
                whyItMatters: this.generateWhyItMatters(archetype),
                howItWorks: this.generateHowItWorks(archetype, ttps),
                typicalTargets: archetype.targetSectors,
                indicators: indicatorExplanations,
                mitigations,
                relatedThreats,
                timeline,
            },
            mitreMapping,
            references,
            generatedAt: new Date().toISOString(),
        };
        return payload;
    }
    /**
     * Generate a brief explanation for quick display
     */
    async generateBriefExplanation(threatId) {
        const archetype = await this.repository.getThreatArchetypeById(threatId);
        const indicators = await this.repository.getIndicatorsForThreat(threatId);
        return {
            summary: archetype.summary,
            severity: this.riskScoreToSeverity(archetype.riskScore),
            topIndicators: indicators.slice(0, 5).map((i) => i.name),
        };
    }
    // ==========================================================================
    // LIFECYCLE MANAGEMENT
    // ==========================================================================
    /**
     * Validate pattern coverage - check if a pattern has adequate detection rules
     */
    async validatePatternCoverage(patternId) {
        const pattern = await this.repository.getPatternTemplateById(patternId);
        const issues = [];
        const hasGraphMotifs = pattern.graphMotifs.length > 0;
        const hasSignals = pattern.signals.length > 0;
        const hasIndicators = pattern.indicators.length > 0;
        if (!hasGraphMotifs) {
            issues.push('Pattern has no graph motifs defined');
        }
        if (!hasSignals && !hasIndicators) {
            issues.push('Pattern has no signals or indicators for detection');
        }
        if (pattern.graphMotifs.some((m) => m.nodes.length === 0)) {
            issues.push('One or more graph motifs have no nodes defined');
        }
        // Check for valid TTPs
        const ttps = pattern.ttps.length;
        if (ttps === 0) {
            issues.push('Pattern is not linked to any TTPs');
        }
        return {
            valid: issues.length === 0,
            issues,
            coverage: {
                hasGraphMotifs,
                hasSignals,
                hasIndicators,
                motifCount: pattern.graphMotifs.length,
                signalCount: pattern.signals.length,
                indicatorCount: pattern.indicators.length,
            },
        };
    }
    /**
     * Get library statistics
     */
    async getLibraryStatistics() {
        const repoStats = await this.repository.getStatistics();
        // Get detailed breakdowns
        const archetypes = await this.repository.listThreatArchetypes({}, { page: 1, limit: 1000 });
        const ttps = await this.repository.listTTPs({}, { page: 1, limit: 1000 });
        const patterns = await this.repository.listPatternTemplates({}, { page: 1, limit: 1000 });
        const indicators = await this.repository.listIndicatorPatterns({ page: 1, limit: 1000 });
        const activeArchetypes = archetypes.items.filter((a) => a.active && a.status === 'ACTIVE').length;
        const deprecatedArchetypes = archetypes.items.filter((a) => a.status === 'DEPRECATED').length;
        const ttpsByTactic = {};
        for (const ttp of ttps.items) {
            ttpsByTactic[ttp.tactic] = (ttpsByTactic[ttp.tactic] || 0) + 1;
        }
        const patternsBySeverity = {};
        for (const pattern of patterns.items) {
            patternsBySeverity[pattern.severity] =
                (patternsBySeverity[pattern.severity] || 0) + 1;
        }
        const indicatorsByType = {};
        for (const indicator of indicators.items) {
            indicatorsByType[indicator.type] = (indicatorsByType[indicator.type] || 0) + 1;
        }
        return {
            threatArchetypes: {
                total: repoStats.threatArchetypes,
                active: activeArchetypes,
                deprecated: deprecatedArchetypes,
            },
            ttps: {
                total: repoStats.ttps,
                byTactic: ttpsByTactic,
            },
            patterns: {
                total: repoStats.patternTemplates,
                bySeverity: patternsBySeverity,
            },
            indicators: {
                total: repoStats.indicatorPatterns,
                byType: indicatorsByType,
            },
        };
    }
    // ==========================================================================
    // PRIVATE HELPERS
    // ==========================================================================
    validateGraphMotif(motif) {
        if (motif.nodes.length === 0) {
            throw new errors_js_1.InvalidPatternError('Graph motif must have at least one node', motif.id);
        }
        // Validate edge references
        const nodeIds = new Set(motif.nodes.map((n) => n.id));
        for (const edge of motif.edges) {
            if (!nodeIds.has(edge.sourceNodeId)) {
                throw new errors_js_1.InvalidPatternError(`Edge references unknown source node: ${edge.sourceNodeId}`, motif.id);
            }
            if (!nodeIds.has(edge.targetNodeId)) {
                throw new errors_js_1.InvalidPatternError(`Edge references unknown target node: ${edge.targetNodeId}`, motif.id);
            }
        }
        // Validate time constraint references
        if (motif.timeConstraints) {
            for (const tc of motif.timeConstraints) {
                if (tc.referenceNodeId && !nodeIds.has(tc.referenceNodeId)) {
                    throw new errors_js_1.InvalidPatternError(`Time constraint references unknown node: ${tc.referenceNodeId}`, motif.id);
                }
                if (tc.targetNodeId && !nodeIds.has(tc.targetNodeId)) {
                    throw new errors_js_1.InvalidPatternError(`Time constraint references unknown node: ${tc.targetNodeId}`, motif.id);
                }
            }
        }
    }
    generateSignalEvaluationLogic(signal) {
        switch (signal.signalType) {
            case 'THRESHOLD':
                return `${signal.metric} ${signal.operator} ${signal.threshold}`;
            case 'ANOMALY':
                return `anomaly_score(${signal.metric}) > baseline + ${signal.threshold ?? 3} * stddev`;
            case 'SEQUENCE':
                return `sequence_match(${signal.metric}, window=${signal.windowMs}ms)`;
            case 'CORRELATION':
                return `correlation(${signal.metric}, ${signal.dataSource})`;
            case 'STATISTICAL':
                return `${signal.aggregation}(${signal.metric}) ${signal.operator} ${signal.threshold}`;
            case 'BEHAVIORAL':
                return `behavioral_deviation(${signal.metric}) > ${signal.threshold}`;
            default:
                return `evaluate(${signal.metric})`;
        }
    }
    buildMitreMapping(ttps) {
        const tacticMap = new Map();
        for (const ttp of ttps) {
            const tacticName = ttp.tactic.replace(/_/g, ' ').toLowerCase();
            const capitalizedTactic = tacticName.charAt(0).toUpperCase() + tacticName.slice(1);
            if (!tacticMap.has(capitalizedTactic)) {
                tacticMap.set(capitalizedTactic, []);
            }
            tacticMap.get(capitalizedTactic).push({
                id: ttp.techniqueId,
                name: ttp.techniqueName,
                description: ttp.description,
            });
        }
        return Array.from(tacticMap.entries()).map(([tacticName, techniques]) => ({
            tacticName,
            techniques,
        }));
    }
    buildIndicatorExplanations(indicators) {
        const typeGroups = new Map();
        for (const indicator of indicators) {
            if (!typeGroups.has(indicator.type)) {
                typeGroups.set(indicator.type, []);
            }
            typeGroups.get(indicator.type).push(indicator);
        }
        return Array.from(typeGroups.entries()).map(([type, inds]) => ({
            type: type.replace(/_/g, ' ').toLowerCase(),
            description: `${inds.length} ${type.toLowerCase().replace(/_/g, ' ')} indicator(s)`,
            examples: inds.slice(0, 3).map((i) => i.name),
        }));
    }
    buildAttackTimeline(ttps) {
        const tacticOrder = [
            'RECONNAISSANCE',
            'RESOURCE_DEVELOPMENT',
            'INITIAL_ACCESS',
            'EXECUTION',
            'PERSISTENCE',
            'PRIVILEGE_ESCALATION',
            'DEFENSE_EVASION',
            'CREDENTIAL_ACCESS',
            'DISCOVERY',
            'LATERAL_MOVEMENT',
            'COLLECTION',
            'COMMAND_AND_CONTROL',
            'EXFILTRATION',
            'IMPACT',
        ];
        const tacticTTPs = new Map();
        for (const ttp of ttps) {
            if (!tacticTTPs.has(ttp.tactic)) {
                tacticTTPs.set(ttp.tactic, []);
            }
            tacticTTPs.get(ttp.tactic).push(ttp);
        }
        return tacticOrder
            .filter((tactic) => tacticTTPs.has(tactic))
            .map((tactic) => {
            const phaseTTPs = tacticTTPs.get(tactic);
            return {
                phase: tactic.replace(/_/g, ' ').toLowerCase(),
                description: phaseTTPs.map((t) => t.techniqueName).join(', '),
                indicators: phaseTTPs.flatMap((t) => t.dataSources.slice(0, 2)),
            };
        });
    }
    generateWhyItMatters(archetype) {
        const motivations = archetype.motivation
            .map((m) => m.toLowerCase().replace(/_/g, ' '))
            .join(', ');
        const sectors = archetype.targetSectors.slice(0, 3).join(', ');
        return `This threat archetype is associated with ${motivations} and primarily targets ${sectors} sectors. With a sophistication level of ${archetype.sophistication.toLowerCase()}, it poses a ${archetype.prevalence.toLowerCase()} risk in the current threat landscape.`;
    }
    generateHowItWorks(archetype, ttps) {
        if (ttps.length === 0) {
            return archetype.description;
        }
        const tactics = [...new Set(ttps.map((t) => t.tactic))];
        const tacticDescriptions = tactics
            .slice(0, 4)
            .map((t) => t.toLowerCase().replace(/_/g, ' '))
            .join(', ');
        return `This threat typically employs a multi-stage attack involving ${tacticDescriptions}. ${ttps.length} techniques have been associated with this archetype, spanning ${tactics.length} MITRE ATT&CK tactics.`;
    }
    riskScoreToSeverity(score) {
        if (score >= 80)
            return 'CRITICAL';
        if (score >= 60)
            return 'HIGH';
        if (score >= 40)
            return 'MEDIUM';
        if (score >= 20)
            return 'LOW';
        return 'INFORMATIONAL';
    }
}
exports.ThreatLibraryService = ThreatLibraryService;
/**
 * Create a service instance
 */
function createService(repository) {
    return new ThreatLibraryService(repository);
}
