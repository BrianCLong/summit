import { createHmac, createHash, randomUUID as uuidv4 } from 'node:crypto';
import pino from 'pino';
import { Pool } from 'pg';
import {
  RTBFRequest,
  RTBFRequestState,
  RTBFJob,
  RTBFAuditEvent,
  RTBFDryRunResults,
  StorageSystem,
  RetentionRecord,
  PurgeManifest,
} from './types.js';
import { DataRetentionRepository } from './repository.js';
import { PolicyEvaluator } from './policyEvaluator.js';
import { RedactionEngine } from './redactionEngine.js';
import { RetentionAuditLogger } from './auditLogger.js';
import {
  createProvenanceChain,
  ProvenanceChain,
  ProvenanceTransform,
} from '../../canonical/provenance.js';

/**
 * RTBF Orchestrator
 *
 * Manages the complete lifecycle of Right-To-Be-Forgotten requests:
 * - Submission and validation
 * - Approval workflow
 * - Impact assessment
 * - Dry-run preview
 * - Execution with provenance tracking
 * - Audit trail
 */
export class RTBFOrchestrator {
  private readonly logger = (pino as any)({ name: 'rtbf-orchestrator' });
  private readonly pool: Pool;
  private readonly repository: DataRetentionRepository;
  private readonly policyEvaluator: PolicyEvaluator;
  private readonly redactionEngine: RedactionEngine;
  private readonly auditLogger: RetentionAuditLogger;
  private readonly requiredApprovals: number;
  private readonly approvalDelayMs: number;
  private readonly signingKey: string;
  private readonly signatureAlgorithm: string;
  private readonly cypherRunner?: (
    cypher: string,
    params?: Record<string, any>,
  ) => Promise<any>;

  // In-memory request storage
  private readonly requests = new Map<string, RTBFRequest>();
  private readonly jobs = new Map<string, RTBFJob>();

  constructor(options: {
    pool: Pool;
    repository?: DataRetentionRepository;
    policyEvaluator?: PolicyEvaluator;
    redactionEngine?: RedactionEngine;
    auditLogger?: RetentionAuditLogger;
    runCypher?: (cypher: string, params?: Record<string, any>) => Promise<any>;
    requiredApprovals?: number;
    approvalDelayMs?: number;
    signingKey?: string;
    signatureAlgorithm?: string;
  }) {
    this.pool = options.pool;
    this.repository =
      options.repository ?? new DataRetentionRepository(options.pool);
    this.policyEvaluator =
      options.policyEvaluator ??
      new PolicyEvaluator({ pool: options.pool, repository: this.repository });
    this.redactionEngine =
      options.redactionEngine ??
      new RedactionEngine({ pool: options.pool, runCypher: options.runCypher });
    this.auditLogger = options.auditLogger ?? {
      log: async (event) => {
        this.logger.info(event, 'Retention audit event');
      },
    };
    this.requiredApprovals = options.requiredApprovals ?? 2;
    this.approvalDelayMs =
      options.approvalDelayMs ??
      Number(process.env.RTBF_APPROVAL_DELAY_MS ?? 60 * 60 * 1000);
    const signingKey =
      options.signingKey ?? process.env.RTBF_PURGE_MANIFEST_KEY;
    if (!signingKey) {
      throw new Error('RTBF purge manifest signing key is required');
    }
    this.signingKey = signingKey;
    this.signatureAlgorithm = options.signatureAlgorithm ?? 'HMAC-SHA256';
    this.cypherRunner = options.runCypher;
  }

  /**
   * Submit a new RTBF request
   */
  async submitRTBFRequest(
    request: Omit<RTBFRequest, 'id' | 'state' | 'auditEvents' | 'createdAt' | 'updatedAt'>,
  ): Promise<RTBFRequest> {
    const now = new Date();
    const fullRequest: RTBFRequest = {
      ...request,
      id: uuidv4(),
      state: 'submitted',
      auditEvents: [],
      createdAt: now,
      updatedAt: now,
    };

    this.addAuditEvent(fullRequest, 'request.submitted', request.requester.userId ?? request.requester.email ?? 'system', {
      scope: request.scope,
      target: request.target,
    });

    this.requests.set(fullRequest.id, fullRequest);
    await this.persistRequest(fullRequest);

    this.logger.info(
      { requestId: fullRequest.id, scope: request.scope },
      'RTBF request submitted',
    );

    // Auto-validate
    await this.validateRequest(fullRequest.id);

    return fullRequest;
  }

  /**
   * Get RTBF request by ID
   */
  getRequest(requestId: string): RTBFRequest | undefined {
    return this.requests.get(requestId);
  }

  /**
   * Get request status
   */
  getRequestStatus(requestId: string): {
    request?: RTBFRequest;
    jobs: RTBFJob[];
    progress: {
      totalJobs: number;
      completedJobs: number;
      failedJobs: number;
      percentComplete: number;
    };
  } {
    const request = this.requests.get(requestId);
    const jobs = Array.from(this.jobs.values()).filter(
      (j) => j.requestId === requestId,
    );

    const completedJobs = jobs.filter((j) => j.state === 'completed').length;
    const failedJobs = jobs.filter((j) => j.state === 'failed').length;

    return {
      request,
      jobs,
      progress: {
        totalJobs: jobs.length,
        completedJobs,
        failedJobs,
        percentComplete:
          jobs.length > 0 ? (completedJobs / jobs.length) * 100 : 0,
      },
    };
  }

  /**
   * Validate RTBF request
   */
  async validateRequest(requestId: string): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    if (request.state !== 'submitted') {
      throw new Error(`Request ${requestId} is not in submitted state`);
    }

    this.updateRequestState(request, 'validating');

    try {
      // Check for legal holds
      const legalHoldBlocked = await this.checkLegalHolds(request);
      if (legalHoldBlocked.length > 0) {
        this.addAuditEvent(request, 'validation.failed', 'system', {
          reason: 'Legal hold blocks deletion',
          datasets: legalHoldBlocked,
        });
        await this.rejectRequest(
          requestId,
          'system',
          `Legal hold active on datasets: ${legalHoldBlocked.join(', ')}`,
        );
        return;
      }

      // Perform impact assessment
      const impact = await this.assessImpact(request);
      request.impact = impact;

      // If dry-run requested, perform it
      if (request.dryRun) {
        request.dryRunResults = await this.performDryRun(request);
      }

      // Move to pending approval
      this.updateRequestState(request, 'pending_approval');
      this.addAuditEvent(request, 'validation.passed', 'system', {
        impact,
      });

      await this.persistRequest(request);

      this.logger.info(
        { requestId: request.id },
        'RTBF request validated successfully',
      );
    } catch (error: any) {
      this.logger.error(
        { error, requestId: request.id },
        'RTBF request validation failed',
      );
      this.addAuditEvent(request, 'validation.failed', 'system', {
        error: (error as Error).message,
      });
      this.updateRequestState(request, 'failed');
      request.execution = {
        jobIds: [],
        failedAt: new Date(),
        errorMessage: (error as Error).message,
      };
      await this.persistRequest(request);
      throw error;
    }
  }

  /**
   * Approve RTBF request
   */
  async approveRequest(
    requestId: string,
    approvedBy: string,
    notes?: string,
  ): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    if (request.state !== 'pending_approval') {
      throw new Error(`Request ${requestId} is not pending approval`);
    }

    const approvals = request.approval?.approvals ?? [];
    if (approvals.some((approval) => approval.actorId === approvedBy)) {
      throw new Error(
        `Request ${requestId} already approved by ${approvedBy}`,
      );
    }

    const approvalEntry = {
      actorId: approvedBy,
      approvedAt: new Date(),
      notes,
    };
    const nextApprovals = [...approvals, approvalEntry];
    const uniqueApprovers = new Set(
      nextApprovals.map((approval) => approval.actorId),
    );

    request.approval = {
      ...request.approval,
      approvals: nextApprovals,
      requiredApprovals: this.requiredApprovals,
    };

    if (uniqueApprovers.size < this.requiredApprovals) {
      this.addAuditEvent(request, 'request.approval.recorded', approvedBy, {
        notes,
        approvals: nextApprovals.length,
        requiredApprovals: this.requiredApprovals,
      });

      await this.persistRequest(request);

      this.logger.info(
        { requestId: request.id, approvedBy, approvals: nextApprovals.length },
        'RTBF request approval recorded',
      );
      return;
    }

    const approvedAt = new Date();
    const executeAfter = this.shouldDelayExecution(request)
      ? new Date(approvedAt.getTime() + this.approvalDelayMs)
      : approvedAt;

    request.approval = {
      ...request.approval,
      approvedBy: Array.from(uniqueApprovers),
      approvedAt,
      approvalNotes: notes,
      executeAfter,
      requiredApprovals: this.requiredApprovals,
    };

    this.updateRequestState(request, 'approved');
    this.addAuditEvent(request, 'request.approved', approvedBy, {
      notes,
      executeAfter,
    });

    if (executeAfter.getTime() > Date.now()) {
      this.addAuditEvent(request, 'execution.delayed', approvedBy, {
        executeAfter,
      });
    }

    await this.persistRequest(request);

    this.logger.info(
      { requestId: request.id, approvedBy, executeAfter },
      'RTBF request approved',
    );

    // Auto-execute if not dry-run and delay has elapsed
    if (!request.dryRun && executeAfter.getTime() <= Date.now()) {
      await this.executeRequest(requestId, approvedBy);
    }
  }

  /**
   * Reject RTBF request
   */
  async rejectRequest(
    requestId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    request.approval = {
      ...request.approval,
      rejectedBy,
      rejectedAt: new Date(),
      rejectionReason: reason,
    };

    this.updateRequestState(request, 'rejected');
    this.addAuditEvent(request, 'request.rejected', rejectedBy, { reason });

    await this.persistRequest(request);

    this.logger.info(
      { requestId: request.id, rejectedBy, reason },
      'RTBF request rejected',
    );
  }

  /**
   * Execute RTBF request
   */
  async executeRequest(requestId: string, executedBy: string): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Request ${requestId} not found`);
    }

    if (request.state !== 'approved') {
      throw new Error(`Request ${requestId} is not approved`);
    }

    this.assertTwoActorApproval(request);

    const executeAfter = request.approval?.executeAfter;
    if (
      this.shouldDelayExecution(request) &&
      executeAfter &&
      executeAfter.getTime() > Date.now()
    ) {
      this.addAuditEvent(request, 'execution.blocked', executedBy, {
        executeAfter,
      });
      await this.persistRequest(request);
      throw new Error(
        `Request ${requestId} cannot execute until ${executeAfter.toISOString()}`,
      );
    }

    this.updateRequestState(request, 'executing');
    this.addAuditEvent(request, 'execution.started', executedBy, {});

    request.execution = {
      jobIds: [],
      startedAt: new Date(),
    };

    try {
      // Create jobs for each storage system
      const jobs = await this.createExecutionJobs(request);
      request.execution.jobIds = jobs.map((j) => j.id);

      // Execute jobs
      for (const job of jobs) {
        await this.executeJob(job);
      }

      // Check if all jobs completed successfully
      const failedJobs = jobs.filter((j) => j.state === 'failed');
      if (failedJobs.length > 0) {
        this.updateRequestState(request, 'failed');
        request.execution.failedAt = new Date();
        request.execution.errorMessage = `${failedJobs.length} jobs failed`;
        this.addAuditEvent(request, 'execution.failed', executedBy, {
          failedJobs: failedJobs.map((j) => j.id),
        });
      } else {
        this.updateRequestState(request, 'completed');
        request.execution.completedAt = new Date();
        this.addAuditEvent(request, 'execution.completed', executedBy, {
          jobCount: jobs.length,
        });

        const manifest = this.createPurgeManifest(request, jobs);
        const tenantId = manifest.tenantId;
        await this.repository.storePurgeManifest(tenantId, manifest);
        request.execution.purgeManifestId = manifest.id;
        request.execution.purgeManifest = manifest;
        this.addAuditEvent(request, 'purge.manifest.generated', executedBy, {
          manifestId: manifest.id,
          tenantId,
        });
      }

      await this.persistRequest(request);

      this.logger.info(
        { requestId: request.id, jobCount: jobs.length },
        'RTBF request execution completed',
      );
    } catch (error: any) {
      this.logger.error(
        { error, requestId: request.id },
        'RTBF request execution failed',
      );
      this.updateRequestState(request, 'failed');
      request.execution.failedAt = new Date();
      request.execution.errorMessage = (error as Error).message;
      this.addAuditEvent(request, 'execution.failed', executedBy, {
        error: (error as Error).message,
      });
      await this.persistRequest(request);
      throw error;
    }
  }

  /**
   * Check for legal holds that would block request
   */
  private async checkLegalHolds(request: RTBFRequest): Promise<string[]> {
    const blockedDatasets: string[] = [];

    if (request.target.datasetIds) {
      for (const datasetId of request.target.datasetIds) {
        const record = this.repository.getRecord(datasetId);
        if (record?.legalHold) {
          const expiresAt = record.legalHold.expiresAt;
          if (!expiresAt || expiresAt > new Date()) {
            blockedDatasets.push(datasetId);
          }
        }
      }
    }

    return blockedDatasets;
  }

  /**
   * Assess impact of RTBF request
   */
  private async assessImpact(
    request: RTBFRequest,
  ): Promise<RTBFRequest['impact']> {
    let estimatedRecordCount = 0;
    const affectedSystems: Set<StorageSystem> = new Set();
    const warnings: string[] = [];

    // Estimate based on scope
    if (request.scope === 'dataset' && request.target.datasetIds) {
      for (const datasetId of request.target.datasetIds) {
        const record = this.repository.getRecord(datasetId);
        if (record) {
          estimatedRecordCount += record.metadata.recordCount ?? 0;
          record.policy.storageTargets.forEach((sys) =>
            affectedSystems.add(sys),
          );
        }
      }
    } else if (request.scope === 'user_data' && request.target.userId) {
      // Estimate user data across systems
      estimatedRecordCount = 100; // Placeholder
      affectedSystems.add('postgres');
      affectedSystems.add('neo4j');
    }

    if (estimatedRecordCount > 10000) {
      warnings.push(
        `Large deletion: ${estimatedRecordCount} records will be affected`,
      );
    }

    if (affectedSystems.size > 3) {
      warnings.push(
        `Multiple storage systems affected: ${Array.from(affectedSystems).join(', ')}`,
      );
    }

    return {
      estimatedRecordCount,
      affectedSystems: Array.from(affectedSystems),
      warnings,
    };
  }

  /**
   * Perform dry-run of RTBF request
   */
  private async performDryRun(
    request: RTBFRequest,
  ): Promise<RTBFDryRunResults> {
    const results: RTBFDryRunResults = {
      executedAt: new Date(),
      affectedRecords: [],
      estimatedDuration: 0,
      warnings: [],
      errors: [],
      provenanceTombstones: 0,
    };

    // For each affected system, query and count records
    if (request.target.datasetIds) {
      for (const datasetId of request.target.datasetIds) {
        const record = this.repository.getRecord(datasetId);
        if (!record) {
          continue;
        }

        for (const storageSystem of record.policy.storageTargets) {
          if (storageSystem === 'postgres') {
            const pgResults = await this.dryRunPostgres(datasetId, record);
            results.affectedRecords.push(pgResults);
          } else if (storageSystem === 'neo4j') {
            const neo4jResults = await this.dryRunNeo4j(datasetId, record);
            results.affectedRecords.push(neo4jResults);
          }
        }
      }
    }

    // Estimate duration (100ms per record)
    const totalRecords = results.affectedRecords.reduce(
      (sum, r) => sum + r.recordCount,
      0,
    );
    results.estimatedDuration = totalRecords * 100;

    return results;
  }

  /**
   * Dry-run for PostgreSQL
   */
  private async dryRunPostgres(
    datasetId: string,
    record: RetentionRecord,
  ): Promise<RTBFDryRunResults['affectedRecords'][0]> {
    const tableTags = record.metadata.tags.filter((tag) =>
      tag.startsWith('postgres:table:'),
    );
    const tables = tableTags.map((tag) => tag.replace('postgres:table:', ''));

    let recordCount = 0;
    for (const table of tables) {
      try {
        const result = await this.pool.query(
          `SELECT COUNT(*) FROM ${table} WHERE dataset_id = $1`,
          [datasetId],
        );
        recordCount += parseInt(result.rows[0].count, 10);
      } catch (error: any) {
        if (error.code !== '42P01') {
          throw error;
        }
      }
    }

    return {
      storageSystem: 'postgres',
      recordCount,
      tables,
    };
  }

  /**
   * Dry-run for Neo4j
   */
  private async dryRunNeo4j(
    datasetId: string,
    record: RetentionRecord,
  ): Promise<RTBFDryRunResults['affectedRecords'][0]> {
    if (!this.cypherRunner) {
      return {
        storageSystem: 'neo4j',
        recordCount: 0,
        labels: [],
      };
    }

    const labelTags = record.metadata.tags.filter((tag) =>
      tag.startsWith('neo4j:label:'),
    );
    const labels = labelTags.map((tag) => tag.replace('neo4j:label:', ''));

    let recordCount = 0;
    for (const label of labels) {
      const result = await this.cypherRunner(
        `MATCH (n:${label} { datasetId: $datasetId }) RETURN count(n) as count`,
        { datasetId },
      );
      if (result.length > 0) {
        recordCount += result[0].count;
      }
    }

    return {
      storageSystem: 'neo4j',
      recordCount,
      labels,
    };
  }

  /**
   * Create execution jobs for request
   */
  private async createExecutionJobs(request: RTBFRequest): Promise<RTBFJob[]> {
    const jobs: RTBFJob[] = [];

    if (request.target.datasetIds) {
      for (const datasetId of request.target.datasetIds) {
        const record = this.repository.getRecord(datasetId);
        if (!record) {
          continue;
        }

        for (const storageSystem of record.policy.storageTargets) {
          const job: RTBFJob = {
            id: uuidv4(),
            requestId: request.id,
            storageSystem,
            state: 'pending',
            operation: {
              type: request.useRedaction ? 'redact' : 'delete',
              targets: this.buildJobTargets(storageSystem, datasetId, record),
            },
            execution: {
              recordsProcessed: 0,
              recordsAffected: 0,
              retryCount: 0,
            },
            provenance: {
              tombstonesCreated: 0,
              hashStubsCreated: 0,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          jobs.push(job);
          this.jobs.set(job.id, job);
        }
      }
    }

    return jobs;
  }

  private createPurgeManifest(
    request: RTBFRequest,
    jobs: RTBFJob[],
  ): PurgeManifest {
    const tenantId = this.resolveTenantId(request);
    const createdAt = new Date();
    const approvals = request.approval?.approvals ?? [];
    const totals = {
      totalJobs: jobs.length,
      totalRecordsAffected: jobs.reduce(
        (sum, job) => sum + (job.execution.recordsAffected ?? 0),
        0,
      ),
      completedAt: request.execution?.completedAt,
    };

    const manifestBase = {
      id: uuidv4(),
      requestId: request.id,
      tenantId,
      createdAt,
      executeAfter: request.approval?.executeAfter,
      scope: request.scope,
      deletionType: request.deletionType,
      target: request.target,
      approvals,
      jobs: jobs.map((job) => ({
        id: job.id,
        storageSystem: job.storageSystem,
        operation: job.operation.type,
        recordsAffected: job.execution.recordsAffected,
      })),
      totals,
    };

    const hash = createHash('sha256')
      .update(JSON.stringify(manifestBase))
      .digest('hex');
    const signature = createHmac('sha256', this.signingKey)
      .update(hash)
      .digest('hex');

    return {
      ...manifestBase,
      signature,
      signatureAlgorithm: this.signatureAlgorithm,
      hash,
    };
  }

  private resolveTenantId(request: RTBFRequest): string {
    if (request.tenantId) {
      return request.tenantId;
    }

    if (request.target.datasetIds) {
      for (const datasetId of request.target.datasetIds) {
        const record = this.repository.getRecord(datasetId);
        if (record?.metadata.tenantId) {
          return record.metadata.tenantId;
        }
      }
    }

    return 'unknown';
  }

  private shouldDelayExecution(request: RTBFRequest): boolean {
    return request.deletionType === 'hard' && this.approvalDelayMs > 0;
  }

  private assertTwoActorApproval(request: RTBFRequest): void {
    const approvals = request.approval?.approvals ?? [];
    const uniqueApprovers = new Set(
      approvals.map((approval) => approval.actorId),
    );
    if (uniqueApprovers.size < this.requiredApprovals) {
      throw new Error(
        `Request ${request.id} requires ${this.requiredApprovals} distinct approvals`,
      );
    }
  }

  /**
   * Build job targets based on storage system
   */
  private buildJobTargets(
    storageSystem: StorageSystem,
    datasetId: string,
    record: RetentionRecord,
  ): RTBFJob['operation']['targets'] {
    if (storageSystem === 'postgres') {
      const tableTags = record.metadata.tags.filter((tag) =>
        tag.startsWith('postgres:table:'),
      );
      const table = tableTags[0]?.replace('postgres:table:', '');
      return {
        table,
        filterColumn: 'dataset_id',
        filterValue: datasetId,
      };
    } else if (storageSystem === 'neo4j') {
      const labelTags = record.metadata.tags.filter((tag) =>
        tag.startsWith('neo4j:label:'),
      );
      const label = labelTags[0]?.replace('neo4j:label:', '');
      return {
        label,
        query: `datasetId = '${datasetId}'`,
      };
    }

    return {};
  }

  /**
   * Execute a single job
   */
  private async executeJob(job: RTBFJob): Promise<void> {
    job.state = 'running';
    job.execution.startedAt = new Date();

    try {
      if (job.storageSystem === 'postgres') {
        await this.executePostgresJob(job);
      } else if (job.storageSystem === 'neo4j') {
        await this.executeNeo4jJob(job);
      }

      job.state = 'completed';
      job.execution.completedAt = new Date();
      job.execution.duration =
        job.execution.completedAt.getTime() -
        job.execution.startedAt.getTime();

      this.logger.info({ jobId: job.id }, 'RTBF job completed');
    } catch (error: any) {
      this.logger.error({ error, jobId: job.id }, 'RTBF job failed');
      job.state = 'failed';
      job.execution.failedAt = new Date();
      job.execution.errorMessage = (error as Error).message;
      throw error;
    } finally {
      job.updatedAt = new Date();
    }
  }

  /**
   * Execute PostgreSQL job
   */
  private async executePostgresJob(job: RTBFJob): Promise<void> {
    const { table, filterColumn = 'dataset_id', filterValue } =
      job.operation.targets;
    if (!table) {
      throw new Error('Missing table for Postgres job');
    }

    const safeTable = this.assertSafeIdentifier(table, 'postgres table');
    const safeFilterColumn = this.assertSafeIdentifier(
      filterColumn,
      'postgres filter column',
    );
    const resolvedFilterValue =
      filterValue ?? job.operation.parameters?.datasetId ?? null;

    if (!resolvedFilterValue) {
      throw new Error('Missing filter value for Postgres job');
    }

    if (job.operation.type === 'delete') {
      const result = await this.pool.query(
        `DELETE FROM ${safeTable} WHERE ${safeFilterColumn} = $1`,
        [resolvedFilterValue],
      );
      job.execution.recordsAffected = result.rowCount ?? 0;
    } else if (job.operation.type === 'redact') {
      // Get redaction rules
      const policyId = job.operation.parameters?.redactionPolicyId;
      const policy = policyId
        ? this.policyEvaluator.getRedactionPolicy(policyId)
        : undefined;
      const rules = policy?.rules ?? [];

      // Fetch records to redact
      const result = await this.pool.query(
        `SELECT id FROM ${safeTable} WHERE ${safeFilterColumn} = $1`,
        [resolvedFilterValue],
      );
      const recordIds = result.rows.map((r: any) => r.id);

      // Perform redaction
      const redactionResults = await this.redactionEngine.redactPostgresRecords(
        table,
        recordIds,
        rules,
        { preserveProvenance: true },
      );

      job.execution.recordsAffected = redactionResults.length;
      job.provenance.hashStubsCreated = redactionResults.reduce(
        (sum, r) => sum + r.hashStubs.size,
        0,
      );
    }
  }

  /**
   * Execute Neo4j job
   */
  private async executeNeo4jJob(job: RTBFJob): Promise<void> {
    if (!this.cypherRunner) {
      throw new Error('Cypher runner not configured');
    }

    const { label, query } = job.operation.targets;
    if (!label || !query) {
      throw new Error('Missing label or query for Neo4j job');
    }

    if (job.operation.type === 'delete') {
      const result = await this.cypherRunner(
        `MATCH (n:${label}) WHERE ${query} DETACH DELETE n RETURN count(n) as deleted`,
      );
      job.execution.recordsAffected = result[0]?.deleted ?? 0;
    } else if (job.operation.type === 'redact') {
      // Similar to Postgres redaction
      // Implementation would fetch nodes and apply redaction rules
      job.execution.recordsAffected = 0;
    }
  }

  private assertSafeIdentifier(identifier: string, context: string): string {
    const identifierPattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/;
    if (!identifierPattern.test(identifier)) {
      throw new Error(`Invalid identifier provided for ${context}`);
    }

    return identifier;
  }

  /**
   * Update request state and log audit event
   */
  private updateRequestState(
    request: RTBFRequest,
    newState: RTBFRequestState,
  ): void {
    const oldState = request.state;
    request.state = newState;
    request.updatedAt = new Date();

    this.logger.info(
      { requestId: request.id, oldState, newState },
      'RTBF request state changed',
    );
  }

  /**
   * Add audit event to request
   */
  private addAuditEvent(
    request: RTBFRequest,
    eventType: string,
    actor: string,
    details: Record<string, any>,
  ): void {
    const event: RTBFAuditEvent = {
      timestamp: new Date(),
      eventType,
      actor,
      details,
      correlationId: request.id,
    };

    request.auditEvents.push(event);

    // Also log to retention audit logger
    this.auditLogger.log({
      event: `rtbf.${eventType}`,
      datasetId: request.target.datasetIds?.join(',') ?? 'unknown',
      severity: 'info',
      message: `RTBF ${eventType}`,
      metadata: { requestId: request.id, actor, ...details },
      timestamp: event.timestamp,
    });
  }

  /**
   * Persist request to database
   */
  private async persistRequest(request: RTBFRequest): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO rtbf_requests (
          id, state, scope, requester, target, justification, approval,
          execution, deletion_type, use_redaction, redaction_policy_id,
          dry_run, dry_run_results, impact, audit_events,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13::jsonb, $14::jsonb, $15::jsonb, $16, $17)
        ON CONFLICT (id) DO UPDATE SET
          state = EXCLUDED.state,
          approval = EXCLUDED.approval,
          execution = EXCLUDED.execution,
          dry_run_results = EXCLUDED.dry_run_results,
          impact = EXCLUDED.impact,
          audit_events = EXCLUDED.audit_events,
          updated_at = EXCLUDED.updated_at`,
        [
          request.id,
          request.state,
          request.scope,
          JSON.stringify(request.requester),
          JSON.stringify(request.target),
          JSON.stringify(request.justification),
          request.approval ? JSON.stringify(request.approval) : null,
          request.execution ? JSON.stringify(request.execution) : null,
          request.deletionType,
          request.useRedaction ?? false,
          request.redactionPolicyId ?? null,
          request.dryRun ?? false,
          request.dryRunResults ? JSON.stringify(request.dryRunResults) : null,
          request.impact ? JSON.stringify(request.impact) : null,
          JSON.stringify(request.auditEvents),
          request.createdAt,
          request.updatedAt,
        ],
      );
    } catch (error: any) {
      if (error.code !== '42P01') {
        throw error;
      }
      this.logger.debug('RTBF requests table does not exist');
    }
  }
}
