/**
 * Privacy Service - Data Subject Rights & Privacy Orchestration
 *
 * Manages Data Subject Access Requests (DSAR), Right to be Forgotten (RTBF),
 * and privacy evidence generation.
 *
 * Uses PostgreSQL for request state and evidence persistence.
 * Uses ProvenanceLedger for immutable audit trail.
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { provenanceLedger } from '../provenance/ledger.js';
import { PIIType } from '../pii/types.js';
import { pool } from '../db/pg.js';

export enum DSARType {
  ACCESS = 'ACCESS',           // Right of Access
  RECTIFICATION = 'RECTIFY',   // Right to Rectification
  DELETION = 'DELETE',         // Right to Erasure (RTBF)
  EXPORT = 'EXPORT',           // Right to Data Portability
  RESTRICTION = 'RESTRICT',    // Right to Restriction of Processing
  OBJECTION = 'OBJECT',        // Right to Object
}

export enum DSARStatus {
  SUBMITTED = 'SUBMITTED',
  VERIFYING = 'VERIFYING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  FAILED = 'FAILED',
}

export interface DSARRequest {
  id: string;
  tenantId: string;
  userId: string; // The requester
  subjectId: string; // The data subject (usually same as userId)
  type: DSARType;
  status: DSARStatus;
  details: Record<string, any>;
  submittedAt: Date;
  completedAt?: Date;
  deadline: Date; // Regulatory deadline (e.g., 30 days for GDPR)
  verificationToken?: string;
  rejectionReason?: string;
  evidenceId?: string; // Link to audit proof
}

export interface PrivacyEvidence {
  requestId: string;
  actions: {
    system: string;
    action: string; // e.g., 'deleted', 'exported', 'anonymized'
    resourceId?: string;
    status: 'success' | 'failed' | 'skipped';
    timestamp: Date;
    metadata?: Record<string, any>;
  }[];
  summary: string;
  generatedAt: Date;
}

export class PrivacyService extends EventEmitter {
  private static instance: PrivacyService;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    super();
    // Start initialization but don't block constructor
    this.ensureInitialized().catch(err => {
        console.error('Failed to initialize PrivacyService:', err);
    });
  }

  public static getInstance(): PrivacyService {
    if (!PrivacyService.instance) {
      PrivacyService.instance = new PrivacyService();
    }
    return PrivacyService.instance;
  }

  private ensureInitialized(): Promise<void> {
    if (this.isInitialized) return Promise.resolve();
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.initializeTables()
        .then(() => {
            this.isInitialized = true;
        })
        .finally(() => {
            this.initPromise = null;
        });

    return this.initPromise;
  }

  private async initializeTables() {
    // Ensure tables exist (idempotent)
    // Note: In production, this should be a migration
    const createRequestsTable = `
      CREATE TABLE IF NOT EXISTS privacy_dsar_requests (
        id UUID PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        subject_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        details JSONB,
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE,
        deadline TIMESTAMP WITH TIME ZONE,
        verification_token VARCHAR(255),
        rejection_reason TEXT,
        evidence_id VARCHAR(255)
      );
    `;

    const createEvidenceTable = `
      CREATE TABLE IF NOT EXISTS privacy_evidence (
        id UUID PRIMARY KEY,
        request_id UUID NOT NULL REFERENCES privacy_dsar_requests(id),
        summary TEXT,
        actions JSONB,
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    try {
        await pool.query(createRequestsTable);
        await pool.query(createEvidenceTable);
    } catch (error) {
        console.warn('Failed to initialize privacy tables (might already exist or permission issue)', error);
    }
  }

  /**
   * Submit a new Data Subject Access Request
   */
  async submitRequest(
    tenantId: string,
    userId: string,
    type: DSARType,
    details: Record<string, any> = {}
  ): Promise<DSARRequest> {
    await this.ensureInitialized();
    const id = uuidv4();
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30); // 30 day SLA

    const request: DSARRequest = {
      id,
      tenantId,
      userId,
      subjectId: details.subjectId || userId,
      type,
      status: DSARStatus.SUBMITTED,
      details,
      submittedAt: new Date(),
      deadline,
    };

    // Persist to DB
    const query = `
      INSERT INTO privacy_dsar_requests (
        id, tenant_id, user_id, subject_id, type, status, details, submitted_at, deadline
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    await pool.query(query, [
        request.id,
        request.tenantId,
        request.userId,
        request.subjectId,
        request.type,
        request.status,
        JSON.stringify(request.details),
        request.submittedAt,
        request.deadline
    ]);

    // Audit the request submission
    await provenanceLedger.appendEntry({
      tenantId,
      actionType: 'PRIVACY_DSAR_SUBMITTED',
      resourceType: 'dsar_request',
      resourceId: id,
      actorId: userId,
      actorType: 'user',
      payload: { type, details },
      metadata: { purpose: 'privacy_compliance' },
    });

    this.emit('requestSubmitted', request);

    // Auto-start verification if possible
    await this.verifyRequest(id);

    return request;
  }

  /**
   * Get status of a request
   */
  async getRequestStatus(requestId: string): Promise<DSARRequest | undefined> {
    await this.ensureInitialized();
    const query = `SELECT * FROM privacy_dsar_requests WHERE id = $1`;
    const result = await pool.query(query, [requestId]);

    if (result.rows.length === 0) return undefined;

    return this.mapRowToRequest(result.rows[0]);
  }

  private mapRowToRequest(row: any): DSARRequest {
      return {
          id: row.id,
          tenantId: row.tenant_id,
          userId: row.user_id,
          subjectId: row.subject_id,
          type: row.type as DSARType,
          status: row.status as DSARStatus,
          details: row.details,
          submittedAt: row.submitted_at,
          completedAt: row.completed_at,
          deadline: row.deadline,
          verificationToken: row.verification_token,
          rejectionReason: row.rejection_reason,
          evidenceId: row.evidence_id
      };
  }

  /**
   * List requests for a tenant
   */
  async listRequests(tenantId: string): Promise<DSARRequest[]> {
    await this.ensureInitialized();
    const query = `SELECT * FROM privacy_dsar_requests WHERE tenant_id = $1 ORDER BY submitted_at DESC`;
    const result = await pool.query(query, [tenantId]);
    return result.rows.map(row => this.mapRowToRequest(row));
  }

  /**
   * Update request status
   */
  private async updateRequestStatus(id: string, status: DSARStatus, extra: Partial<DSARRequest> = {}): Promise<void> {
      let query = `UPDATE privacy_dsar_requests SET status = $2`;
      const params: any[] = [id, status];
      let idx = 3;

      if (extra.completedAt) {
          query += `, completed_at = $${idx++}`;
          params.push(extra.completedAt);
      }
      if (extra.evidenceId) {
          query += `, evidence_id = $${idx++}`;
          params.push(extra.evidenceId);
      }
      if (extra.rejectionReason) {
          query += `, rejection_reason = $${idx++}`;
          params.push(extra.rejectionReason);
      }

      query += ` WHERE id = $1`;
      await pool.query(query, params);
  }

  /**
   * Verify the identity of the requester
   */
  async verifyRequest(requestId: string): Promise<void> {
    const request = await this.getRequestStatus(requestId);
    if (!request) throw new Error('Request not found');

    await this.updateRequestStatus(requestId, DSARStatus.VERIFYING);
    request.status = DSARStatus.VERIFYING;

    // TODO: Integrate with Identity Provider for strong verification
    // For now, auto-verify
    const isVerified = true;

    if (isVerified) {
      await this.updateRequestStatus(requestId, DSARStatus.PROCESSING);
      request.status = DSARStatus.PROCESSING;

      await provenanceLedger.appendEntry({
        tenantId: request.tenantId,
        actionType: 'PRIVACY_DSAR_VERIFIED',
        resourceType: 'dsar_request',
        resourceId: request.id,
        actorId: 'system',
        actorType: 'system',
        payload: { status: 'verified' },
        metadata: { purpose: 'privacy_compliance' },
      });

      this.executeRequest(requestId).catch(err => {
        console.error(`DSAR execution failed for ${requestId}:`, err);
        this.failRequest(requestId, err.message);
      });
    }
  }

  /**
   * Execute the DSAR workflow
   */
  private async executeRequest(requestId: string): Promise<void> {
    const request = await this.getRequestStatus(requestId);
    if (!request) return;

    try {
      let evidence: PrivacyEvidence;

      switch (request.type) {
        case DSARType.ACCESS:
        case DSARType.EXPORT:
          evidence = await this.executeDataExport(request);
          break;
        case DSARType.DELETION:
          evidence = await this.executeDeletion(request);
          break;
        case DSARType.RECTIFICATION:
          evidence = await this.executeRectification(request);
          break;
        case DSARType.RESTRICTION:
          evidence = await this.executeRestriction(request);
          break;
        default:
          throw new Error(`Unsupported DSAR type: ${request.type}`);
      }

      // Store evidence
      const evidenceId = uuidv4();
      await this.persistEvidence(evidenceId, evidence);

      await this.updateRequestStatus(requestId, DSARStatus.COMPLETED, {
          completedAt: new Date(),
          evidenceId
      });
      request.evidenceId = evidenceId;
      request.status = DSARStatus.COMPLETED;

      await provenanceLedger.appendEntry({
        tenantId: request.tenantId,
        actionType: 'PRIVACY_DSAR_COMPLETED',
        resourceType: 'dsar_request',
        resourceId: request.id,
        actorId: 'system',
        actorType: 'system',
        payload: {
          evidenceSummary: evidence.summary,
          actionsCount: evidence.actions.length
        },
        metadata: { purpose: 'privacy_compliance' },
      });

      this.emit('requestCompleted', request);

    } catch (error) {
      await this.failRequest(requestId, (error as Error).message);
    }
  }

  private async persistEvidence(id: string, evidence: PrivacyEvidence): Promise<void> {
      const query = `
        INSERT INTO privacy_evidence (id, request_id, summary, actions, generated_at)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await pool.query(query, [
          id,
          evidence.requestId,
          evidence.summary,
          JSON.stringify(evidence.actions),
          evidence.generatedAt
      ]);
  }

  private async failRequest(requestId: string, reason: string): Promise<void> {
    const request = await this.getRequestStatus(requestId);
    if (!request) return;

    await this.updateRequestStatus(requestId, DSARStatus.FAILED, { rejectionReason: reason });

    await provenanceLedger.appendEntry({
      tenantId: request.tenantId,
      actionType: 'PRIVACY_DSAR_FAILED',
      resourceType: 'dsar_request',
      resourceId: request.id,
      actorId: 'system',
      actorType: 'system',
      payload: { reason },
      metadata: { purpose: 'privacy_compliance' },
    });
  }

  // --- Workflow Implementations ---

  private async executeDataExport(request: DSARRequest): Promise<PrivacyEvidence> {
    // 1. Identify all data stores (Postgres, Neo4j, Elastic, Logs)
    // 2. Query each for subjectId
    // 3. Aggregate and format

    // Simulation - in production this would call external services
    // Logging simulated action for clarity
    console.log(`[SIMULATION] Executing Data Export for subject ${request.subjectId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      requestId: request.id,
      actions: [
        { system: 'Postgres', action: 'export', status: 'success', timestamp: new Date() },
        { system: 'Neo4j', action: 'export', status: 'success', timestamp: new Date() },
        { system: 'Elasticsearch', action: 'export', status: 'success', timestamp: new Date() }
      ],
      summary: `Exported data for subject ${request.subjectId}. Package size: 1.2MB`,
      generatedAt: new Date()
    };
  }

  private async executeDeletion(request: DSARRequest): Promise<PrivacyEvidence> {
    // 1. Identify all data stores
    // 2. Issue delete/anonymize commands
    // 3. Verify deletion

    // Simulation
    console.log(`[SIMULATION] Executing PII Deletion for subject ${request.subjectId}`);
    await new Promise(resolve => setTimeout(resolve, 1500));

    return {
      requestId: request.id,
      actions: [
        { system: 'Postgres', action: 'anonymize', status: 'success', timestamp: new Date() },
        { system: 'Neo4j', action: 'delete_node', status: 'success', timestamp: new Date() },
        { system: 'Backups', action: 'mark_for_expiry', status: 'success', timestamp: new Date() }
      ],
      summary: `Deleted PII for subject ${request.subjectId} from primary stores. Backups marked for expiry.`,
      generatedAt: new Date()
    };
  }

  private async executeRectification(request: DSARRequest): Promise<PrivacyEvidence> {
     // Simulation
     return {
      requestId: request.id,
      actions: [
        { system: 'Postgres', action: 'update', status: 'success', timestamp: new Date() }
      ],
      summary: `Updated records for subject ${request.subjectId}.`,
      generatedAt: new Date()
    };
  }

  private async executeRestriction(request: DSARRequest): Promise<PrivacyEvidence> {
    // Simulation
    return {
      requestId: request.id,
      actions: [
        { system: 'AccessControl', action: 'freeze_account', status: 'success', timestamp: new Date() }
      ],
      summary: `Restricted processing for subject ${request.subjectId}. Account frozen.`,
      generatedAt: new Date()
    };
  }

  /**
   * Retrieve evidence for a completed request
   */
  async getEvidence(requestId: string): Promise<PrivacyEvidence | undefined> {
    await this.ensureInitialized();
    const query = `SELECT * FROM privacy_evidence WHERE request_id = $1`;
    const result = await pool.query(query, [requestId]);

    if (result.rows.length === 0) return undefined;

    const row = result.rows[0];
    return {
        requestId: row.request_id,
        summary: row.summary,
        actions: row.actions,
        generatedAt: row.generated_at
    };
  }
}

export const privacyService = PrivacyService.getInstance();
