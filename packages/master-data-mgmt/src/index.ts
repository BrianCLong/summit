/**
 * Master Data Management Engine
 * Comprehensive MDM solution with golden record creation, entity matching,
 * record merging, hierarchy management, and data stewardship workflows.
 */

import { trace } from '@opentelemetry/api';
import { Pool, PoolClient } from 'pg';
import { EntityMatcher, EntityMatcherConfig } from './matching/entity-matcher.js';
import { RecordMerger, RecordMergerConfig } from './merging/record-merger.js';
import { HierarchyManager, HierarchyManagerConfig } from './hierarchy/hierarchy-manager.js';
import { WorkflowEngine, WorkflowEngineConfig } from './stewardship/workflow-engine.js';

import type {
  MDMConfig,
  SourceRecord,
  GoldenRecord,
  MatchRule,
  MatchResult,
  MergeStrategy,
  MergeResult,
  EntityRelationship,
  EntityHierarchy,
  StewardshipTask,
  WorkflowDefinition,
  ReferenceDataSet,
  ReferenceData,
  DataVersion,
  AuditLog,
  MDMDomain,
  ChangeType,
} from './types.js';

const tracer = trace.getTracer('master-data-mgmt');

/**
 * MDM Engine Configuration
 */
export interface MDMEngineConfig {
  database?: {
    pool: Pool;
  };
  matching?: EntityMatcherConfig;
  merging?: RecordMergerConfig;
  hierarchy?: HierarchyManagerConfig;
  workflow?: WorkflowEngineConfig;
  enableVersionControl?: boolean;
  enableAudit?: boolean;
}

/**
 * Master Data Management Engine
 * Main entry point for all MDM operations
 */
export class MDMEngine {
  private pool?: Pool;
  private matcher: EntityMatcher;
  private merger: RecordMerger;
  private hierarchyManager: HierarchyManager;
  private workflowEngine: WorkflowEngine;
  private config: MDMEngineConfig;

  // In-memory stores (in production, these would be database-backed)
  private sourceRecords: Map<string, SourceRecord>;
  private goldenRecords: Map<string, GoldenRecord>;
  private matchRules: Map<string, MatchRule>;
  private mergeStrategies: Map<string, MergeStrategy>;
  private referenceDataSets: Map<string, ReferenceDataSet>;
  private versions: Map<string, DataVersion[]>;
  private auditLogs: AuditLog[];

  constructor(config: MDMEngineConfig = {}) {
    this.config = config;
    this.pool = config.database?.pool;

    // Initialize components
    this.matcher = new EntityMatcher(config.matching);
    this.merger = new RecordMerger(config.merging);
    this.hierarchyManager = new HierarchyManager(config.hierarchy);
    this.workflowEngine = new WorkflowEngine(config.workflow);

    // Initialize stores
    this.sourceRecords = new Map();
    this.goldenRecords = new Map();
    this.matchRules = new Map();
    this.mergeStrategies = new Map();
    this.referenceDataSets = new Map();
    this.versions = new Map();
    this.auditLogs = [];
  }

  // ========================================================================
  // Configuration Management
  // ========================================================================

  /**
   * Initialize MDM engine with configuration
   */
  async initialize(mdmConfig: MDMConfig): Promise<void> {
    return tracer.startActiveSpan('MDMEngine.initialize', async (span) => {
      try {
        // Load domain configurations
        for (const domainConfig of mdmConfig.domains) {
          if (!domainConfig.enabled) {
            continue;
          }

          // Register match rules
          for (const rule of domainConfig.matchRules) {
            this.matchRules.set(rule.ruleId, rule);
          }

          // Register merge strategy
          this.mergeStrategies.set(
            domainConfig.mergeStrategy.strategyId,
            domainConfig.mergeStrategy
          );

          // Register workflows
          for (const workflow of domainConfig.workflows) {
            await this.workflowEngine.registerWorkflow(workflow);
          }
        }

        span.setAttribute('domains.count', mdmConfig.domains.length);
      } finally {
        span.end();
      }
    });
  }

  /**
   * Register a match rule
   */
  async registerMatchRule(rule: MatchRule): Promise<void> {
    this.matchRules.set(rule.ruleId, rule);
  }

  /**
   * Register a merge strategy
   */
  async registerMergeStrategy(strategy: MergeStrategy): Promise<void> {
    this.mergeStrategies.set(strategy.strategyId, strategy);
  }

  // ========================================================================
  // Source Record Management
  // ========================================================================

  /**
   * Add a source record
   */
  async addSourceRecord<T = Record<string, unknown>>(
    record: SourceRecord<T>
  ): Promise<SourceRecord<T>> {
    return tracer.startActiveSpan('MDMEngine.addSourceRecord', async (span) => {
      try {
        span.setAttribute('record.id', record.recordId);
        span.setAttribute('domain', record.domain);

        this.sourceRecords.set(record.recordId, record as SourceRecord);

        // Audit log
        if (this.config.enableAudit) {
          await this.logAudit({
            auditId: `audit-${Date.now()}`,
            entityType: 'source_record',
            entityId: record.recordId,
            domain: record.domain,
            action: 'create',
            changeType: 'create',
            userId: 'system',
            userName: 'System',
            timestamp: new Date(),
          });
        }

        // Version control
        if (this.config.enableVersionControl) {
          await this.createVersion(record.recordId, record.data, 'create');
        }

        return record;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Get source record by ID
   */
  async getSourceRecord<T = Record<string, unknown>>(
    recordId: string
  ): Promise<SourceRecord<T> | undefined> {
    return this.sourceRecords.get(recordId) as SourceRecord<T> | undefined;
  }

  /**
   * Get all source records for a domain
   */
  async getSourceRecordsByDomain<T = Record<string, unknown>>(
    domain: MDMDomain
  ): Promise<SourceRecord<T>[]> {
    return Array.from(this.sourceRecords.values()).filter(
      (r) => r.domain === domain
    ) as SourceRecord<T>[];
  }

  // ========================================================================
  // Matching Operations
  // ========================================================================

  /**
   * Find matches for a source record
   */
  async findMatches<T = Record<string, unknown>>(
    record: SourceRecord<T>,
    candidates?: SourceRecord<T>[]
  ): Promise<MatchResult[]> {
    return tracer.startActiveSpan('MDMEngine.findMatches', async (span) => {
      try {
        span.setAttribute('record.id', record.recordId);

        // Get domain rules
        const rules = Array.from(this.matchRules.values()).filter(
          (r) => r.domain === record.domain
        );

        if (rules.length === 0) {
          throw new Error(`No match rules found for domain ${record.domain}`);
        }

        // Get candidates from same domain
        const matchCandidates =
          candidates || (await this.getSourceRecordsByDomain<T>(record.domain));

        // Filter out the record itself
        const filteredCandidates = matchCandidates.filter(
          (c) => c.recordId !== record.recordId
        );

        // Find matches
        const matches = await this.matcher.findMatches(
          record,
          filteredCandidates,
          rules
        );

        span.setAttribute('matches.count', matches.length);
        return matches;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Batch match records
   */
  async batchMatch<T = Record<string, unknown>>(
    domain: MDMDomain
  ): Promise<Map<string, MatchResult[]>> {
    return tracer.startActiveSpan('MDMEngine.batchMatch', async (span) => {
      try {
        span.setAttribute('domain', domain);

        const records = await this.getSourceRecordsByDomain<T>(domain);
        const rules = Array.from(this.matchRules.values()).filter(
          (r) => r.domain === domain
        );

        if (rules.length === 0) {
          throw new Error(`No match rules found for domain ${domain}`);
        }

        const results = await this.matcher.batchMatch(records, rules);

        span.setAttribute('records.matched', results.size);
        return results;
      } finally {
        span.end();
      }
    });
  }

  // ========================================================================
  // Merging Operations
  // ========================================================================

  /**
   * Merge source records into a golden record
   */
  async mergeRecords<T = Record<string, unknown>>(
    sourceRecordIds: string[],
    strategyId: string,
    userId?: string
  ): Promise<MergeResult<T>> {
    return tracer.startActiveSpan('MDMEngine.mergeRecords', async (span) => {
      try {
        span.setAttribute('source.records.count', sourceRecordIds.length);
        span.setAttribute('strategy.id', strategyId);

        // Get source records
        const sourceRecords = sourceRecordIds
          .map((id) => this.sourceRecords.get(id))
          .filter((r) => r !== undefined) as SourceRecord<T>[];

        if (sourceRecords.length === 0) {
          throw new Error('No valid source records found');
        }

        // Get merge strategy
        const strategy = this.mergeStrategies.get(strategyId);
        if (!strategy) {
          throw new Error(`Merge strategy ${strategyId} not found`);
        }

        // Merge records
        const result = await this.merger.mergeRecords(
          sourceRecords,
          strategy,
          userId
        );

        // Store golden record
        this.goldenRecords.set(result.goldenRecord.goldenId, result.goldenRecord as GoldenRecord);

        // Create stewardship task if review required
        if (result.requiresReview) {
          await this.workflowEngine.createTask(
            'merge_review',
            result.goldenRecord.domain,
            `Review merge of ${sourceRecordIds.length} records`,
            `Please review the merge result and resolve conflicts`,
            {
              recordIds: sourceRecordIds,
              conflicts: result.conflicts,
            },
            'medium',
            userId || 'system'
          );
        }

        // Audit log
        if (this.config.enableAudit) {
          await this.logAudit({
            auditId: `audit-${Date.now()}`,
            entityType: 'golden_record',
            entityId: result.goldenRecord.goldenId,
            domain: result.goldenRecord.domain,
            action: 'merge',
            changeType: 'merge',
            userId: userId || 'system',
            userName: userId || 'System',
            timestamp: new Date(),
            metadata: {
              sourceRecords: sourceRecordIds,
              conflictCount: result.conflicts.length,
            },
          });
        }

        span.setAttribute('golden.id', result.goldenRecord.goldenId);
        span.setAttribute('requires.review', result.requiresReview);

        return result;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Auto-merge matching records
   */
  async autoMerge<T = Record<string, unknown>>(
    domain: MDMDomain,
    matchThreshold: number = 0.9,
    userId?: string
  ): Promise<MergeResult<T>[]> {
    return tracer.startActiveSpan('MDMEngine.autoMerge', async (span) => {
      try {
        span.setAttribute('domain', domain);
        span.setAttribute('match.threshold', matchThreshold);

        // Find matches
        const matchResults = await this.batchMatch<T>(domain);

        // Group matching records
        const mergeGroups = this.groupMatchingRecords(
          matchResults,
          matchThreshold
        );

        // Merge each group
        const results: MergeResult<T>[] = [];
        for (const group of mergeGroups) {
          const strategy = Array.from(this.mergeStrategies.values()).find(
            (s) => s.domain === domain
          );

          if (!strategy) {
            continue;
          }

          const result = await this.mergeRecords<T>(
            group,
            strategy.strategyId,
            userId
          );
          results.push(result);
        }

        span.setAttribute('merge.groups', mergeGroups.length);
        return results;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Get golden record by ID
   */
  async getGoldenRecord<T = Record<string, unknown>>(
    goldenId: string
  ): Promise<GoldenRecord<T> | undefined> {
    return this.goldenRecords.get(goldenId) as GoldenRecord<T> | undefined;
  }

  /**
   * Get all golden records for a domain
   */
  async getGoldenRecordsByDomain<T = Record<string, unknown>>(
    domain: MDMDomain
  ): Promise<GoldenRecord<T>[]> {
    return Array.from(this.goldenRecords.values()).filter(
      (r) => r.domain === domain
    ) as GoldenRecord<T>[];
  }

  // ========================================================================
  // Hierarchy Operations
  // ========================================================================

  /**
   * Create entity relationship
   */
  async createRelationship(
    parentId: string,
    childId: string,
    relationType: string,
    domain: MDMDomain,
    attributes?: Record<string, unknown>
  ): Promise<EntityRelationship> {
    return this.hierarchyManager.createRelationship(
      parentId,
      childId,
      relationType,
      domain,
      attributes
    );
  }

  /**
   * Build entity hierarchy
   */
  async buildHierarchy(
    relationships: EntityRelationship[],
    rootEntityId: string,
    domain: MDMDomain,
    name: string
  ): Promise<EntityHierarchy> {
    return this.hierarchyManager.buildHierarchy(
      relationships,
      rootEntityId,
      domain,
      name
    );
  }

  /**
   * Get hierarchy manager for advanced operations
   */
  getHierarchyManager(): HierarchyManager {
    return this.hierarchyManager;
  }

  // ========================================================================
  // Stewardship Operations
  // ========================================================================

  /**
   * Create stewardship task
   */
  async createTask(
    taskType: string,
    domain: MDMDomain,
    title: string,
    description: string,
    data: Record<string, unknown>,
    priority: string = 'medium',
    createdBy: string
  ): Promise<StewardshipTask> {
    return this.workflowEngine.createTask(
      taskType as Parameters<typeof this.workflowEngine.createTask>[0],
      domain,
      title,
      description,
      data,
      priority as Parameters<typeof this.workflowEngine.createTask>[5],
      createdBy
    );
  }

  /**
   * Get workflow engine for advanced operations
   */
  getWorkflowEngine(): WorkflowEngine {
    return this.workflowEngine;
  }

  // ========================================================================
  // Reference Data Management
  // ========================================================================

  /**
   * Register reference data set
   */
  async registerReferenceDataSet(
    dataSet: ReferenceDataSet
  ): Promise<void> {
    this.referenceDataSets.set(dataSet.setId, dataSet);
  }

  /**
   * Get reference data
   */
  async getReferenceData(
    setId: string,
    code?: string
  ): Promise<ReferenceData[]> {
    const dataSet = this.referenceDataSets.get(setId);
    if (!dataSet) {
      return [];
    }

    if (code) {
      return dataSet.data.filter((d) => d.code === code);
    }

    return dataSet.data;
  }

  /**
   * Validate against reference data
   */
  async validateReferenceData(
    setId: string,
    code: string
  ): Promise<boolean> {
    const dataSet = this.referenceDataSets.get(setId);
    if (!dataSet) {
      return false;
    }

    return dataSet.data.some((d) => d.code === code && d.isActive);
  }

  // ========================================================================
  // Version Control
  // ========================================================================

  /**
   * Create version of data
   */
  private async createVersion<T = Record<string, unknown>>(
    recordId: string,
    data: T,
    changeType: ChangeType,
    userId?: string
  ): Promise<DataVersion<T>> {
    const versions = this.versions.get(recordId) || [];
    const version = versions.length + 1;

    const dataVersion: DataVersion<T> = {
      versionId: `${recordId}-v${version}`,
      recordId,
      version,
      data,
      changeType,
      changes: [],
      createdAt: new Date(),
      createdBy: userId || 'system',
      previousVersionId: versions.length > 0 ? versions[versions.length - 1].versionId : undefined,
    };

    versions.push(dataVersion);
    this.versions.set(recordId, versions);

    return dataVersion;
  }

  /**
   * Get version history
   */
  async getVersionHistory<T = Record<string, unknown>>(
    recordId: string
  ): Promise<DataVersion<T>[]> {
    return (this.versions.get(recordId) || []) as DataVersion<T>[];
  }

  /**
   * Get specific version
   */
  async getVersion<T = Record<string, unknown>>(
    recordId: string,
    version: number
  ): Promise<DataVersion<T> | undefined> {
    const versions = this.versions.get(recordId) || [];
    return versions.find((v) => v.version === version) as DataVersion<T> | undefined;
  }

  // ========================================================================
  // Audit Logging
  // ========================================================================

  /**
   * Log audit entry
   */
  private async logAudit(entry: AuditLog): Promise<void> {
    this.auditLogs.push(entry);
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(criteria?: {
    entityId?: string;
    entityType?: string;
    domain?: MDMDomain;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLog[]> {
    let logs = this.auditLogs;

    if (criteria) {
      if (criteria.entityId) {
        logs = logs.filter((l) => l.entityId === criteria.entityId);
      }
      if (criteria.entityType) {
        logs = logs.filter((l) => l.entityType === criteria.entityType);
      }
      if (criteria.domain) {
        logs = logs.filter((l) => l.domain === criteria.domain);
      }
      if (criteria.userId) {
        logs = logs.filter((l) => l.userId === criteria.userId);
      }
      if (criteria.startDate) {
        logs = logs.filter((l) => l.timestamp >= criteria.startDate!);
      }
      if (criteria.endDate) {
        logs = logs.filter((l) => l.timestamp <= criteria.endDate!);
      }
    }

    return logs;
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Group matching records for merging
   */
  private groupMatchingRecords(
    matchResults: Map<string, MatchResult[]>,
    threshold: number
  ): string[][] {
    const groups: string[][] = [];
    const processed = new Set<string>();

    for (const [recordId, matches] of matchResults) {
      if (processed.has(recordId)) {
        continue;
      }

      const group = [recordId];
      processed.add(recordId);

      // Add matching records above threshold
      for (const match of matches) {
        if (
          match.matchScore >= threshold &&
          !processed.has(match.record2Id)
        ) {
          group.push(match.record2Id);
          processed.add(match.record2Id);
        }
      }

      if (group.length > 1) {
        groups.push(group);
      }
    }

    return groups;
  }

  /**
   * Get statistics
   */
  async getStatistics(domain?: MDMDomain): Promise<{
    sourceRecords: number;
    goldenRecords: number;
    matchRules: number;
    mergeStrategies: number;
    referenceDataSets: number;
    auditLogs: number;
  }> {
    const filter = (items: Array<{ domain?: MDMDomain }>) => {
      return domain ? items.filter((i) => i.domain === domain) : items;
    };

    return {
      sourceRecords: filter(Array.from(this.sourceRecords.values())).length,
      goldenRecords: filter(Array.from(this.goldenRecords.values())).length,
      matchRules: filter(Array.from(this.matchRules.values())).length,
      mergeStrategies: filter(Array.from(this.mergeStrategies.values())).length,
      referenceDataSets: filter(Array.from(this.referenceDataSets.values())).length,
      auditLogs: domain
        ? this.auditLogs.filter((l) => l.domain === domain).length
        : this.auditLogs.length,
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

// Export all types and components
export * from './types.js';
export { EntityMatcher } from './matching/entity-matcher.js';
export { RecordMerger } from './merging/record-merger.js';
export { HierarchyManager } from './hierarchy/hierarchy-manager.js';
export { WorkflowEngine } from './stewardship/workflow-engine.js';
