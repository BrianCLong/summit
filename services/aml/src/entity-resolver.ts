/**
 * AML Entity Resolution Engine
 * Sprint 28C: Advanced ML-driven entity linkage across financial networks
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface EntityProfile {
  id: string;
  sourceSystem: string;
  externalId: string;
  type: 'individual' | 'organization' | 'vessel' | 'account' | 'address';
  attributes: {
    names: Array<{
      value: string;
      type: 'legal' | 'alias' | 'former' | 'aka' | 'dba';
      script?: string;
      confidence: number;
    }>;
    identifiers: Array<{
      type:
        | 'ssn'
        | 'tin'
        | 'passport'
        | 'license'
        | 'lei'
        | 'swift'
        | 'imo'
        | 'custom';
      value: string;
      country?: string;
      issuedDate?: Date;
      expiryDate?: Date;
      confidence: number;
    }>;
    addresses: Array<{
      type: 'residential' | 'business' | 'mailing' | 'registered';
      street?: string;
      city?: string;
      state?: string;
      country: string;
      postalCode?: string;
      coordinates?: { lat: number; lng: number };
      confidence: number;
    }>;
    dates: Array<{
      type:
        | 'birth'
        | 'incorporation'
        | 'registration'
        | 'death'
        | 'dissolution';
      date: Date;
      precision: 'day' | 'month' | 'year';
      confidence: number;
    }>;
    demographics?: {
      gender?: 'M' | 'F' | 'U';
      nationality?: string[];
      occupation?: string;
      industry?: string;
    };
    financial?: {
      currencies: string[];
      jurisdictions: string[];
      riskRating: number;
      totalVolume?: number;
    };
  };
  metadata: {
    sourceReliability: number;
    lastUpdated: Date;
    recordCount: number;
    verificationStatus: 'unverified' | 'partial' | 'verified' | 'disputed';
  };
  relationships: Array<{
    entityId: string;
    type:
      | 'owns'
      | 'controls'
      | 'manages'
      | 'related'
      | 'same_address'
      | 'correspondent';
    strength: number;
    evidence: string[];
  }>;
}

export interface ResolutionCluster {
  id: string;
  entityIds: string[];
  confidence: number;
  resolution: {
    method:
      | 'deterministic'
      | 'probabilistic'
      | 'ml_supervised'
      | 'ml_unsupervised'
      | 'hybrid';
    algorithm: string;
    features: string[];
    threshold: number;
  };
  evidence: Array<{
    type:
      | 'name_match'
      | 'identifier_match'
      | 'address_match'
      | 'network_pattern'
      | 'temporal_pattern';
    strength: number;
    details: Record<string, any>;
  }>;
  conflicts: Array<{
    attribute: string;
    values: Array<{ entityId: string; value: any; confidence: number }>;
    resolution: 'ignore' | 'merge' | 'flag' | 'manual_review';
  }>;
  canonicalEntity: EntityProfile;
  audit: {
    createdAt: Date;
    lastUpdated: Date;
    reviewedBy?: string;
    approvedBy?: string;
    version: number;
  };
}

export interface MatchingRule {
  id: string;
  name: string;
  priority: number;
  entityTypes: EntityProfile['type'][];
  conditions: Array<{
    attribute: string;
    comparator:
      | 'exact'
      | 'fuzzy'
      | 'phonetic'
      | 'semantic'
      | 'pattern'
      | 'range';
    threshold: number;
    weight: number;
    required: boolean;
  }>;
  blockers?: Array<{
    attribute: string;
    condition: string;
    values: any[];
  }>;
  actions: Array<{
    type: 'cluster' | 'flag' | 'review' | 'reject';
    confidence: number;
    parameters: Record<string, any>;
  }>;
  enabled: boolean;
  statistics: {
    matches: number;
    falsePositives: number;
    falseNegatives: number;
    precision: number;
    recall: number;
  };
}

export interface ResolutionJob {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  type: 'full_resolution' | 'incremental' | 'targeted' | 'validation';
  scope: {
    entityTypes?: EntityProfile['type'][];
    sourceSystems?: string[];
    timeRange?: { start: Date; end: Date };
    entityIds?: string[];
  };
  configuration: {
    rules: string[];
    algorithms: string[];
    confidence: number;
    autoApprove: boolean;
    batchSize: number;
  };
  progress: {
    total: number;
    processed: number;
    clustered: number;
    flagged: number;
    errors: number;
  };
  results: {
    clusters: string[];
    conflicts: string[];
    newEntities: string[];
    mergedEntities: string[];
  };
  timing: {
    startTime: Date;
    endTime?: Date;
    duration?: number;
  };
  performance: {
    entitiesPerSecond: number;
    peakMemoryMB: number;
    cpuUtilization: number;
  };
}

export class EntityResolver extends EventEmitter {
  private entities = new Map<string, EntityProfile>();
  private clusters = new Map<string, ResolutionCluster>();
  private rules = new Map<string, MatchingRule>();
  private jobs = new Map<string, ResolutionJob>();

  // ML Models for advanced matching
  private nameEmbeddings = new Map<string, number[]>();
  private addressEmbeddings = new Map<string, number[]>();

  constructor() {
    super();
    this.initializeDefaultRules();
  }

  /**
   * Register entity profile for resolution
   */
  async registerEntity(
    entity: Omit<EntityProfile, 'id'>,
  ): Promise<EntityProfile> {
    const fullEntity: EntityProfile = {
      ...entity,
      id: crypto.randomUUID(),
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
  async executeResolution(
    scope: ResolutionJob['scope'] = {},
    configuration: Partial<ResolutionJob['configuration']> = {},
  ): Promise<ResolutionJob> {
    const job: ResolutionJob = {
      id: crypto.randomUUID(),
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
  async findMatches(
    entityId: string,
    confidence = 0.8,
  ): Promise<
    Array<{
      entityId: string;
      confidence: number;
      evidence: Array<{ type: string; strength: number; details: any }>;
    }>
  > {
    const entity = this.entities.get(entityId);
    if (!entity) {
      throw new Error('Entity not found');
    }

    const matches: Array<{
      entityId: string;
      confidence: number;
      evidence: Array<{ type: string; strength: number; details: any }>;
    }> = [];

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
            existing.confidence = Math.max(
              existing.confidence,
              match.confidence,
            );
            existing.evidence.push(...match.evidence);
          } else {
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
  async createCluster(
    entityIds: string[],
    method: ResolutionCluster['resolution']['method'],
    confidence: number,
    evidence: ResolutionCluster['evidence'],
  ): Promise<ResolutionCluster> {
    if (entityIds.length < 2) {
      throw new Error('Cluster requires at least 2 entities');
    }

    const entities = entityIds
      .map((id) => this.entities.get(id))
      .filter(Boolean) as EntityProfile[];
    if (entities.length !== entityIds.length) {
      throw new Error('Some entities not found');
    }

    // Create canonical entity by merging attributes
    const canonicalEntity = await this.mergeEntityProfiles(entities);

    // Detect conflicts
    const conflicts = await this.detectAttributeConflicts(entities);

    const cluster: ResolutionCluster = {
      id: crypto.randomUUID(),
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
  async reviewCluster(
    clusterId: string,
    reviewer: string,
    decision: 'approve' | 'reject' | 'modify',
    modifications?: Partial<ResolutionCluster>,
  ): Promise<ResolutionCluster> {
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
  async addMatchingRule(
    rule: Omit<MatchingRule, 'id' | 'statistics'>,
  ): Promise<MatchingRule> {
    const fullRule: MatchingRule = {
      ...rule,
      id: crypto.randomUUID(),
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
  getStatistics(): {
    entities: number;
    clusters: number;
    avgClusterSize: number;
    resolutionRate: number;
    confidence: { avg: number; min: number; max: number };
    conflicts: number;
  } {
    const entities = this.entities.size;
    const clusters = this.clusters.size;

    const clusterSizes = Array.from(this.clusters.values()).map(
      (c) => c.entityIds.length,
    );
    const avgClusterSize =
      clusterSizes.length > 0
        ? clusterSizes.reduce((a, b) => a + b, 0) / clusterSizes.length
        : 0;

    const confidences = Array.from(this.clusters.values()).map(
      (c) => c.confidence,
    );
    const confidence =
      confidences.length > 0
        ? {
            avg: confidences.reduce((a, b) => a + b, 0) / confidences.length,
            min: Math.min(...confidences),
            max: Math.max(...confidences),
          }
        : { avg: 0, min: 0, max: 0 };

    const conflicts = Array.from(this.clusters.values()).reduce(
      (total, c) => total + c.conflicts.length,
      0,
    );

    const resolvedEntities = Array.from(this.clusters.values()).reduce(
      (total, c) => total + c.entityIds.length,
      0,
    );

    return {
      entities,
      clusters,
      avgClusterSize,
      resolutionRate: entities > 0 ? resolvedEntities / entities : 0,
      confidence,
      conflicts,
    };
  }

  private async executeResolutionJob(job: ResolutionJob): Promise<void> {
    job.status = 'running';

    try {
      // Get entities in scope
      const scopedEntities = await this.getScopedEntities(job.scope);
      job.progress.total = scopedEntities.length;

      const startTime = Date.now();

      // Process in batches
      for (
        let i = 0;
        i < scopedEntities.length;
        i += job.configuration.batchSize
      ) {
        const batch = scopedEntities.slice(i, i + job.configuration.batchSize);

        for (const entity of batch) {
          try {
            const matches = await this.findMatches(
              entity.id,
              job.configuration.confidence,
            );

            if (matches.length > 0) {
              const evidence = matches.flatMap((m) => m.evidence);
              const avgConfidence =
                matches.reduce((sum, m) => sum + m.confidence, 0) /
                matches.length;

              const cluster = await this.createCluster(
                [entity.id, ...matches.map((m) => m.entityId)],
                'hybrid',
                avgConfidence,
                evidence,
              );

              job.results.clusters.push(cluster.id);
              job.progress.clustered++;

              if (cluster.conflicts.length > 0) {
                job.results.conflicts.push(cluster.id);
                job.progress.flagged++;
              }
            }

            job.progress.processed++;
          } catch (error) {
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
    } catch (error) {
      job.status = 'failed';
      job.timing.endTime = new Date();
      throw error;
    } finally {
      this.jobs.set(job.id, job);
    }
  }

  private async getScopedEntities(
    scope: ResolutionJob['scope'],
  ): Promise<EntityProfile[]> {
    let entities = Array.from(this.entities.values());

    if (scope.entityTypes) {
      entities = entities.filter((e) => scope.entityTypes!.includes(e.type));
    }

    if (scope.sourceSystems) {
      entities = entities.filter((e) =>
        scope.sourceSystems!.includes(e.sourceSystem),
      );
    }

    if (scope.entityIds) {
      entities = entities.filter((e) => scope.entityIds!.includes(e.id));
    }

    if (scope.timeRange) {
      entities = entities.filter(
        (e) =>
          e.metadata.lastUpdated >= scope.timeRange!.start &&
          e.metadata.lastUpdated <= scope.timeRange!.end,
      );
    }

    return entities;
  }

  private async findCandidates(
    entity: EntityProfile,
    rule: MatchingRule,
  ): Promise<EntityProfile[]> {
    const candidates: EntityProfile[] = [];

    for (const candidate of this.entities.values()) {
      if (candidate.id === entity.id) continue;
      if (!rule.entityTypes.includes(candidate.type)) continue;

      // Apply blockers first for efficiency
      if (rule.blockers) {
        let blocked = false;
        for (const blocker of rule.blockers) {
          if (this.evaluateBlocker(entity, candidate, blocker)) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;
      }

      candidates.push(candidate);
    }

    return candidates;
  }

  private async evaluateMatch(
    entity1: EntityProfile,
    entity2: EntityProfile,
    rule: MatchingRule,
  ): Promise<{
    confidence: number;
    evidence: Array<{ type: string; strength: number; details: any }>;
  }> {
    let totalScore = 0;
    let totalWeight = 0;
    const evidence: Array<{ type: string; strength: number; details: any }> =
      [];

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
      } else if (condition.required) {
        return { confidence: 0, evidence: [] };
      }
    }

    const confidence = totalWeight > 0 ? totalScore / totalWeight : 0;
    return { confidence, evidence };
  }

  private async evaluateCondition(
    entity1: EntityProfile,
    entity2: EntityProfile,
    condition: MatchingRule['conditions'][0],
  ): Promise<number> {
    const values1 = this.extractAttributeValues(entity1, condition.attribute);
    const values2 = this.extractAttributeValues(entity2, condition.attribute);

    let maxScore = 0;

    for (const val1 of values1) {
      for (const val2 of values2) {
        const score = await this.compareValues(
          val1,
          val2,
          condition.comparator,
        );
        maxScore = Math.max(maxScore, score);
      }
    }

    return maxScore;
  }

  private extractAttributeValues(
    entity: EntityProfile,
    attribute: string,
  ): any[] {
    switch (attribute) {
      case 'names':
        return entity.attributes.names.map((n) => n.value);
      case 'identifiers':
        return entity.attributes.identifiers.map((i) => i.value);
      case 'addresses':
        return entity.attributes.addresses.map(
          (a) => `${a.street} ${a.city} ${a.country}`,
        );
      default:
        return [];
    }
  }

  private async compareValues(
    val1: any,
    val2: any,
    comparator: MatchingRule['conditions'][0]['comparator'],
  ): Promise<number> {
    if (val1 === val2) return 1.0;

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

  private fuzzyStringMatch(str1: string, str2: string): number {
    // Levenshtein distance-based similarity
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1.0;

    const distance = this.levenshteinDistance(
      str1.toLowerCase(),
      str2.toLowerCase(),
    );
    return 1.0 - distance / maxLen;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator,
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private phoneticMatch(str1: string, str2: string): number {
    // Soundex-based phonetic matching
    const soundex1 = this.soundex(str1);
    const soundex2 = this.soundex(str2);
    return soundex1 === soundex2 ? 0.9 : 0.0;
  }

  private soundex(str: string): string {
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

  private async semanticMatch(str1: string, str2: string): Promise<number> {
    // Mock semantic similarity using embeddings
    const emb1 = this.getStringEmbedding(str1);
    const emb2 = this.getStringEmbedding(str2);
    return this.cosineSimilarity(emb1, emb2);
  }

  private getStringEmbedding(str: string): number[] {
    // Mock embedding generation
    const hash = crypto.createHash('sha256').update(str).digest();
    return Array.from(hash.slice(0, 16)).map((b) => (b - 128) / 128);
  }

  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((sum, a, i) => sum + a * vec2[i], 0);
    const norm1 = Math.sqrt(vec1.reduce((sum, a) => sum + a * a, 0));
    const norm2 = Math.sqrt(vec2.reduce((sum, a) => sum + a * a, 0));
    return dotProduct / (norm1 * norm2);
  }

  private evaluateBlocker(
    entity1: EntityProfile,
    entity2: EntityProfile,
    blocker: MatchingRule['blockers'][0],
  ): boolean {
    // Evaluate if entities should be blocked from comparison
    const values1 = this.extractAttributeValues(entity1, blocker.attribute);
    const values2 = this.extractAttributeValues(entity2, blocker.attribute);

    return values1.some((v1) =>
      values2.some(
        (v2) => blocker.values.includes(v1) || blocker.values.includes(v2),
      ),
    );
  }

  private async validateEntityProfile(entity: EntityProfile): Promise<void> {
    if (!entity.type || !entity.sourceSystem) {
      throw new Error('Entity type and source system required');
    }

    if (entity.attributes.names.length === 0) {
      throw new Error('At least one name required');
    }
  }

  private async normalizeEntityAttributes(
    entity: EntityProfile,
  ): Promise<void> {
    // Normalize names
    entity.attributes.names.forEach((name) => {
      name.value = name.value.trim().toUpperCase();
    });

    // Normalize addresses
    entity.attributes.addresses.forEach((addr) => {
      if (addr.country) addr.country = addr.country.toUpperCase();
      if (addr.state) addr.state = addr.state.toUpperCase();
    });
  }

  private async triggerIncrementalResolution(entityId: string): Promise<void> {
    // Trigger background resolution for new entity
    setImmediate(async () => {
      try {
        const matches = await this.findMatches(entityId, 0.9);
        if (matches.length > 0) {
          this.emit('potential_matches_found', { entityId, matches });
        }
      } catch (error) {
        this.emit('incremental_resolution_error', {
          entityId,
          error: error.message,
        });
      }
    });
  }

  private async mergeEntityProfiles(
    entities: EntityProfile[],
  ): Promise<EntityProfile> {
    // Create canonical entity by merging all attributes
    const canonical = { ...entities[0] };
    canonical.id = crypto.randomUUID();

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

  private deduplicateNames(
    names: EntityProfile['attributes']['names'],
  ): EntityProfile['attributes']['names'] {
    const seen = new Set<string>();
    return names.filter((name) => {
      const key = `${name.value}:${name.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private deduplicateIdentifiers(
    identifiers: EntityProfile['attributes']['identifiers'],
  ): EntityProfile['attributes']['identifiers'] {
    const seen = new Set<string>();
    return identifiers.filter((id) => {
      const key = `${id.type}:${id.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private deduplicateAddresses(
    addresses: EntityProfile['attributes']['addresses'],
  ): EntityProfile['attributes']['addresses'] {
    const seen = new Set<string>();
    return addresses.filter((addr) => {
      const key = `${addr.street}:${addr.city}:${addr.country}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private async detectAttributeConflicts(
    entities: EntityProfile[],
  ): Promise<ResolutionCluster['conflicts']> {
    const conflicts: ResolutionCluster['conflicts'] = [];

    // Check for date conflicts
    const birthDates = entities.flatMap((e) =>
      e.attributes.dates
        .filter((d) => d.type === 'birth')
        .map((d) => ({
          entityId: e.id,
          value: d.date,
          confidence: d.confidence,
        })),
    );

    if (
      birthDates.length > 1 &&
      !this.datesCompatible(birthDates.map((d) => d.value))
    ) {
      conflicts.push({
        attribute: 'birth_date',
        values: birthDates,
        resolution: 'manual_review',
      });
    }

    return conflicts;
  }

  private datesCompatible(dates: Date[]): boolean {
    // Check if dates are within reasonable range (e.g., 1 year)
    const timestamps = dates.map((d) => d.getTime());
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    return max - min <= 365 * 24 * 60 * 60 * 1000; // 1 year
  }

  private async extractFeatures(entities: EntityProfile[]): Promise<string[]> {
    const features = new Set<string>();

    entities.forEach((entity) => {
      entity.attributes.names.forEach((name) =>
        features.add(`name:${name.type}`),
      );
      entity.attributes.identifiers.forEach((id) =>
        features.add(`id:${id.type}`),
      );
      entity.attributes.addresses.forEach((addr) =>
        features.add(`addr:${addr.type}`),
      );
    });

    return Array.from(features);
  }

  private getAlgorithmName(
    method: ResolutionCluster['resolution']['method'],
  ): string {
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

  private initializeDefaultRules(): void {
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
