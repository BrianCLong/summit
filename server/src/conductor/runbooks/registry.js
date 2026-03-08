"use strict";
// @ts-nocheck
// Signed Runbook Registry for Conductor
// Provides secure, version-controlled operational procedures with approval workflows
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runbookRegistry = exports.RunbookRegistry = void 0;
const crypto_1 = require("crypto");
const prometheus_js_1 = require("../observability/prometheus.js");
const ioredis_1 = __importDefault(require("ioredis"));
/**
 * Cryptographic Signing Service
 */
class RunbookSigningService {
    privateKey;
    publicKey;
    constructor() {
        // In production, these should be loaded from secure key management
        const keyPair = (0, crypto_1.generateKeyPairSync)('rsa', {
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
    signRunbook(runbook, signer) {
        // Create canonical hash of runbook content
        const canonicalContent = this.canonicalizeRunbook(runbook);
        const hash = crypto
            .createHash('sha256')
            .update(canonicalContent)
            .digest('hex');
        // Sign the hash
        const sign = (0, crypto_1.createSign)('RSA-SHA256');
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
    verifyRunbook(runbook) {
        try {
            // Recreate canonical hash
            const runbookWithoutSignature = { ...runbook };
            delete runbookWithoutSignature.signature;
            const canonicalContent = this.canonicalizeRunbook(runbookWithoutSignature);
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
            const verify = (0, crypto_1.createVerify)('RSA-SHA256');
            verify.update(hash);
            return verify.verify(runbook.signature.publicKey, runbook.signature.signature, 'hex');
        }
        catch (error) {
            console.error('Runbook signature verification failed:', error);
            return false;
        }
    }
    /**
     * Create canonical representation of runbook for consistent hashing
     */
    canonicalizeRunbook(runbook) {
        // Sort keys recursively and create deterministic JSON
        const sortKeys = (obj) => {
            if (Array.isArray(obj)) {
                return obj.map(sortKeys);
            }
            else if (obj !== null && typeof obj === 'object') {
                const sorted = {};
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
    redis;
    constructor() {
        this.redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
    }
    /**
     * Initiate approval workflow for runbook execution
     */
    async initiateApproval(execution, workflow) {
        const approvalId = (0, crypto_1.randomUUID)();
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
        await this.redis.setex(`approval:${approvalId}`, workflow.timeoutMinutes * 60, JSON.stringify(approvalRequest));
        // Add to pending approvals queue
        await this.redis.zadd('pending_approvals', Date.now(), approvalId);
        // Schedule timeout handler
        await this.redis.zadd('approval_timeouts', approvalRequest.timeoutAt, approvalId);
        console.log(`Approval workflow initiated: ${approvalId} for execution ${execution.id}`);
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('approval_workflow_initiated', { success: true });
    }
    /**
     * Process approval response
     */
    async processApproval(approvalId, approverId, decision, comments) {
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
            const existingApproval = approval.approvals.find((a) => a.approverId === approverId);
            if (existingApproval) {
                return {
                    success: false,
                    approved: false,
                    message: 'Already processed by this approver',
                };
            }
            // Add approval/rejection
            const approvalRecord = {
                id: (0, crypto_1.randomUUID)(),
                approverId,
                decision,
                timestamp: Date.now(),
                comments,
            };
            approval.approvals.push(approvalRecord);
            // Check if workflow is complete
            const isApproved = this.checkApprovalComplete(approval);
            const isRejected = approval.approvals.some((a) => a.decision === 'rejected');
            if (isApproved) {
                approval.status = 'approved';
                await this.notifyApprovalComplete(approval, true);
            }
            else if (isRejected) {
                approval.status = 'rejected';
                await this.notifyApprovalComplete(approval, false);
            }
            // Update approval request
            await this.redis.setex(`approval:${approvalId}`, 3600, JSON.stringify(approval));
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('approval_processed', isApproved || isRejected);
            return {
                success: true,
                approved: isApproved,
                message: isApproved
                    ? 'Runbook execution approved'
                    : isRejected
                        ? 'Runbook execution rejected'
                        : 'Approval recorded, waiting for additional approvers',
            };
        }
        catch (error) {
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
    checkApprovalComplete(approval) {
        for (const requirement of approval.requiredApprovers) {
            const relevantApprovals = approval.approvals.filter((a) => a.decision === 'approved' &&
                (requirement.any || requirement.users?.includes(a.approverId)));
            if (relevantApprovals.length < requirement.count) {
                return false;
            }
        }
        return true;
    }
    /**
     * Notify stakeholders of approval completion
     */
    async notifyApprovalComplete(approval, isApproved) {
        // Implementation would integrate with notification systems
        console.log(`Approval ${approval.id} ${isApproved ? 'approved' : 'rejected'}`);
        // Remove from pending queue
        await this.redis.zrem('pending_approvals', approval.id);
        await this.redis.zrem('approval_timeouts', approval.id);
    }
    async disconnect() {
        await this.redis.quit();
    }
}
/**
 * Runbook Registry
 */
class RunbookRegistry {
    redis;
    signingService;
    approvalEngine;
    workflows;
    constructor() {
        this.redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
        this.signingService = new RunbookSigningService();
        this.approvalEngine = new ApprovalWorkflowEngine();
        this.workflows = new Map();
        this.loadDefaultWorkflows();
    }
    /**
     * Register a new runbook
     */
    async registerRunbook(runbook, author) {
        try {
            // Sign the runbook
            const signature = this.signingService.signRunbook(runbook, author);
            const signedRunbook = { ...runbook, signature };
            // Store in registry
            const key = `runbook:${runbook.id}:${runbook.version}`;
            await this.redis.set(key, JSON.stringify(signedRunbook));
            // Add to version index
            await this.redis.zadd(`runbook_versions:${runbook.id}`, Date.now(), runbook.version);
            // Add to category index
            await this.redis.sadd(`runbooks:${runbook.category}`, runbook.id);
            // Add to tenant index if specified
            if (runbook.metadata.tenantId) {
                await this.redis.sadd(`runbooks:tenant:${runbook.metadata.tenantId}`, runbook.id);
            }
            console.log(`Runbook registered: ${runbook.id} v${runbook.version}`);
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('runbook_registered', { success: true });
            return signedRunbook.signature.hash;
        }
        catch (error) {
            console.error('Runbook registration failed:', error);
            prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('runbook_registration_error', { success: false });
            throw error;
        }
    }
    /**
     * Get runbook by ID and version
     */
    async getRunbook(id, version) {
        try {
            let targetVersion = version;
            if (!version) {
                // Get latest version
                const versions = await this.redis.zrevrange(`runbook_versions:${id}`, 0, 0);
                if (versions.length === 0)
                    return null;
                targetVersion = versions[0];
            }
            const key = `runbook:${id}:${targetVersion}`;
            const data = await this.redis.get(key);
            if (!data)
                return null;
            const runbook = JSON.parse(data);
            // Verify signature
            if (!this.signingService.verifyRunbook(runbook)) {
                console.error(`Invalid signature for runbook ${id} v${targetVersion}`);
                return null;
            }
            return runbook;
        }
        catch (error) {
            console.error('Runbook retrieval error:', error);
            return null;
        }
    }
    /**
     * Execute runbook with approval workflow
     */
    async executeRunbook(runbookId, executorId, tenantId, context, version) {
        const runbook = await this.getRunbook(runbookId, version);
        if (!runbook) {
            throw new Error('Runbook not found or invalid');
        }
        const executionId = (0, crypto_1.randomUUID)();
        const execution = {
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
        }
        else {
            // Start execution immediately
            execution.status = 'running';
            await this.redis.set(`execution:${executionId}`, JSON.stringify(execution));
        }
        prometheus_js_1.prometheusConductorMetrics.recordOperationalEvent('runbook_execution_initiated', { success: true });
        return executionId;
    }
    /**
     * Get runbook execution status
     */
    async getExecution(executionId) {
        try {
            const data = await this.redis.get(`execution:${executionId}`);
            return data ? JSON.parse(data) : null;
        }
        catch (error) {
            console.error('Execution retrieval error:', error);
            return null;
        }
    }
    /**
     * List runbooks by category
     */
    async listRunbooks(category, tenantId) {
        try {
            let runbookIds;
            if (tenantId) {
                runbookIds = await this.redis.smembers(`runbooks:tenant:${tenantId}`);
            }
            else if (category) {
                runbookIds = await this.redis.smembers(`runbooks:${category}`);
            }
            else {
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
        }
        catch (error) {
            console.error('Runbook listing error:', error);
            return [];
        }
    }
    /**
     * Process approval for runbook execution
     */
    async processApproval(approvalId, approverId, decision, comments) {
        return this.approvalEngine.processApproval(approvalId, approverId, decision, comments);
    }
    /**
     * Load default approval workflows
     */
    loadDefaultWorkflows() {
        const workflows = [
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
            this.workflows.set(`${workflow.runbookCategory}:${workflow.severity}`, workflow);
        });
    }
    async disconnect() {
        await this.redis.quit();
        await this.approvalEngine.disconnect();
    }
}
exports.RunbookRegistry = RunbookRegistry;
// Export singleton
exports.runbookRegistry = new RunbookRegistry();
