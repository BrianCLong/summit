// Signed Runbook Registry for Conductor
// Provides secure, version-controlled operational procedures with approval workflows

import crypto from 'crypto';
import { prometheusConductorMetrics } from '../observability/prometheus';
import Redis from 'ioredis';

export interface Runbook {
  id: string;
  name: string;
  version: string;
  description: string;
  category:
    | 'incident_response'
    | 'maintenance'
    | 'security'
    | 'deployment'
    | 'backup'
    | 'monitoring';
  severity: 'low' | 'medium' | 'high' | 'critical';
  approvalRequired: boolean;
  steps: RunbookStep[];
  metadata: {
    author: string;
    createdAt: number;
    updatedAt: number;
    tags: string[];
    tenantId?: string;
    businessUnit?: string;
  };
  approvals: RunbookApproval[];
  signature: RunbookSignature;
}

export interface RunbookStep {
  id: string;
  order: number;
  title: string;
  description: string;
  type: 'manual' | 'automated' | 'verification' | 'decision';
  command?: string;
  expectedOutput?: string;
  timeout?: number;
  rollbackCommand?: string;
  preconditions?: string[];
  postconditions?: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  automationLevel: 'none' | 'assisted' | 'full';
}

export interface RunbookApproval {
  id: string;
  approver: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
  comments?: string;
  conditions?: string[];
  signature: string;
}

export interface RunbookSignature {
  algorithm: string;
  hash: string;
  signature: string;
  publicKey: string;
  timestamp: number;
  signer: string;
}

export interface RunbookExecution {
  id: string;
  runbookId: string;
  runbookVersion: string;
  executorId: string;
  tenantId: string;
  startTime: number;
  endTime?: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep: number;
  stepResults: StepResult[];
  approvals: RunbookApproval[];
  metadata: {
    trigger: 'manual' | 'automated' | 'incident' | 'scheduled';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    context?: Record<string, any>;
  };
}

export interface StepResult {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: number;
  endTime?: number;
  output?: string;
  error?: string;
  executedBy: string;
  verifiedBy?: string;
}

export interface ApprovalWorkflow {
  id: string;
  runbookCategory: string;
  severity: string;
  requiredApprovers: Array<{
    role: string;
    count: number;
    any: boolean; // true = any user with role, false = specific users
    users?: string[];
  }>;
  timeoutMinutes: number;
  escalationRules: Array<{
    afterMinutes: number;
    escalateTo: string[];
    notifyChannels: string[];
  }>;
}

/**
 * Cryptographic Signing Service
 */
class RunbookSigningService {
  private privateKey: string;
  private publicKey: string;

  constructor() {
    // In production, these should be loaded from secure key management
    const keyPair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    this.privateKey = process.env.RUNBOOK_PRIVATE_KEY || keyPair.privateKey;
    this.publicKey = process.env.RUNBOOK_PUBLIC_KEY || keyPair.publicKey;
  }

  /**
   * Sign a runbook
   */
  signRunbook(
    runbook: Omit<Runbook, 'signature'>,
    signer: string,
  ): RunbookSignature {
    // Create canonical hash of runbook content
    const canonicalContent = this.canonicalizeRunbook(runbook);
    const hash = crypto
      .createHash('sha256')
      .update(canonicalContent)
      .digest('hex');

    // Sign the hash
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(hash);
    const signature = sign.sign(this.privateKey, 'hex');

    return {
      algorithm: 'RSA-SHA256',
      hash,
      signature,
      publicKey: this.publicKey,
      timestamp: Date.now(),
      signer,
    };
  }

  /**
   * Verify a runbook signature
   */
  verifyRunbook(runbook: Runbook): boolean {
    try {
      // Recreate canonical hash
      const runbookWithoutSignature = { ...runbook };
      delete (runbookWithoutSignature as any).signature;

      const canonicalContent = this.canonicalizeRunbook(
        runbookWithoutSignature,
      );
      const hash = crypto
        .createHash('sha256')
        .update(canonicalContent)
        .digest('hex');

      // Verify hash matches
      if (hash !== runbook.signature.hash) {
        console.error('Runbook hash mismatch');
        return false;
      }

      // Verify signature
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(hash);
      return verify.verify(
        runbook.signature.publicKey,
        runbook.signature.signature,
        'hex',
      );
    } catch (error) {
      console.error('Runbook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Create canonical representation of runbook for consistent hashing
   */
  private canonicalizeRunbook(runbook: Omit<Runbook, 'signature'>): string {
    // Sort keys recursively and create deterministic JSON
    const sortKeys = (obj: any): any => {
      if (Array.isArray(obj)) {
        return obj.map(sortKeys);
      } else if (obj !== null && typeof obj === 'object') {
        const sorted: any = {};
        Object.keys(obj)
          .sort()
          .forEach((key) => {
            sorted[key] = sortKeys(obj[key]);
          });
        return sorted;
      }
      return obj;
    };

    return JSON.stringify(sortKeys(runbook), null, 0);
  }
}

/**
 * Approval Workflow Engine
 */
class ApprovalWorkflowEngine {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Initiate approval workflow for runbook execution
   */
  async initiateApproval(
    execution: RunbookExecution,
    workflow: ApprovalWorkflow,
  ): Promise<void> {
    const approvalId = crypto.randomUUID();

    const approvalRequest = {
      id: approvalId,
      executionId: execution.id,
      runbookId: execution.runbookId,
      workflowId: workflow.id,
      requiredApprovers: workflow.requiredApprovers,
      status: 'pending',
      createdAt: Date.now(),
      timeoutAt: Date.now() + workflow.timeoutMinutes * 60 * 1000,
      approvals: [],
      notifications: [],
    };

    // Store approval request
    await this.redis.setex(
      `approval:${approvalId}`,
      workflow.timeoutMinutes * 60,
      JSON.stringify(approvalRequest),
    );

    // Add to pending approvals queue
    await this.redis.zadd('pending_approvals', Date.now(), approvalId);

    // Schedule timeout handler
    await this.redis.zadd(
      'approval_timeouts',
      approvalRequest.timeoutAt,
      approvalId,
    );

    console.log(
      `Approval workflow initiated: ${approvalId} for execution ${execution.id}`,
    );
    prometheusConductorMetrics.recordOperationalEvent(
      'approval_workflow_initiated',
      true,
    );
  }

  /**
   * Process approval response
   */
  async processApproval(
    approvalId: string,
    approverId: string,
    decision: 'approved' | 'rejected',
    comments?: string,
  ): Promise<{
    success: boolean;
    approved: boolean;
    message: string;
  }> {
    try {
      const approvalData = await this.redis.get(`approval:${approvalId}`);
      if (!approvalData) {
        return {
          success: false,
          approved: false,
          message: 'Approval request not found or expired',
        };
      }

      const approval = JSON.parse(approvalData);

      // Check if already processed by this approver
      const existingApproval = approval.approvals.find(
        (a: any) => a.approverId === approverId,
      );
      if (existingApproval) {
        return {
          success: false,
          approved: false,
          message: 'Already processed by this approver',
        };
      }

      // Add approval/rejection
      const approvalRecord = {
        id: crypto.randomUUID(),
        approverId,
        decision,
        timestamp: Date.now(),
        comments,
      };

      approval.approvals.push(approvalRecord);

      // Check if workflow is complete
      const isApproved = this.checkApprovalComplete(approval);
      const isRejected = approval.approvals.some(
        (a: any) => a.decision === 'rejected',
      );

      if (isApproved) {
        approval.status = 'approved';
        await this.notifyApprovalComplete(approval, true);
      } else if (isRejected) {
        approval.status = 'rejected';
        await this.notifyApprovalComplete(approval, false);
      }

      // Update approval request
      await this.redis.setex(
        `approval:${approvalId}`,
        3600,
        JSON.stringify(approval),
      );

      prometheusConductorMetrics.recordOperationalEvent(
        'approval_processed',
        isApproved || isRejected,
      );

      return {
        success: true,
        approved: isApproved,
        message: isApproved
          ? 'Runbook execution approved'
          : isRejected
            ? 'Runbook execution rejected'
            : 'Approval recorded, waiting for additional approvers',
      };
    } catch (error) {
      console.error('Approval processing error:', error);
      return {
        success: false,
        approved: false,
        message: 'Failed to process approval',
      };
    }
  }

  /**
   * Check if approval workflow is complete
   */
  private checkApprovalComplete(approval: any): boolean {
    for (const requirement of approval.requiredApprovers) {
      const relevantApprovals = approval.approvals.filter(
        (a: any) =>
          a.decision === 'approved' &&
          (requirement.any || requirement.users?.includes(a.approverId)),
      );

      if (relevantApprovals.length < requirement.count) {
        return false;
      }
    }
    return true;
  }

  /**
   * Notify stakeholders of approval completion
   */
  private async notifyApprovalComplete(
    approval: any,
    isApproved: boolean,
  ): Promise<void> {
    // Implementation would integrate with notification systems
    console.log(
      `Approval ${approval.id} ${isApproved ? 'approved' : 'rejected'}`,
    );

    // Remove from pending queue
    await this.redis.zrem('pending_approvals', approval.id);
    await this.redis.zrem('approval_timeouts', approval.id);
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}

/**
 * Runbook Registry
 */
export class RunbookRegistry {
  private redis: Redis;
  private signingService: RunbookSigningService;
  private approvalEngine: ApprovalWorkflowEngine;
  private workflows: Map<string, ApprovalWorkflow>;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.signingService = new RunbookSigningService();
    this.approvalEngine = new ApprovalWorkflowEngine();
    this.workflows = new Map();

    this.loadDefaultWorkflows();
  }

  /**
   * Register a new runbook
   */
  async registerRunbook(
    runbook: Omit<Runbook, 'signature'>,
    author: string,
  ): Promise<string> {
    try {
      // Sign the runbook
      const signature = this.signingService.signRunbook(runbook, author);
      const signedRunbook: Runbook = { ...runbook, signature };

      // Store in registry
      const key = `runbook:${runbook.id}:${runbook.version}`;
      await this.redis.set(key, JSON.stringify(signedRunbook));

      // Add to version index
      await this.redis.zadd(
        `runbook_versions:${runbook.id}`,
        Date.now(),
        runbook.version,
      );

      // Add to category index
      await this.redis.sadd(`runbooks:${runbook.category}`, runbook.id);

      // Add to tenant index if specified
      if (runbook.metadata.tenantId) {
        await this.redis.sadd(
          `runbooks:tenant:${runbook.metadata.tenantId}`,
          runbook.id,
        );
      }

      console.log(`Runbook registered: ${runbook.id} v${runbook.version}`);
      prometheusConductorMetrics.recordOperationalEvent(
        'runbook_registered',
        true,
      );

      return signedRunbook.signature.hash;
    } catch (error) {
      console.error('Runbook registration failed:', error);
      prometheusConductorMetrics.recordOperationalEvent(
        'runbook_registration_error',
        false,
      );
      throw error;
    }
  }

  /**
   * Get runbook by ID and version
   */
  async getRunbook(id: string, version?: string): Promise<Runbook | null> {
    try {
      let targetVersion = version;

      if (!version) {
        // Get latest version
        const versions = await this.redis.zrevrange(
          `runbook_versions:${id}`,
          0,
          0,
        );
        if (versions.length === 0) return null;
        targetVersion = versions[0];
      }

      const key = `runbook:${id}:${targetVersion}`;
      const data = await this.redis.get(key);

      if (!data) return null;

      const runbook: Runbook = JSON.parse(data);

      // Verify signature
      if (!this.signingService.verifyRunbook(runbook)) {
        console.error(`Invalid signature for runbook ${id} v${targetVersion}`);
        return null;
      }

      return runbook;
    } catch (error) {
      console.error('Runbook retrieval error:', error);
      return null;
    }
  }

  /**
   * Execute runbook with approval workflow
   */
  async executeRunbook(
    runbookId: string,
    executorId: string,
    tenantId: string,
    context?: Record<string, any>,
    version?: string,
  ): Promise<string> {
    const runbook = await this.getRunbook(runbookId, version);
    if (!runbook) {
      throw new Error('Runbook not found or invalid');
    }

    const executionId = crypto.randomUUID();
    const execution: RunbookExecution = {
      id: executionId,
      runbookId: runbook.id,
      runbookVersion: runbook.version,
      executorId,
      tenantId,
      startTime: Date.now(),
      status: 'pending',
      currentStep: 0,
      stepResults: [],
      approvals: [],
      metadata: {
        trigger: 'manual',
        priority: runbook.severity === 'critical' ? 'urgent' : 'normal',
        context,
      },
    };

    // Store execution
    await this.redis.set(`execution:${executionId}`, JSON.stringify(execution));

    // Check if approval required
    if (runbook.approvalRequired) {
      const workflowKey = `${runbook.category}:${runbook.severity}`;
      const workflow = this.workflows.get(workflowKey);

      if (workflow) {
        await this.approvalEngine.initiateApproval(execution, workflow);
        console.log(`Approval required for runbook execution ${executionId}`);
      }
    } else {
      // Start execution immediately
      execution.status = 'running';
      await this.redis.set(
        `execution:${executionId}`,
        JSON.stringify(execution),
      );
    }

    prometheusConductorMetrics.recordOperationalEvent(
      'runbook_execution_initiated',
      true,
    );
    return executionId;
  }

  /**
   * Get runbook execution status
   */
  async getExecution(executionId: string): Promise<RunbookExecution | null> {
    try {
      const data = await this.redis.get(`execution:${executionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Execution retrieval error:', error);
      return null;
    }
  }

  /**
   * List runbooks by category
   */
  async listRunbooks(
    category?: string,
    tenantId?: string,
  ): Promise<
    Array<{
      id: string;
      name: string;
      version: string;
      category: string;
      description: string;
    }>
  > {
    try {
      let runbookIds: string[];

      if (tenantId) {
        runbookIds = await this.redis.smembers(`runbooks:tenant:${tenantId}`);
      } else if (category) {
        runbookIds = await this.redis.smembers(`runbooks:${category}`);
      } else {
        // Get all categories and merge
        const categories = [
          'incident_response',
          'maintenance',
          'security',
          'deployment',
          'backup',
          'monitoring',
        ];
        runbookIds = [];
        for (const cat of categories) {
          const ids = await this.redis.smembers(`runbooks:${cat}`);
          runbookIds.push(...ids);
        }
      }

      const runbooks = [];
      for (const id of runbookIds) {
        const runbook = await this.getRunbook(id);
        if (runbook) {
          runbooks.push({
            id: runbook.id,
            name: runbook.name,
            version: runbook.version,
            category: runbook.category,
            description: runbook.description,
          });
        }
      }

      return runbooks;
    } catch (error) {
      console.error('Runbook listing error:', error);
      return [];
    }
  }

  /**
   * Process approval for runbook execution
   */
  async processApproval(
    approvalId: string,
    approverId: string,
    decision: 'approved' | 'rejected',
    comments?: string,
  ) {
    return this.approvalEngine.processApproval(
      approvalId,
      approverId,
      decision,
      comments,
    );
  }

  /**
   * Load default approval workflows
   */
  private loadDefaultWorkflows(): void {
    const workflows: ApprovalWorkflow[] = [
      {
        id: 'incident_response:critical',
        runbookCategory: 'incident_response',
        severity: 'critical',
        requiredApprovers: [
          { role: 'incident_commander', count: 1, any: true },
          { role: 'security_lead', count: 1, any: true },
        ],
        timeoutMinutes: 15,
        escalationRules: [
          {
            afterMinutes: 5,
            escalateTo: ['on_call_manager'],
            notifyChannels: ['slack_emergency', 'pagerduty'],
          },
        ],
      },
      {
        id: 'security:high',
        runbookCategory: 'security',
        severity: 'high',
        requiredApprovers: [
          { role: 'security_admin', count: 2, any: true },
          { role: 'system_admin', count: 1, any: true },
        ],
        timeoutMinutes: 30,
        escalationRules: [
          {
            afterMinutes: 20,
            escalateTo: ['security_manager'],
            notifyChannels: ['slack_security'],
          },
        ],
      },
      {
        id: 'deployment:medium',
        runbookCategory: 'deployment',
        severity: 'medium',
        requiredApprovers: [{ role: 'tech_lead', count: 1, any: true }],
        timeoutMinutes: 60,
        escalationRules: [],
      },
    ];

    workflows.forEach((workflow) => {
      this.workflows.set(
        `${workflow.runbookCategory}:${workflow.severity}`,
        workflow,
      );
    });
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
    await this.approvalEngine.disconnect();
  }
}

// Export singleton
export const runbookRegistry = new RunbookRegistry();
