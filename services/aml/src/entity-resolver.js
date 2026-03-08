"use strict";
/**
 * AML Entity Resolution Engine
 * Sprint 28C: Advanced ML-driven entity linkage across financial networks
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityResolver = void 0;
const events_1 = require("events");
const crypto_1 = __importDefault(require("crypto"));
class EntityResolver extends events_1.EventEmitter {
    entities = new Map();
    clusters = new Map();
    rules = new Map();
    jobs = new Map();
    // ML Models for advanced matching
    nameEmbeddings = new Map();
    addressEmbeddings = new Map();
    constructor() {
        super();
        this.initializeDefaultRules();
    }
    /**
     * Register entity profile for resolution
     */
    async registerEntity(entity) {
        const fullEntity = {
            ...entity,
            id: crypto_1.default.randomUUID(),
        };
        // Validate entity data
        await this.validateEntityProfile(fullEntity);
        // Normalize attributes
        await this.normalizeEntityAttributes(fullEntity);
        this.entities.set(fullEntity.id, fullEntity);
        this.emit('entity_registered', fullEntity);
        // Trigger incremental resolution
        await this.triggerIncrementalResolution(fullEntity.id);
        return fullEntity;
    }
    /**
     * Execute comprehensive entity resolution
     */
    async executeResolution(scope = {}, configuration = {}) {
        const job = {
            id: crypto_1.default.randomUUID(),
            status: 'queued',
            type: 'full_resolution',
            scope,
            configuration: {
                rules: configuration.rules || Array.from(this.rules.keys()),
                algorithms: configuration.algorithms || [
                    'deterministic',
                    'probabilistic',
                    'ml_supervised',
                ],
                confidence: configuration.confidence || 0.85,
                autoApprove: configuration.autoApprove || false,
                batchSize: configuration.batchSize || 1000,
            },
            progress: {
                total: 0,
                processed: 0,
                clustered: 0,
                flagged: 0,
                errors: 0,
            },
            results: {
                clusters: [],
                conflicts: [],
                newEntities: [],
                mergedEntities: [],
            },
            timing: {
                startTime: new Date(),
            },
            performance: {
                entitiesPerSecond: 0,
                peakMemoryMB: 0,
                cpuUtilization: 0,
            },
        };
        this.jobs.set(job.id, job);
        // Execute asynchronously
        this.executeResolutionJob(job).catch((error) => {
            job.status = 'failed';
            job.timing.endTime = new Date();
            this.jobs.set(job.id, job);
            this.emit('resolution_failed', { job, error: error.message });
        });
        return job;
    }
    /**
     * Find potential matches for entity
     */
    async findMatches(entityId, confidence = 0.8) {
        const entity = this.entities.get(entityId);
        if (!entity) {
            throw new Error('Entity not found');
        }
        const matches = [];
        // Apply active matching rules
        for (const rule of this.rules.values()) {
            if (!rule.enabled || !rule.entityTypes.includes(entity.type)) {
                continue;
            }
            const candidates = await this.findCandidates(entity, rule);
            for (const candidate of candidates) {
                const match = await this.evaluateMatch(entity, candidate, rule);
                if (match.confidence >= confidence) {
                    const existing = matches.find((m) => m.entityId === candidate.id);
                    if (existing) {
                        // Combine evidence from multiple rules
                        existing.confidence = Math.max(existing.confidence, match.confidence);
                        existing.evidence.push(...match.evidence);
                    }
                    else {
                        matches.push({
                            entityId: candidate.id,
                            confidence: match.confidence,
                            evidence: match.evidence,
                        });
                    }
                }
            }
        }
        return matches.sort((a, b) => b.confidence - a.confidence);
    }
    /**
     * Create or update resolution cluster
     */
    async createCluster(entityIds, method, confidence, evidence) {
        if (entityIds.length < 2) {
            throw new Error('Cluster requires at least 2 entities');
        }
        const entities = entityIds
            .map((id) => this.entities.get(id))
            .filter(Boolean);
        if (entities.length !== entityIds.length) {
            throw new Error('Some entities not found');
        }
        // Create canonical entity by merging attributes
        const canonicalEntity = await this.mergeEntityProfiles(entities);
        // Detect conflicts
        const conflicts = await this.detectAttributeConflicts(entities);
        const cluster = {
            id: crypto_1.default.randomUUID(),
            entityIds,
            confidence,
            resolution: {
                method,
                algorithm: this.getAlgorithmName(method),
                features: await this.extractFeatures(entities),
                threshold: confidence,
            },
            evidence,
            conflicts,
            canonicalEntity,
            audit: {
                createdAt: new Date(),
                lastUpdated: new Date(),
                version: 1,
            },
        };
        this.clusters.set(cluster.id, cluster);
        this.emit('cluster_created', cluster);
        return cluster;
    }
    /**
     * Review and approve cluster
     */
    async reviewCluster(clusterId, reviewer, decision, modifications) {
        const cluster = this.clusters.get(clusterId);
        if (!cluster) {
            throw new Error('Cluster not found');
        }
        switch (decision) {
            case 'approve':
                cluster.audit.reviewedBy = reviewer;
                cluster.audit.approvedBy = reviewer;
                cluster.audit.lastUpdated = new Date();
                break;
            case 'reject':
                this.clusters.delete(clusterId);
                this.emit('cluster_rejected', { clusterId, reviewer });
                return cluster;
            case 'modify':
                if (modifications) {
                    Object.assign(cluster, modifications);
                    cluster.audit.reviewedBy = reviewer;
                    cluster.audit.lastUpdated = new Date();
                    cluster.audit.version++;
                }
                break;
        }
        this.clusters.set(clusterId, cluster);
        this.emit('cluster_reviewed', { cluster, decision, reviewer });
        return cluster;
    }
    /**
     * Add custom matching rule
     */
    async addMatchingRule(rule) {
        const fullRule = {
            ...rule,
            id: crypto_1.default.randomUUID(),
            statistics: {
                matches: 0,
                falsePositives: 0,
                falseNegatives: 0,
                precision: 0,
                recall: 0,
            },
        };
        this.rules.set(fullRule.id, fullRule);
        this.emit('rule_added', fullRule);
        return fullRule;
    }
    /**
     * Get resolution statistics
     */
    getStatistics() {
        const entities = this.entities.size;
        const clusters = this.clusters.size;
        const clusterSizes = Array.from(this.clusters.values()).map((c) => c.entityIds.length);
        const avgClusterSize = clusterSizes.length > 0
            ? clusterSizes.reduce((a, b) => a + b, 0) / clusterSizes.length
            : 0;
        const confidences = Array.from(this.clusters.values()).map((c) => c.confidence);
        const confidence = confidences.length > 0
            ? {
                avg: confidences.reduce((a, b) => a + b, 0) / confidences.length,
                min: Math.min(...confidences),
                max: Math.max(...confidences),
            }
            : { avg: 0, min: 0, max: 0 };
        const conflicts = Array.from(this.clusters.values()).reduce((total, c) => total + c.conflicts.length, 0);
        const resolvedEntities = Array.from(this.clusters.values()).reduce((total, c) => total + c.entityIds.length, 0);
        return {
            entities,
            clusters,
            avgClusterSize,
            resolutionRate: entities > 0 ? resolvedEntities / entities : 0,
            confidence,
            conflicts,
        };
    }
    async executeResolutionJob(job) {
        job.status = 'running';
        try {
            // Get entities in scope
            const scopedEntities = await this.getScopedEntities(job.scope);
            job.progress.total = scopedEntities.length;
            const startTime = Date.now();
            // Process in batches
            for (let i = 0; i < scopedEntities.length; i += job.configuration.batchSize) {
                const batch = scopedEntities.slice(i, i + job.configuration.batchSize);
                for (const entity of batch) {
                    try {
                        const matches = await this.findMatches(entity.id, job.configuration.confidence);
                        if (matches.length > 0) {
                            const evidence = matches.flatMap((m) => m.evidence);
                            const avgConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) /
                                matches.length;
                            const cluster = await this.createCluster([entity.id, ...matches.map((m) => m.entityId)], 'hybrid', avgConfidence, evidence);
                            job.results.clusters.push(cluster.id);
                            job.progress.clustered++;
                            if (cluster.conflicts.length > 0) {
                                job.results.conflicts.push(cluster.id);
                                job.progress.flagged++;
                            }
                        }
                        job.progress.processed++;
                    }
                    catch (error) {
                        job.progress.errors++;
                    }
                }
                // Update performance metrics
                const elapsed = (Date.now() - startTime) / 1000;
                job.performance.entitiesPerSecond = job.progress.processed / elapsed;
            }
            job.status = 'completed';
            job.timing.endTime = new Date();
            job.timing.duration =
                job.timing.endTime.getTime() - job.timing.startTime.getTime();
            this.emit('resolution_completed', job);
        }
        catch (error) {
            job.status = 'failed';
            job.timing.endTime = new Date();
            throw error;
        }
        finally {
            this.jobs.set(job.id, job);
        }
    }
    async getScopedEntities(scope) {
        let entities = Array.from(this.entities.values());
        if (scope.entityTypes) {
            entities = entities.filter((e) => scope.entityTypes.includes(e.type));
        }
        if (scope.sourceSystems) {
            entities = entities.filter((e) => scope.sourceSystems.includes(e.sourceSystem));
        }
        if (scope.entityIds) {
            entities = entities.filter((e) => scope.entityIds.includes(e.id));
        }
        if (scope.timeRange) {
            entities = entities.filter((e) => e.metadata.lastUpdated >= scope.timeRange.start &&
                e.metadata.lastUpdated <= scope.timeRange.end);
        }
        return entities;
    }
    async findCandidates(entity, rule) {
        const candidates = [];
        for (const candidate of this.entities.values()) {
            if (candidate.id === entity.id)
                continue;
            if (!rule.entityTypes.includes(candidate.type))
                continue;
            // Apply blockers first for efficiency
            if (rule.blockers) {
                let blocked = false;
                for (const blocker of rule.blockers) {
                    if (this.evaluateBlocker(entity, candidate, blocker)) {
                        blocked = true;
                        break;
                    }
                }
                if (blocked)
                    continue;
            }
            candidates.push(candidate);
        }
        return candidates;
    }
    async evaluateMatch(entity1, entity2, rule) {
        let totalScore = 0;
        let totalWeight = 0;
        const evidence = [];
        for (const condition of rule.conditions) {
            const score = await this.evaluateCondition(entity1, entity2, condition);
            totalScore += score * condition.weight;
            totalWeight += condition.weight;
            if (score > condition.threshold) {
                evidence.push({
                    type: `${condition.attribute}_match`,
                    strength: score,
                    details: {
                        comparator: condition.comparator,
                        threshold: condition.threshold,
                        weight: condition.weight,
                    },
                });
            }
            else if (condition.required) {
                return { confidence: 0, evidence: [] };
            }
        }
        const confidence = totalWeight > 0 ? totalScore / totalWeight : 0;
        return { confidence, evidence };
    }
    async evaluateCondition(entity1, entity2, condition) {
        const values1 = this.extractAttributeValues(entity1, condition.attribute);
        const values2 = this.extractAttributeValues(entity2, condition.attribute);
        let maxScore = 0;
        for (const val1 of values1) {
            for (const val2 of values2) {
                const score = await this.compareValues(val1, val2, condition.comparator);
                maxScore = Math.max(maxScore, score);
            }
        }
        return maxScore;
    }
    extractAttributeValues(entity, attribute) {
        switch (attribute) {
            case 'names':
                return entity.attributes.names.map((n) => n.value);
            case 'identifiers':
                return entity.attributes.identifiers.map((i) => i.value);
            case 'addresses':
                return entity.attributes.addresses.map((a) => `${a.street} ${a.city} ${a.country}`);
            default:
                return [];
        }
    }
    async compareValues(val1, val2, comparator) {
        if (val1 === val2)
            return 1.0;
        switch (comparator) {
            case 'exact':
                return val1 === val2 ? 1.0 : 0.0;
            case 'fuzzy':
                return this.fuzzyStringMatch(String(val1), String(val2));
            case 'phonetic':
                return this.phoneticMatch(String(val1), String(val2));
            case 'semantic':
                return await this.semanticMatch(String(val1), String(val2));
            default:
                return 0.0;
        }
    }
    fuzzyStringMatch(str1, str2) {
        // Levenshtein distance-based similarity
        const maxLen = Math.max(str1.length, str2.length);
        if (maxLen === 0)
            return 1.0;
        const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
        return 1.0 - distance / maxLen;
    }
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1)
            .fill(null)
            .map(() => Array(str1.length + 1).fill(null));
        for (let i = 0; i <= str1.length; i++)
            matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++)
            matrix[j][0] = j;
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
            }
        }
        return matrix[str2.length][str1.length];
    }
    phoneticMatch(str1, str2) {
        // Soundex-based phonetic matching
        const soundex1 = this.soundex(str1);
        const soundex2 = this.soundex(str2);
        return soundex1 === soundex2 ? 0.9 : 0.0;
    }
    soundex(str) {
        const a = str.toLowerCase().split('');
        const f = a.shift() || '';
        const r = a
            .join('')
            .replace(/[aeiouyhw]/g, '')
            .replace(/[bfpv]/g, '1')
            .replace(/[cgjkqsxz]/g, '2')
            .replace(/[dt]/g, '3')
            .replace(/[l]/g, '4')
            .replace(/[mn]/g, '5')
            .replace(/[r]/g, '6')
            .replace(/(.)\1+/g, '$1');
        return (f + r + '000').slice(0, 4).toUpperCase();
    }
    async semanticMatch(str1, str2) {
        // Mock semantic similarity using embeddings
        const emb1 = this.getStringEmbedding(str1);
        const emb2 = this.getStringEmbedding(str2);
        return this.cosineSimilarity(emb1, emb2);
    }
    getStringEmbedding(str) {
        // Mock embedding generation
        const hash = crypto_1.default.createHash('sha256').update(str).digest();
        return Array.from(hash.slice(0, 16)).map((b) => (b - 128) / 128);
    }
    cosineSimilarity(vec1, vec2) {
        const dotProduct = vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
        const norm1 = Math.sqrt(vec1.reduce((sum, a) => sum + a * a, 0));
        const norm2 = Math.sqrt(vec2.reduce((sum, a) => sum + a * a, 0));
        return dotProduct / (norm1 * norm2);
    }
    evaluateBlocker(entity1, entity2, blocker) {
        // Evaluate if entities should be blocked from comparison
        const values1 = this.extractAttributeValues(entity1, blocker.attribute);
        const values2 = this.extractAttributeValues(entity2, blocker.attribute);
        return values1.some((v1) => values2.some((v2) => blocker.values.includes(v1) || blocker.values.includes(v2)));
    }
    async validateEntityProfile(entity) {
        if (!entity.type || !entity.sourceSystem) {
            throw new Error('Entity type and source system required');
        }
        if (entity.attributes.names.length === 0) {
            throw new Error('At least one name required');
        }
    }
    async normalizeEntityAttributes(entity) {
        // Normalize names
        entity.attributes.names.forEach((name) => {
            name.value = name.value.trim().toUpperCase();
        });
        // Normalize addresses
        entity.attributes.addresses.forEach((addr) => {
            if (addr.country)
                addr.country = addr.country.toUpperCase();
            if (addr.state)
                addr.state = addr.state.toUpperCase();
        });
    }
    async triggerIncrementalResolution(entityId) {
        // Trigger background resolution for new entity
        setImmediate(async () => {
            try {
                const matches = await this.findMatches(entityId, 0.9);
                if (matches.length > 0) {
                    this.emit('potential_matches_found', { entityId, matches });
                }
            }
            catch (error) {
                this.emit('incremental_resolution_error', {
                    entityId,
                    error: error.message,
                });
            }
        });
    }
    async mergeEntityProfiles(entities) {
        // Create canonical entity by merging all attributes
        const canonical = { ...entities[0] };
        canonical.id = crypto_1.default.randomUUID();
        // Merge names
        const allNames = entities.flatMap((e) => e.attributes.names);
        canonical.attributes.names = this.deduplicateNames(allNames);
        // Merge identifiers
        const allIdentifiers = entities.flatMap((e) => e.attributes.identifiers);
        canonical.attributes.identifiers =
            this.deduplicateIdentifiers(allIdentifiers);
        // Merge addresses
        const allAddresses = entities.flatMap((e) => e.attributes.addresses);
        canonical.attributes.addresses = this.deduplicateAddresses(allAddresses);
        return canonical;
    }
    deduplicateNames(names) {
        const seen = new Set();
        return names.filter((name) => {
            const key = `${name.value}:${name.type}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    deduplicateIdentifiers(identifiers) {
        const seen = new Set();
        return identifiers.filter((id) => {
            const key = `${id.type}:${id.value}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    deduplicateAddresses(addresses) {
        const seen = new Set();
        return addresses.filter((addr) => {
            const key = `${addr.street}:${addr.city}:${addr.country}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
    async detectAttributeConflicts(entities) {
        const conflicts = [];
        // Check for date conflicts
        const birthDates = entities.flatMap((e) => e.attributes.dates
            .filter((d) => d.type === 'birth')
            .map((d) => ({
            entityId: e.id,
            value: d.date,
            confidence: d.confidence,
        })));
        if (birthDates.length > 1 &&
            !this.datesCompatible(birthDates.map((d) => d.value))) {
            conflicts.push({
                attribute: 'birth_date',
                values: birthDates,
                resolution: 'manual_review',
            });
        }
        return conflicts;
    }
    datesCompatible(dates) {
        // Check if dates are within reasonable range (e.g., 1 year)
        const timestamps = dates.map((d) => d.getTime());
        const min = Math.min(...timestamps);
        const max = Math.max(...timestamps);
        return max - min <= 365 * 24 * 60 * 60 * 1000; // 1 year
    }
    async extractFeatures(entities) {
        const features = new Set();
        entities.forEach((entity) => {
            entity.attributes.names.forEach((name) => features.add(`name:${name.type}`));
            entity.attributes.identifiers.forEach((id) => features.add(`id:${id.type}`));
            entity.attributes.addresses.forEach((addr) => features.add(`addr:${addr.type}`));
        });
        return Array.from(features);
    }
    getAlgorithmName(method) {
        switch (method) {
            case 'deterministic':
                return 'rule_based_exact';
            case 'probabilistic':
                return 'fellegi_sunter';
            case 'ml_supervised':
                return 'gradient_boosting_classifier';
            case 'ml_unsupervised':
                return 'clustering_ensemble';
            case 'hybrid':
                return 'multi_stage_pipeline';
            default:
                return 'unknown';
        }
    }
    initializeDefaultRules() {
        // High-precision name + identifier rule
        this.addMatchingRule({
            name: 'High Precision Name + ID Match',
            priority: 1,
            entityTypes: ['individual', 'organization'],
            conditions: [
                {
                    attribute: 'names',
                    comparator: 'fuzzy',
                    threshold: 0.95,
                    weight: 0.6,
                    required: true,
                },
                {
                    attribute: 'identifiers',
                    comparator: 'exact',
                    threshold: 1.0,
                    weight: 0.4,
                    required: true,
                },
            ],
            actions: [
                {
                    type: 'cluster',
                    confidence: 0.95,
                    parameters: { autoApprove: true },
                },
            ],
            enabled: true,
        });
        // Address-based corporate linkage
        this.addMatchingRule({
            name: 'Corporate Address Linkage',
            priority: 2,
            entityTypes: ['organization'],
            conditions: [
                {
                    attribute: 'names',
                    comparator: 'fuzzy',
                    threshold: 0.8,
                    weight: 0.4,
                    required: false,
                },
                {
                    attribute: 'addresses',
                    comparator: 'fuzzy',
                    threshold: 0.9,
                    weight: 0.6,
                    required: true,
                },
            ],
            actions: [
                {
                    type: 'flag',
                    confidence: 0.8,
                    parameters: { reviewRequired: true },
                },
            ],
            enabled: true,
        });
    }
}
exports.EntityResolver = EntityResolver;
