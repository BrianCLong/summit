import { EventEmitter } from 'events';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export interface PartnerConfig {
  partnerId: string;
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  exportFormats: ExportFormat[];
  allowedDataTypes: DataType[];
  encryptionRequired: boolean;
  auditLevel: 'minimal' | 'standard' | 'comprehensive';
}

export interface ExportFormat {
  id: string;
  name: string;
  mimeType: string;
  extension: string;
  compression?: 'gzip' | 'zip' | 'bzip2';
  encryption?: 'aes256' | 'rsa4096' | 'pgp';
  schema?: string;
  validationRules?: ValidationRule[];
}

export interface DataType {
  id: string;
  name: string;
  category:
    | 'entities'
    | 'relationships'
    | 'events'
    | 'analytics'
    | 'intelligence'
    | 'metadata';
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionPeriod: number;
  anonymizationRequired: boolean;
  exportLimits: {
    maxRecords: number;
    maxFileSize: number;
    timeWindow: number;
  };
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'enum' | 'custom';
  constraint: any;
  errorMessage: string;
}

export interface ExportRequest {
  id: string;
  partnerId: string;
  requestedBy: string;
  dataType: string;
  format: string;
  filters: ExportFilter[];
  dateRange: {
    start: Date;
    end: Date;
  };
  encryption?: {
    algorithm: string;
    keyId: string;
    publicKey?: string;
  };
  compression?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  purpose: string;
  classification: string;
  approvalRequired: boolean;
  status:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'expired';
  createdAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
  expiresAt: Date;
  metadata: Record<string, any>;
}

export interface ExportFilter {
  field: string;
  operator:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'nin'
    | 'contains'
    | 'startswith'
    | 'endswith';
  value: any;
  logical?: 'and' | 'or';
}

export interface ExportJob {
  id: string;
  requestId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: Date;
  endTime?: Date;
  recordsProcessed: number;
  totalRecords: number;
  fileSize: number;
  outputFiles: ExportFile[];
  error?: string;
  metrics: {
    extractionTime: number;
    transformationTime: number;
    compressionTime: number;
    encryptionTime: number;
    uploadTime: number;
  };
}

export interface ExportFile {
  id: string;
  filename: string;
  path: string;
  size: number;
  checksum: string;
  mimeType: string;
  encryption?: {
    algorithm: string;
    keyId: string;
    iv: string;
  };
  compression?: {
    algorithm: string;
    originalSize: number;
    ratio: number;
  };
  downloadUrl: string;
  expiresAt: Date;
  downloadCount: number;
  lastAccessed?: Date;
}

export interface ApprovalWorkflow {
  id: string;
  requestId: string;
  steps: ApprovalStep[];
  currentStep: number;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  timeoutMinutes: number;
  autoApprovalRules?: AutoApprovalRule[];
}

export interface ApprovalStep {
  id: string;
  name: string;
  approver: string;
  role: string;
  required: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'skipped' | 'timeout';
  submittedAt?: Date;
  respondedAt?: Date;
  comments?: string;
  timeoutMinutes: number;
}

export interface AutoApprovalRule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  action: 'approve' | 'reject' | 'escalate';
  priority: number;
}

export interface RuleCondition {
  field: string;
  operator: string;
  value: any;
  logical?: 'and' | 'or';
}

export interface DeliveryChannel {
  id: string;
  type: 'sftp' | 'api' | 'email' | 's3' | 'azure' | 'gcp' | 'webhook';
  name: string;
  configuration: Record<string, any>;
  credentials: Record<string, any>;
  retryPolicy: {
    maxAttempts: number;
    backoffMultiplier: number;
    maxDelay: number;
  };
}

export interface AuditEvent {
  id: string;
  type: string;
  partnerId: string;
  userId: string;
  requestId?: string;
  jobId?: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  clientIp: string;
  userAgent: string;
  timestamp: Date;
  classification: string;
}

export interface PartnerMetrics {
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  completedExports: number;
  failedExports: number;
  totalRecordsExported: number;
  totalDataSize: number;
  averageProcessingTime: number;
  apiUsage: {
    callsPerMinute: number;
    callsPerHour: number;
    callsPerDay: number;
  };
  errorRate: number;
  complianceScore: number;
}

export class ExportGateway extends EventEmitter {
  private partners = new Map<string, PartnerConfig>();
  private requests = new Map<string, ExportRequest>();
  private jobs = new Map<string, ExportJob>();
  private workflows = new Map<string, ApprovalWorkflow>();
  private deliveryChannels = new Map<string, DeliveryChannel>();
  private auditLog: AuditEvent[] = [];
  private rateLimiters = new Map<string, Map<string, number>>();
  private secretKey: string;

  constructor(secretKey: string) {
    super();
    this.secretKey = secretKey;
  }

  async registerPartner(config: PartnerConfig): Promise<void> {
    this.partners.set(config.partnerId, config);

    this.emit('partner_registered', {
      partnerId: config.partnerId,
      baseUrl: config.baseUrl,
      timestamp: new Date(),
    });
  }

  async authenticatePartner(
    partnerId: string,
    token: string,
  ): Promise<boolean> {
    try {
      const partner = this.partners.get(partnerId);
      if (!partner) {
        throw new Error('Partner not found');
      }

      const decoded = jwt.verify(token, partner.secretKey) as any;

      if (decoded.partnerId !== partnerId) {
        throw new Error('Invalid partner ID in token');
      }

      this.logAuditEvent({
        type: 'authentication',
        partnerId,
        userId: decoded.userId || 'system',
        action: 'authenticate',
        resource: 'partner_api',
        details: { success: true },
        clientIp: '0.0.0.0',
        userAgent: 'partner-api',
        timestamp: new Date(),
        classification: 'internal',
      });

      return true;
    } catch (error) {
      this.logAuditEvent({
        type: 'authentication',
        partnerId,
        userId: 'unknown',
        action: 'authenticate',
        resource: 'partner_api',
        details: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        clientIp: '0.0.0.0',
        userAgent: 'partner-api',
        timestamp: new Date(),
        classification: 'internal',
      });

      return false;
    }
  }

  async checkRateLimit(partnerId: string): Promise<boolean> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      return false;
    }

    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const hour = Math.floor(now / 3600000);
    const day = Math.floor(now / 86400000);

    let partnerLimits = this.rateLimiters.get(partnerId);
    if (!partnerLimits) {
      partnerLimits = new Map();
      this.rateLimiters.set(partnerId, partnerLimits);
    }

    const minuteKey = `minute:${minute}`;
    const hourKey = `hour:${hour}`;
    const dayKey = `day:${day}`;

    const minuteCount = partnerLimits.get(minuteKey) || 0;
    const hourCount = partnerLimits.get(hourKey) || 0;
    const dayCount = partnerLimits.get(dayKey) || 0;

    if (
      minuteCount >= partner.rateLimit.requestsPerMinute ||
      hourCount >= partner.rateLimit.requestsPerHour ||
      dayCount >= partner.rateLimit.requestsPerDay
    ) {
      return false;
    }

    partnerLimits.set(minuteKey, minuteCount + 1);
    partnerLimits.set(hourKey, hourCount + 1);
    partnerLimits.set(dayKey, dayCount + 1);

    return true;
  }

  async submitExportRequest(
    partnerId: string,
    requestedBy: string,
    dataType: string,
    format: string,
    filters: ExportFilter[],
    dateRange: { start: Date; end: Date },
    options?: {
      encryption?: { algorithm: string; keyId: string; publicKey?: string };
      compression?: string;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      purpose?: string;
    },
  ): Promise<ExportRequest> {
    const partner = this.partners.get(partnerId);
    if (!partner) {
      throw new Error('Partner not found');
    }

    if (!(await this.checkRateLimit(partnerId))) {
      throw new Error('Rate limit exceeded');
    }

    const allowedDataType = partner.allowedDataTypes.find(
      (dt) => dt.id === dataType,
    );
    if (!allowedDataType) {
      throw new Error('Data type not allowed for this partner');
    }

    const supportedFormat = partner.exportFormats.find(
      (ef) => ef.id === format,
    );
    if (!supportedFormat) {
      throw new Error('Export format not supported for this partner');
    }

    const request: ExportRequest = {
      id: crypto.randomUUID(),
      partnerId,
      requestedBy,
      dataType,
      format,
      filters,
      dateRange,
      encryption: options?.encryption,
      compression: options?.compression,
      priority: options?.priority || 'normal',
      purpose: options?.purpose || 'Data export',
      classification: allowedDataType.classification,
      approvalRequired: this.requiresApproval(allowedDataType, dateRange),
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      metadata: {},
    };

    this.requests.set(request.id, request);

    this.logAuditEvent({
      type: 'export_request',
      partnerId,
      userId: requestedBy,
      requestId: request.id,
      action: 'submit',
      resource: 'export_request',
      details: {
        dataType,
        format,
        filterCount: filters.length,
        dateRange,
        classification: request.classification,
      },
      clientIp: '0.0.0.0',
      userAgent: 'partner-api',
      timestamp: new Date(),
      classification: request.classification,
    });

    if (request.approvalRequired) {
      await this.initiateApprovalWorkflow(request);
    } else {
      await this.autoApprove(request);
    }

    this.emit('export_request_submitted', {
      requestId: request.id,
      partnerId,
      dataType,
      approvalRequired: request.approvalRequired,
      timestamp: new Date(),
    });

    return request;
  }

  private requiresApproval(
    dataType: DataType,
    dateRange: { start: Date; end: Date },
  ): boolean {
    const daysDiff = Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return (
      dataType.classification === 'confidential' ||
      dataType.classification === 'restricted' ||
      daysDiff > 90
    );
  }

  private async initiateApprovalWorkflow(
    request: ExportRequest,
  ): Promise<void> {
    const workflow: ApprovalWorkflow = {
      id: crypto.randomUUID(),
      requestId: request.id,
      steps: this.getApprovalSteps(request),
      currentStep: 0,
      status: 'pending',
      timeoutMinutes: 24 * 60, // 24 hours
    };

    this.workflows.set(workflow.id, workflow);

    this.emit('approval_workflow_started', {
      workflowId: workflow.id,
      requestId: request.id,
      stepCount: workflow.steps.length,
      timestamp: new Date(),
    });
  }

  private getApprovalSteps(request: ExportRequest): ApprovalStep[] {
    const steps: ApprovalStep[] = [];

    if (
      request.classification === 'confidential' ||
      request.classification === 'restricted'
    ) {
      steps.push({
        id: crypto.randomUUID(),
        name: 'Security Review',
        approver: 'security-team@intelgraph.com',
        role: 'Security Officer',
        required: true,
        status: 'pending',
        timeoutMinutes: 4 * 60, // 4 hours
      });
    }

    steps.push({
      id: crypto.randomUUID(),
      name: 'Data Owner Approval',
      approver: 'data-owner@intelgraph.com',
      role: 'Data Owner',
      required: true,
      status: 'pending',
      timeoutMinutes: 24 * 60, // 24 hours
    });

    if (request.priority === 'urgent') {
      steps.push({
        id: crypto.randomUUID(),
        name: 'Executive Approval',
        approver: 'exec-team@intelgraph.com',
        role: 'Executive',
        required: true,
        status: 'pending',
        timeoutMinutes: 2 * 60, // 2 hours
      });
    }

    return steps;
  }

  private async autoApprove(request: ExportRequest): Promise<void> {
    request.status = 'approved';
    request.approvedAt = new Date();

    this.logAuditEvent({
      type: 'export_approval',
      partnerId: request.partnerId,
      userId: 'system',
      requestId: request.id,
      action: 'auto_approve',
      resource: 'export_request',
      details: { reason: 'Low risk data type and date range' },
      clientIp: '0.0.0.0',
      userAgent: 'system',
      timestamp: new Date(),
      classification: request.classification,
    });

    await this.startExportJob(request);
  }

  async approveRequest(
    requestId: string,
    stepId: string,
    approverId: string,
    comments?: string,
  ): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    const workflow = Array.from(this.workflows.values()).find(
      (w) => w.requestId === requestId,
    );
    if (!workflow) {
      throw new Error('Approval workflow not found');
    }

    const step = workflow.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new Error('Approval step not found');
    }

    step.status = 'approved';
    step.respondedAt = new Date();
    step.comments = comments;

    this.logAuditEvent({
      type: 'export_approval',
      partnerId: request.partnerId,
      userId: approverId,
      requestId,
      action: 'approve_step',
      resource: 'approval_step',
      details: {
        stepId,
        stepName: step.name,
        comments,
      },
      clientIp: '0.0.0.0',
      userAgent: 'approval-system',
      timestamp: new Date(),
      classification: request.classification,
    });

    // Check if all required steps are approved
    const requiredSteps = workflow.steps.filter((s) => s.required);
    const approvedRequiredSteps = requiredSteps.filter(
      (s) => s.status === 'approved',
    );

    if (approvedRequiredSteps.length === requiredSteps.length) {
      workflow.status = 'approved';
      request.status = 'approved';
      request.approvedAt = new Date();

      await this.startExportJob(request);

      this.emit('export_request_approved', {
        requestId,
        workflowId: workflow.id,
        timestamp: new Date(),
      });
    } else {
      // Move to next step
      workflow.currentStep++;
    }
  }

  async rejectRequest(
    requestId: string,
    stepId: string,
    approverId: string,
    reason: string,
  ): Promise<void> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    const workflow = Array.from(this.workflows.values()).find(
      (w) => w.requestId === requestId,
    );
    if (!workflow) {
      throw new Error('Approval workflow not found');
    }

    const step = workflow.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new Error('Approval step not found');
    }

    step.status = 'rejected';
    step.respondedAt = new Date();
    step.comments = reason;

    workflow.status = 'rejected';
    request.status = 'rejected';

    this.logAuditEvent({
      type: 'export_approval',
      partnerId: request.partnerId,
      userId: approverId,
      requestId,
      action: 'reject',
      resource: 'export_request',
      details: {
        stepId,
        stepName: step.name,
        reason,
      },
      clientIp: '0.0.0.0',
      userAgent: 'approval-system',
      timestamp: new Date(),
      classification: request.classification,
    });

    this.emit('export_request_rejected', {
      requestId,
      workflowId: workflow.id,
      reason,
      timestamp: new Date(),
    });
  }

  private async startExportJob(request: ExportRequest): Promise<void> {
    const job: ExportJob = {
      id: crypto.randomUUID(),
      requestId: request.id,
      status: 'queued',
      progress: 0,
      startTime: new Date(),
      recordsProcessed: 0,
      totalRecords: 0,
      fileSize: 0,
      outputFiles: [],
      metrics: {
        extractionTime: 0,
        transformationTime: 0,
        compressionTime: 0,
        encryptionTime: 0,
        uploadTime: 0,
      },
    };

    this.jobs.set(job.id, job);
    request.status = 'processing';

    this.logAuditEvent({
      type: 'export_job',
      partnerId: request.partnerId,
      userId: request.requestedBy,
      requestId: request.id,
      jobId: job.id,
      action: 'start',
      resource: 'export_job',
      details: {},
      clientIp: '0.0.0.0',
      userAgent: 'export-system',
      timestamp: new Date(),
      classification: request.classification,
    });

    this.emit('export_job_started', {
      jobId: job.id,
      requestId: request.id,
      timestamp: new Date(),
    });

    // Simulate export processing
    this.processExportJob(job, request);
  }

  private async processExportJob(
    job: ExportJob,
    request: ExportRequest,
  ): Promise<void> {
    try {
      job.status = 'running';

      // Simulate data extraction
      await this.simulateDelay(2000);
      job.metrics.extractionTime = 2000;
      job.progress = 20;

      // Simulate data transformation
      await this.simulateDelay(3000);
      job.metrics.transformationTime = 3000;
      job.progress = 60;

      // Simulate compression
      if (request.compression) {
        await this.simulateDelay(1000);
        job.metrics.compressionTime = 1000;
      }
      job.progress = 80;

      // Simulate encryption
      if (request.encryption) {
        await this.simulateDelay(1500);
        job.metrics.encryptionTime = 1500;
      }
      job.progress = 90;

      // Create output file
      const outputFile: ExportFile = {
        id: crypto.randomUUID(),
        filename: `export_${request.id}_${Date.now()}.json`,
        path: `/exports/${request.partnerId}/${request.id}/`,
        size: 1024 * 1024, // 1MB
        checksum: crypto.randomUUID(),
        mimeType: 'application/json',
        downloadUrl: `https://api.intelgraph.com/exports/${request.partnerId}/${request.id}/download`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        downloadCount: 0,
      };

      if (request.encryption) {
        outputFile.encryption = {
          algorithm: request.encryption.algorithm,
          keyId: request.encryption.keyId,
          iv: crypto.randomUUID(),
        };
      }

      if (request.compression) {
        outputFile.compression = {
          algorithm: request.compression,
          originalSize: 2 * 1024 * 1024,
          ratio: 0.5,
        };
      }

      job.outputFiles.push(outputFile);
      job.fileSize = outputFile.size;
      job.recordsProcessed = 1000;
      job.totalRecords = 1000;

      // Simulate upload
      await this.simulateDelay(1000);
      job.metrics.uploadTime = 1000;
      job.progress = 100;

      job.status = 'completed';
      job.endTime = new Date();
      request.status = 'completed';
      request.completedAt = new Date();

      this.logAuditEvent({
        type: 'export_job',
        partnerId: request.partnerId,
        userId: request.requestedBy,
        requestId: request.id,
        jobId: job.id,
        action: 'complete',
        resource: 'export_job',
        details: {
          recordsProcessed: job.recordsProcessed,
          fileSize: job.fileSize,
          processingTime: job.endTime.getTime() - job.startTime.getTime(),
        },
        clientIp: '0.0.0.0',
        userAgent: 'export-system',
        timestamp: new Date(),
        classification: request.classification,
      });

      this.emit('export_job_completed', {
        jobId: job.id,
        requestId: request.id,
        recordsProcessed: job.recordsProcessed,
        fileSize: job.fileSize,
        downloadUrl: outputFile.downloadUrl,
        timestamp: new Date(),
      });

      // Notify partner via webhook or delivery channel
      await this.notifyPartner(request, job);
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.endTime = new Date();
      request.status = 'failed';

      this.logAuditEvent({
        type: 'export_job',
        partnerId: request.partnerId,
        userId: request.requestedBy,
        requestId: request.id,
        jobId: job.id,
        action: 'fail',
        resource: 'export_job',
        details: {
          error: job.error,
        },
        clientIp: '0.0.0.0',
        userAgent: 'export-system',
        timestamp: new Date(),
        classification: request.classification,
      });

      this.emit('export_job_failed', {
        jobId: job.id,
        requestId: request.id,
        error: job.error,
        timestamp: new Date(),
      });
    }
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async notifyPartner(
    request: ExportRequest,
    job: ExportJob,
  ): Promise<void> {
    const partner = this.partners.get(request.partnerId);
    if (!partner || !partner.baseUrl) {
      return;
    }

    try {
      const notification = {
        requestId: request.id,
        jobId: job.id,
        status: job.status,
        downloadUrls: job.outputFiles.map((f) => f.downloadUrl),
        expiresAt: job.outputFiles[0]?.expiresAt,
        timestamp: new Date(),
      };

      const response = await fetch(
        `${partner.baseUrl}/webhook/export-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.generatePartnerToken(partner.partnerId)}`,
          },
          body: JSON.stringify(notification),
        },
      );

      if (response.ok) {
        this.emit('partner_notified', {
          partnerId: request.partnerId,
          requestId: request.id,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      this.emit('partner_notification_failed', {
        partnerId: request.partnerId,
        requestId: request.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    }
  }

  private generatePartnerToken(partnerId: string): string {
    return jwt.sign(
      {
        partnerId,
        iss: 'intelgraph-export-gateway',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      },
      this.secretKey,
    );
  }

  private logAuditEvent(event: Omit<AuditEvent, 'id'>): void {
    const auditEvent: AuditEvent = {
      ...event,
      id: crypto.randomUUID(),
    };

    this.auditLog.push(auditEvent);

    // Keep only last 10000 events in memory
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }
  }

  async getRequest(requestId: string): Promise<ExportRequest | undefined> {
    return this.requests.get(requestId);
  }

  async getJob(jobId: string): Promise<ExportJob | undefined> {
    return this.jobs.get(jobId);
  }

  async listRequests(
    partnerId?: string,
    status?: string,
  ): Promise<ExportRequest[]> {
    let requests = Array.from(this.requests.values());

    if (partnerId) {
      requests = requests.filter((r) => r.partnerId === partnerId);
    }

    if (status) {
      requests = requests.filter((r) => r.status === status);
    }

    return requests.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  async getPartnerMetrics(partnerId: string): Promise<PartnerMetrics> {
    const partnerRequests = Array.from(this.requests.values()).filter(
      (r) => r.partnerId === partnerId,
    );
    const partnerJobs = Array.from(this.jobs.values()).filter((j) => {
      const request = this.requests.get(j.requestId);
      return request?.partnerId === partnerId;
    });

    const completedJobs = partnerJobs.filter((j) => j.status === 'completed');
    const failedJobs = partnerJobs.filter((j) => j.status === 'failed');

    return {
      totalRequests: partnerRequests.length,
      approvedRequests: partnerRequests.filter(
        (r) => r.status === 'approved' || r.status === 'completed',
      ).length,
      rejectedRequests: partnerRequests.filter((r) => r.status === 'rejected')
        .length,
      completedExports: completedJobs.length,
      failedExports: failedJobs.length,
      totalRecordsExported: completedJobs.reduce(
        (sum, j) => sum + j.recordsProcessed,
        0,
      ),
      totalDataSize: completedJobs.reduce((sum, j) => sum + j.fileSize, 0),
      averageProcessingTime:
        completedJobs.length > 0
          ? completedJobs.reduce((sum, j) => {
              const duration = j.endTime
                ? j.endTime.getTime() - j.startTime.getTime()
                : 0;
              return sum + duration;
            }, 0) / completedJobs.length
          : 0,
      apiUsage: {
        callsPerMinute: 0, // Would be calculated from rate limiter
        callsPerHour: 0,
        callsPerDay: 0,
      },
      errorRate:
        partnerJobs.length > 0 ? failedJobs.length / partnerJobs.length : 0,
      complianceScore: 95, // Would be calculated based on compliance events
    };
  }

  async getAuditLog(filters?: {
    partnerId?: string;
    userId?: string;
    type?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditEvent[]> {
    let events = [...this.auditLog];

    if (filters?.partnerId) {
      events = events.filter((e) => e.partnerId === filters.partnerId);
    }

    if (filters?.userId) {
      events = events.filter((e) => e.userId === filters.userId);
    }

    if (filters?.type) {
      events = events.filter((e) => e.type === filters.type);
    }

    if (filters?.startDate) {
      events = events.filter((e) => e.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      events = events.filter((e) => e.timestamp <= filters.endDate!);
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}
