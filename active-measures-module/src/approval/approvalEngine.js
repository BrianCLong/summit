"use strict";
/**
 * Comprehensive Approval Chain Engine
 *
 * Implements multi-stage approval workflows with role-based access control,
 * automated policy evaluation, and comprehensive tracking of decision chains.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalEngine = exports.ResourceType = exports.TriggerAction = exports.TriggerType = exports.ConditionType = exports.ComplianceStatus = exports.RiskType = exports.RiskLevel = exports.EffectType = exports.MeasureCategory = exports.AuthenticationMethod = exports.DecisionType = exports.StageStatus = exports.ApprovalStageType = exports.ApprovalStatus = exports.OperationType = exports.UrgencyLevel = void 0;
const auditEngine_1 = require("../audit/auditEngine");
// Enums
var UrgencyLevel;
(function (UrgencyLevel) {
    UrgencyLevel["LOW"] = "low";
    UrgencyLevel["NORMAL"] = "normal";
    UrgencyLevel["HIGH"] = "high";
    UrgencyLevel["CRITICAL"] = "critical";
    UrgencyLevel["EMERGENCY"] = "emergency";
})(UrgencyLevel || (exports.UrgencyLevel = UrgencyLevel = {}));
var OperationType;
(function (OperationType) {
    OperationType["INFORMATION_OPERATION"] = "information_operation";
    OperationType["PSYCHOLOGICAL_OPERATION"] = "psychological_operation";
    OperationType["INFLUENCE_CAMPAIGN"] = "influence_campaign";
    OperationType["COUNTER_NARRATIVE"] = "counter_narrative";
    OperationType["DISRUPTION_OPERATION"] = "disruption_operation";
    OperationType["DEFENSIVE_OPERATION"] = "defensive_operation";
})(OperationType || (exports.OperationType = OperationType = {}));
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["DRAFT"] = "draft";
    ApprovalStatus["SUBMITTED"] = "submitted";
    ApprovalStatus["UNDER_REVIEW"] = "under_review";
    ApprovalStatus["APPROVED"] = "approved";
    ApprovalStatus["CONDITIONALLY_APPROVED"] = "conditionally_approved";
    ApprovalStatus["REJECTED"] = "rejected";
    ApprovalStatus["WITHDRAWN"] = "withdrawn";
    ApprovalStatus["EXPIRED"] = "expired";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
var ApprovalStageType;
(function (ApprovalStageType) {
    ApprovalStageType["AUTOMATIC"] = "automatic";
    ApprovalStageType["HUMAN_REVIEW"] = "human_review";
    ApprovalStageType["TECHNICAL_REVIEW"] = "technical_review";
    ApprovalStageType["LEGAL_REVIEW"] = "legal_review";
    ApprovalStageType["ETHICAL_REVIEW"] = "ethical_review";
    ApprovalStageType["RISK_ASSESSMENT"] = "risk_assessment";
    ApprovalStageType["SENIOR_APPROVAL"] = "senior_approval";
    ApprovalStageType["FINAL_AUTHORIZATION"] = "final_authorization";
})(ApprovalStageType || (exports.ApprovalStageType = ApprovalStageType = {}));
var StageStatus;
(function (StageStatus) {
    StageStatus["PENDING"] = "pending";
    StageStatus["IN_PROGRESS"] = "in_progress";
    StageStatus["COMPLETED"] = "completed";
    StageStatus["SKIPPED"] = "skipped";
    StageStatus["FAILED"] = "failed";
})(StageStatus || (exports.StageStatus = StageStatus = {}));
var DecisionType;
(function (DecisionType) {
    DecisionType["APPROVE"] = "approve";
    DecisionType["REJECT"] = "reject";
    DecisionType["CONDITIONAL_APPROVAL"] = "conditional_approval";
    DecisionType["ABSTAIN"] = "abstain";
    DecisionType["DEFER"] = "defer";
    DecisionType["REQUEST_MORE_INFO"] = "request_more_info";
})(DecisionType || (exports.DecisionType = DecisionType = {}));
var AuthenticationMethod;
(function (AuthenticationMethod) {
    AuthenticationMethod["PASSWORD"] = "password";
    AuthenticationMethod["CERTIFICATE"] = "certificate";
    AuthenticationMethod["BIOMETRIC"] = "biometric";
    AuthenticationMethod["MULTI_FACTOR"] = "multi_factor";
    AuthenticationMethod["SMART_CARD"] = "smart_card";
})(AuthenticationMethod || (exports.AuthenticationMethod = AuthenticationMethod = {}));
var MeasureCategory;
(function (MeasureCategory) {
    MeasureCategory["INFORMATION_WARFARE"] = "information_warfare";
    MeasureCategory["PSYCHOLOGICAL_WARFARE"] = "psychological_warfare";
    MeasureCategory["CYBER_OPERATIONS"] = "cyber_operations";
    MeasureCategory["SOCIAL_ENGINEERING"] = "social_engineering";
    MeasureCategory["ECONOMIC_PRESSURE"] = "economic_pressure";
    MeasureCategory["DIPLOMATIC_INFLUENCE"] = "diplomatic_influence";
})(MeasureCategory || (exports.MeasureCategory = MeasureCategory = {}));
var EffectType;
(function (EffectType) {
    EffectType["PERCEPTION_CHANGE"] = "perception_change";
    EffectType["BEHAVIOR_CHANGE"] = "behavior_change";
    EffectType["DECISION_INFLUENCE"] = "decision_influence";
    EffectType["CAPABILITY_DEGRADATION"] = "capability_degradation";
    EffectType["RELATIONSHIP_DISRUPTION"] = "relationship_disruption";
    EffectType["INFORMATION_CONTROL"] = "information_control";
})(EffectType || (exports.EffectType = EffectType = {}));
var RiskLevel;
(function (RiskLevel) {
    RiskLevel["MINIMAL"] = "minimal";
    RiskLevel["LOW"] = "low";
    RiskLevel["MODERATE"] = "moderate";
    RiskLevel["HIGH"] = "high";
    RiskLevel["CRITICAL"] = "critical";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
var RiskType;
(function (RiskType) {
    RiskType["OPERATIONAL"] = "operational";
    RiskType["STRATEGIC"] = "strategic";
    RiskType["LEGAL"] = "legal";
    RiskType["ETHICAL"] = "ethical";
    RiskType["REPUTATIONAL"] = "reputational";
    RiskType["TECHNICAL"] = "technical";
    RiskType["POLITICAL"] = "political";
})(RiskType || (exports.RiskType = RiskType = {}));
var ComplianceStatus;
(function (ComplianceStatus) {
    ComplianceStatus["COMPLIANT"] = "compliant";
    ComplianceStatus["NON_COMPLIANT"] = "non_compliant";
    ComplianceStatus["PARTIALLY_COMPLIANT"] = "partially_compliant";
    ComplianceStatus["UNDER_REVIEW"] = "under_review";
    ComplianceStatus["EXEMPTION_GRANTED"] = "exemption_granted";
})(ComplianceStatus || (exports.ComplianceStatus = ComplianceStatus = {}));
var ConditionType;
(function (ConditionType) {
    ConditionType["RISK_THRESHOLD"] = "risk_threshold";
    ConditionType["CLASSIFICATION_LEVEL"] = "classification_level";
    ConditionType["TARGET_TYPE"] = "target_type";
    ConditionType["RESOURCE_LIMIT"] = "resource_limit";
    ConditionType["TIME_CONSTRAINT"] = "time_constraint";
    ConditionType["LEGAL_REQUIREMENT"] = "legal_requirement";
    ConditionType["ETHICAL_REQUIREMENT"] = "ethical_requirement";
})(ConditionType || (exports.ConditionType = ConditionType = {}));
var TriggerType;
(function (TriggerType) {
    TriggerType["TIME_BASED"] = "time_based";
    TriggerType["EVENT_BASED"] = "event_based";
    TriggerType["CONDITION_BASED"] = "condition_based";
    TriggerType["APPROVAL_BASED"] = "approval_based";
    TriggerType["EXTERNAL_SIGNAL"] = "external_signal";
})(TriggerType || (exports.TriggerType = TriggerType = {}));
var TriggerAction;
(function (TriggerAction) {
    TriggerAction["ADVANCE_STAGE"] = "advance_stage";
    TriggerAction["ESCALATE"] = "escalate";
    TriggerAction["NOTIFY"] = "notify";
    TriggerAction["REJECT"] = "reject";
    TriggerAction["REQUEST_INFO"] = "request_info";
    TriggerAction["DELEGATE"] = "delegate";
})(TriggerAction || (exports.TriggerAction = TriggerAction = {}));
var ResourceType;
(function (ResourceType) {
    ResourceType["PERSONNEL"] = "personnel";
    ResourceType["BUDGET"] = "budget";
    ResourceType["TECHNOLOGY"] = "technology";
    ResourceType["INFRASTRUCTURE"] = "infrastructure";
    ResourceType["INTELLIGENCE"] = "intelligence";
    ResourceType["LEGAL_SUPPORT"] = "legal_support";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
/**
 * Comprehensive Approval Engine
 */
class ApprovalEngine {
    config;
    auditEngine;
    approvalStore = new Map();
    workflowTemplates = new Map();
    constructor(config, auditEngine) {
        this.config = config;
        this.auditEngine = auditEngine;
        // Initialize default workflow templates
        this.initializeWorkflowTemplates();
    }
    /**
     * Submit a new approval request
     */
    async submitApprovalRequest(operationId, requesterId, requestDetails) {
        const requestId = this.generateRequestId();
        // Create approval request
        const request = {
            id: requestId,
            operationId,
            requesterId,
            submittedAt: new Date(),
            expiresAt: this.config.enableTimeBasedExpiry
                ? new Date(Date.now() + this.config.maxApprovalTimeout * 60 * 1000)
                : undefined,
            title: requestDetails.title || '',
            description: requestDetails.description || '',
            justification: requestDetails.justification || '',
            urgency: requestDetails.urgency || UrgencyLevel.NORMAL,
            classification: requestDetails.classification || auditEngine_1.ClassificationLevel.CONFIDENTIAL,
            operationType: requestDetails.operationType || OperationType.INFORMATION_OPERATION,
            targetProfile: requestDetails.targetProfile || this.createDefaultTargetProfile(),
            proposedMeasures: requestDetails.proposedMeasures || [],
            estimatedImpact: requestDetails.estimatedImpact || this.createDefaultImpactAssessment(),
            riskAssessment: requestDetails.riskAssessment || this.createDefaultRiskAssessment(),
            legalReview: requestDetails.legalReview || this.createDefaultLegalReview(),
            ethicalReview: requestDetails.ethicalReview || this.createDefaultEthicalReview(),
            complianceChecks: requestDetails.complianceChecks || [],
            approvalChain: this.generateApprovalChain(requestDetails),
            currentStage: 0,
            status: ApprovalStatus.SUBMITTED,
            metadata: {
                version: '1.0',
                submissionMethod: 'api',
                sourceSystem: 'active-measures',
                correlationId: this.generateCorrelationId(),
                tags: requestDetails.metadata?.tags || [],
                attachments: requestDetails.metadata?.attachments || [],
            },
        };
        // Validate request
        this.validateApprovalRequest(request);
        // Store request
        this.approvalStore.set(requestId, request);
        // Log submission
        await this.auditEngine.logEntry(this.createAuditActor(requesterId), auditEngine_1.AuditAction.OPERATION_CREATED, {
            id: requestId,
            type: 'approval_request',
            classification: request.classification,
            owner: requesterId,
        }, {
            operationId,
            businessJustification: request.justification,
            urgencyLevel: request.urgency,
            riskLevel: request.riskAssessment.overallRisk,
            complianceFramework: ['NIST', 'SOX'],
            tags: ['approval', 'submission'],
        }, {
            result: 'success',
            duration: 0,
            dataModified: true,
            recordsAffected: 1,
            complianceStatus: 'compliant',
        });
        // Start approval workflow
        await this.startApprovalWorkflow(requestId);
        return requestId;
    }
    /**
     * Process an approval decision
     */
    async processDecision(requestId, approverId, decision, comments, conditions, authMethod = AuthenticationMethod.PASSWORD) {
        const request = this.approvalStore.get(requestId);
        if (!request) {
            throw new Error(`Approval request not found: ${requestId}`);
        }
        if (request.status !== ApprovalStatus.UNDER_REVIEW) {
            throw new Error(`Cannot process decision for request in status: ${request.status}`);
        }
        const currentStage = request.approvalChain[request.currentStage];
        if (!currentStage) {
            throw new Error('No current stage found');
        }
        // Validate approver authorization
        await this.validateApproverAuthorization(approverId, currentStage);
        // Create decision record
        const decisionRecord = {
            id: this.generateDecisionId(),
            stageId: currentStage.id,
            approverId,
            decision,
            timestamp: new Date(),
            comments,
            conditions: conditions || [],
            recommendations: [],
            confidenceLevel: 0.9,
            reviewDuration: this.calculateReviewDuration(currentStage.startedAt),
            informationReviewed: [],
            consultationsHeld: [],
            authenticationMethod: authMethod,
            cryptographicSignature: await this.generateCryptographicSignature(decision, approverId),
        };
        // Add decision to current stage
        currentStage.decisions.push(decisionRecord);
        // Evaluate stage completion
        const stageResult = await this.evaluateStageCompletion(currentStage);
        // Log decision
        await this.auditEngine.logEntry(this.createAuditActor(approverId), decision === DecisionType.APPROVE
            ? auditEngine_1.AuditAction.OPERATION_APPROVED
            : auditEngine_1.AuditAction.OPERATION_REJECTED, {
            id: requestId,
            type: 'approval_request',
            classification: request.classification,
            owner: request.requesterId,
        }, {
            operationId: request.operationId,
            businessJustification: comments,
            urgencyLevel: request.urgency,
            riskLevel: request.riskAssessment.overallRisk,
            complianceFramework: ['NIST', 'SOX'],
            tags: ['approval', 'decision', currentStage.name],
        }, {
            result: 'success',
            duration: decisionRecord.reviewDuration,
            dataModified: true,
            recordsAffected: 1,
            complianceStatus: 'compliant',
        });
        if (stageResult.completed) {
            if (stageResult.approved) {
                // Move to next stage or complete approval
                const nextStageResult = await this.advanceToNextStage(request);
                return {
                    success: true,
                    nextStage: nextStageResult.nextStageName,
                    finalDecision: nextStageResult.finalDecision,
                    message: nextStageResult.message,
                };
            }
            else {
                // Stage rejected - reject entire request
                request.status = ApprovalStatus.REJECTED;
                currentStage.status = StageStatus.FAILED;
                currentStage.completedAt = new Date();
                return {
                    success: true,
                    finalDecision: ApprovalStatus.REJECTED,
                    message: 'Approval request rejected',
                };
            }
        }
        return {
            success: true,
            message: `Decision recorded. Stage requires ${currentStage.minimumApprovers - currentStage.decisions.length} more approvals.`,
        };
    }
    /**
     * Get approval request details
     */
    getApprovalRequest(requestId) {
        return this.approvalStore.get(requestId);
    }
    /**
     * Get pending approvals for an approver
     */
    getPendingApprovals(approverId, role, clearance) {
        return Array.from(this.approvalStore.values()).filter((request) => {
            if (request.status !== ApprovalStatus.UNDER_REVIEW) {
                return false;
            }
            const currentStage = request.approvalChain[request.currentStage];
            if (!currentStage || currentStage.status !== StageStatus.IN_PROGRESS) {
                return false;
            }
            // Check if approver is eligible for this stage
            return this.isApproverEligible(approverId, currentStage, role, clearance);
        });
    }
    /**
     * Get approval history for an operation
     */
    getApprovalHistory(operationId) {
        return Array.from(this.approvalStore.values()).filter((request) => request.operationId === operationId);
    }
    /**
     * Withdraw an approval request
     */
    async withdrawApprovalRequest(requestId, requesterId, reason) {
        const request = this.approvalStore.get(requestId);
        if (!request) {
            throw new Error(`Approval request not found: ${requestId}`);
        }
        if (request.requesterId !== requesterId) {
            throw new Error('Only the requester can withdraw the approval request');
        }
        if (request.status === ApprovalStatus.APPROVED ||
            request.status === ApprovalStatus.REJECTED) {
            throw new Error('Cannot withdraw completed approval request');
        }
        request.status = ApprovalStatus.WITHDRAWN;
        // Log withdrawal
        await this.auditEngine.logEntry(this.createAuditActor(requesterId), auditEngine_1.AuditAction.DELETE, {
            id: requestId,
            type: 'approval_request',
            classification: request.classification,
            owner: requesterId,
        }, {
            operationId: request.operationId,
            businessJustification: reason,
            urgencyLevel: request.urgency,
            riskLevel: request.riskAssessment.overallRisk,
            complianceFramework: ['NIST', 'SOX'],
            tags: ['approval', 'withdrawal'],
        }, {
            result: 'success',
            duration: 0,
            dataModified: true,
            recordsAffected: 1,
            complianceStatus: 'compliant',
        });
    }
    /**
     * Delegate approval to another approver
     */
    async delegateApproval(requestId, fromApproverId, toApproverId, reason) {
        if (!this.config.enableDelegation) {
            throw new Error('Delegation is not enabled');
        }
        const request = this.approvalStore.get(requestId);
        if (!request) {
            throw new Error(`Approval request not found: ${requestId}`);
        }
        const currentStage = request.approvalChain[request.currentStage];
        if (!currentStage.allowDelegation) {
            throw new Error('Delegation not allowed for this stage');
        }
        // Validate both approvers
        await this.validateApproverAuthorization(fromApproverId, currentStage);
        await this.validateApproverAuthorization(toApproverId, currentStage);
        // Add delegate to stage
        if (!currentStage.alternateApprovers) {
            currentStage.alternateApprovers = [];
        }
        currentStage.alternateApprovers.push(toApproverId);
        // Log delegation
        await this.auditEngine.logEntry(this.createAuditActor(fromApproverId), auditEngine_1.AuditAction.ROLE_ASSUMED, {
            id: requestId,
            type: 'approval_request',
            classification: request.classification,
            owner: request.requesterId,
        }, {
            operationId: request.operationId,
            businessJustification: reason,
            urgencyLevel: request.urgency,
            riskLevel: request.riskAssessment.overallRisk,
            complianceFramework: ['NIST', 'SOX'],
            tags: ['approval', 'delegation'],
        }, {
            result: 'success',
            duration: 0,
            dataModified: true,
            recordsAffected: 1,
            complianceStatus: 'compliant',
        });
    }
    /**
     * Generate approval statistics
     */
    getApprovalStatistics(timeRange) {
        let requests = Array.from(this.approvalStore.values());
        if (timeRange) {
            requests = requests.filter((r) => r.submittedAt >= timeRange.start && r.submittedAt <= timeRange.end);
        }
        const totalRequests = requests.length;
        const approved = requests.filter((r) => r.status === ApprovalStatus.APPROVED).length;
        const rejected = requests.filter((r) => r.status === ApprovalStatus.REJECTED).length;
        const pending = requests.filter((r) => r.status === ApprovalStatus.UNDER_REVIEW).length;
        // Calculate average approval time
        const completedRequests = requests.filter((r) => r.status === ApprovalStatus.APPROVED ||
            r.status === ApprovalStatus.REJECTED);
        const totalApprovalTime = completedRequests.reduce((sum, request) => {
            const completedStage = request.approvalChain.find((s) => s.completedAt);
            if (completedStage) {
                return (sum +
                    (completedStage.completedAt.getTime() -
                        request.submittedAt.getTime()));
            }
            return sum;
        }, 0);
        const averageApprovalTime = completedRequests.length > 0
            ? totalApprovalTime / completedRequests.length / (1000 * 60)
            : 0; // minutes
        const approvalRate = totalRequests > 0 ? approved / totalRequests : 0;
        // Stage statistics
        const stageStatistics = this.calculateStageStatistics(requests);
        return {
            totalRequests,
            approved,
            rejected,
            pending,
            averageApprovalTime,
            approvalRate,
            stageStatistics,
        };
    }
    // Private helper methods
    initializeWorkflowTemplates() {
        // Standard workflow template
        const standardWorkflow = [
            {
                id: 'technical_review',
                name: 'Technical Review',
                description: 'Technical feasibility and implementation review',
                stageType: ApprovalStageType.TECHNICAL_REVIEW,
                sequence: 1,
                requiredRole: auditEngine_1.UserRole.ANALYST,
                requiredClearance: auditEngine_1.ClassificationLevel.SECRET,
                minimumApprovers: 1,
                maximumDissent: 0,
                timeoutMinutes: 480, // 8 hours
                allowDelegation: true,
                requireUniqueApprover: true,
                conditions: [],
                triggers: [],
                decisions: [],
                status: StageStatus.PENDING,
            },
            {
                id: 'risk_assessment',
                name: 'Risk Assessment',
                description: 'Comprehensive risk evaluation',
                stageType: ApprovalStageType.RISK_ASSESSMENT,
                sequence: 2,
                requiredRole: auditEngine_1.UserRole.SUPERVISOR,
                requiredClearance: auditEngine_1.ClassificationLevel.SECRET,
                minimumApprovers: 1,
                maximumDissent: 0,
                timeoutMinutes: 720, // 12 hours
                allowDelegation: true,
                requireUniqueApprover: true,
                conditions: [],
                triggers: [],
                decisions: [],
                status: StageStatus.PENDING,
            },
            {
                id: 'legal_review',
                name: 'Legal Review',
                description: 'Legal compliance and risk assessment',
                stageType: ApprovalStageType.LEGAL_REVIEW,
                sequence: 3,
                requiredRole: auditEngine_1.UserRole.ADMINISTRATOR,
                requiredClearance: auditEngine_1.ClassificationLevel.TOP_SECRET,
                minimumApprovers: 1,
                maximumDissent: 0,
                timeoutMinutes: 1440, // 24 hours
                allowDelegation: false,
                requireUniqueApprover: true,
                conditions: [],
                triggers: [],
                decisions: [],
                status: StageStatus.PENDING,
            },
            {
                id: 'final_authorization',
                name: 'Final Authorization',
                description: 'Senior leadership final approval',
                stageType: ApprovalStageType.FINAL_AUTHORIZATION,
                sequence: 4,
                requiredRole: auditEngine_1.UserRole.APPROVER,
                requiredClearance: auditEngine_1.ClassificationLevel.TOP_SECRET,
                minimumApprovers: 1,
                maximumDissent: 0,
                timeoutMinutes: 2880, // 48 hours
                allowDelegation: false,
                requireUniqueApprover: true,
                conditions: [],
                triggers: [],
                decisions: [],
                status: StageStatus.PENDING,
            },
        ];
        this.workflowTemplates.set('standard', standardWorkflow);
    }
    generateRequestId() {
        return `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateDecisionId() {
        return `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateCorrelationId() {
        return `corr_${Math.random().toString(36).substr(2, 16)}`;
    }
    validateApprovalRequest(request) {
        if (!request.title || !request.description || !request.justification) {
            throw new Error('Missing required fields: title, description, or justification');
        }
        if (request.proposedMeasures.length === 0) {
            throw new Error('At least one proposed measure is required');
        }
        if (request.approvalChain.length === 0) {
            throw new Error('Approval chain cannot be empty');
        }
    }
    generateApprovalChain(requestDetails) {
        // Use standard workflow template by default
        const template = this.workflowTemplates.get('standard');
        // Clone template and customize based on request details
        return template.map((stage) => ({
            ...stage,
            id: `${stage.id}_${Date.now()}`,
            conditions: this.generateStageConditions(stage, requestDetails),
            triggers: this.generateStageTriggers(stage, requestDetails),
        }));
    }
    generateStageConditions(stage, requestDetails) {
        const conditions = [];
        // Add classification-based conditions
        if (requestDetails.classification === auditEngine_1.ClassificationLevel.TOP_SECRET) {
            conditions.push({
                id: 'ts_clearance_required',
                type: ConditionType.CLASSIFICATION_LEVEL,
                description: 'TOP SECRET clearance required',
                parameters: { requiredClearance: auditEngine_1.ClassificationLevel.TOP_SECRET },
                mandatory: true,
                autoEvaluate: true,
            });
        }
        // Add risk-based conditions
        if (requestDetails.riskAssessment?.overallRisk === RiskLevel.HIGH ||
            requestDetails.riskAssessment?.overallRisk === RiskLevel.CRITICAL) {
            conditions.push({
                id: 'high_risk_review',
                type: ConditionType.RISK_THRESHOLD,
                description: 'Additional review required for high-risk operations',
                parameters: { maxRiskLevel: RiskLevel.MODERATE },
                mandatory: true,
                autoEvaluate: false,
            });
        }
        return conditions;
    }
    generateStageTriggers(stage, requestDetails) {
        const triggers = [];
        // Add timeout trigger
        if (stage.timeoutMinutes) {
            triggers.push({
                id: 'timeout_escalation',
                type: TriggerType.TIME_BASED,
                condition: `timeout_minutes > ${stage.timeoutMinutes}`,
                action: TriggerAction.ESCALATE,
                parameters: { timeoutMinutes: stage.timeoutMinutes },
            });
        }
        // Add urgency-based triggers
        if (requestDetails.urgency === UrgencyLevel.CRITICAL ||
            requestDetails.urgency === UrgencyLevel.EMERGENCY) {
            triggers.push({
                id: 'urgency_notification',
                type: TriggerType.EVENT_BASED,
                condition: 'stage_started',
                action: TriggerAction.NOTIFY,
                parameters: { notificationLevel: 'immediate' },
            });
        }
        return triggers;
    }
    createDefaultTargetProfile() {
        return {
            entityTypes: ['organization'],
            geographicalScope: ['unknown'],
            demographicProfiles: ['general_population'],
            psychographicProfiles: ['general'],
            estimatedReach: 1000,
            civilianProximity: 0.1,
        };
    }
    createDefaultImpactAssessment() {
        return {
            primaryEffects: [],
            secondaryEffects: [],
            unintendedConsequences: [],
            cascadeEffects: [],
            temporalAnalysis: {
                shortTerm: [],
                mediumTerm: [],
                longTerm: [],
                permanentEffects: [],
            },
            geopoliticalImplications: [],
        };
    }
    createDefaultRiskAssessment() {
        return {
            overallRisk: RiskLevel.MODERATE,
            riskCategories: [],
            mitigationStrategies: [],
            residualRisk: RiskLevel.LOW,
            contingencyPlans: [],
            monitoringPlan: {
                indicators: [],
                frequency: 'daily',
                responsible: 'system',
                escalationThresholds: [],
                reportingSchedule: 'weekly',
            },
        };
    }
    createDefaultLegalReview() {
        return {
            reviewerId: 'system',
            reviewDate: new Date(),
            legalFramework: [],
            complianceStatus: ComplianceStatus.UNDER_REVIEW,
            legalRisks: [],
            recommendations: [],
            approvalRequired: true,
        };
    }
    createDefaultEthicalReview() {
        return {
            reviewerId: 'system',
            reviewDate: new Date(),
            ethicalFramework: [],
            principlesApplied: [],
            ethicalConcerns: [],
            recommendations: [],
            ethicalScore: 0.5,
        };
    }
    async startApprovalWorkflow(requestId) {
        const request = this.approvalStore.get(requestId);
        // Start first stage
        if (request.approvalChain.length > 0) {
            request.status = ApprovalStatus.UNDER_REVIEW;
            request.approvalChain[0].status = StageStatus.IN_PROGRESS;
            request.approvalChain[0].startedAt = new Date();
        }
    }
    async validateApproverAuthorization(approverId, stage) {
        // In a real implementation, this would check against user database
        // For now, we'll do basic validation
        if (stage.specificApprovers &&
            !stage.specificApprovers.includes(approverId)) {
            throw new Error('Approver not authorized for this stage');
        }
        // Check for unique approver requirement
        if (stage.requireUniqueApprover) {
            const existingDecision = stage.decisions.find((d) => d.approverId === approverId);
            if (existingDecision) {
                throw new Error('Approver has already made a decision for this stage');
            }
        }
    }
    calculateReviewDuration(startTime) {
        return (Date.now() - startTime.getTime()) / (1000 * 60); // minutes
    }
    async generateCryptographicSignature(decision, approverId) {
        const data = `${decision}:${approverId}:${Date.now()}`;
        return Buffer.from(data).toString('base64');
    }
    async evaluateStageCompletion(stage) {
        const approvals = stage.decisions.filter((d) => d.decision === DecisionType.APPROVE).length;
        const rejections = stage.decisions.filter((d) => d.decision === DecisionType.REJECT).length;
        // Check if minimum approvals met
        if (approvals >= stage.minimumApprovers) {
            stage.status = StageStatus.COMPLETED;
            stage.completedAt = new Date();
            return {
                completed: true,
                approved: true,
                reason: 'Minimum approvals reached',
            };
        }
        // Check if maximum dissent exceeded
        if (rejections > stage.maximumDissent) {
            stage.status = StageStatus.FAILED;
            stage.completedAt = new Date();
            return {
                completed: true,
                approved: false,
                reason: 'Maximum dissent exceeded',
            };
        }
        return {
            completed: false,
            approved: false,
            reason: 'Waiting for more decisions',
        };
    }
    async advanceToNextStage(request) {
        request.currentStage++;
        if (request.currentStage >= request.approvalChain.length) {
            // All stages completed - approve request
            request.status = ApprovalStatus.APPROVED;
            return {
                finalDecision: ApprovalStatus.APPROVED,
                message: 'Approval request fully approved',
            };
        }
        // Start next stage
        const nextStage = request.approvalChain[request.currentStage];
        nextStage.status = StageStatus.IN_PROGRESS;
        nextStage.startedAt = new Date();
        return {
            nextStageName: nextStage.name,
            message: `Advanced to stage: ${nextStage.name}`,
        };
    }
    isApproverEligible(approverId, stage, role, clearance) {
        // Check specific approvers
        if (stage.specificApprovers &&
            !stage.specificApprovers.includes(approverId)) {
            return false;
        }
        // Check alternate approvers
        if (stage.alternateApprovers &&
            !stage.alternateApprovers.includes(approverId)) {
            return false;
        }
        // Check role requirement
        if (role && stage.requiredRole && role !== stage.requiredRole) {
            return false;
        }
        // Check clearance requirement
        if (clearance && stage.requiredClearance) {
            const clearanceLevels = [
                auditEngine_1.ClassificationLevel.UNCLASSIFIED,
                auditEngine_1.ClassificationLevel.CONFIDENTIAL,
                auditEngine_1.ClassificationLevel.SECRET,
                auditEngine_1.ClassificationLevel.TOP_SECRET,
                auditEngine_1.ClassificationLevel.SCI,
                auditEngine_1.ClassificationLevel.SAP,
            ];
            const requiredIndex = clearanceLevels.indexOf(stage.requiredClearance);
            const userIndex = clearanceLevels.indexOf(clearance);
            if (userIndex < requiredIndex) {
                return false;
            }
        }
        return true;
    }
    calculateStageStatistics(requests) {
        const stageStats = new Map();
        requests.forEach((request) => {
            request.approvalChain.forEach((stage) => {
                if (stage.status === StageStatus.COMPLETED ||
                    stage.status === StageStatus.FAILED) {
                    const key = stage.name;
                    const existing = stageStats.get(key) || {
                        totalTime: 0,
                        count: 0,
                        rejections: 0,
                    };
                    if (stage.startedAt && stage.completedAt) {
                        existing.totalTime +=
                            stage.completedAt.getTime() - stage.startedAt.getTime();
                        existing.count++;
                        if (stage.status === StageStatus.FAILED) {
                            existing.rejections++;
                        }
                    }
                    stageStats.set(key, existing);
                }
            });
        });
        return Array.from(stageStats.entries()).map(([stage, stats]) => ({
            stage,
            averageTime: stats.count > 0 ? stats.totalTime / stats.count / (1000 * 60) : 0, // minutes
            rejectionRate: stats.count > 0 ? stats.rejections / stats.count : 0,
        }));
    }
    createAuditActor(userId) {
        return {
            id: userId,
            type: 'human_operator',
            name: userId,
            role: auditEngine_1.UserRole.OPERATOR,
            clearanceLevel: auditEngine_1.ClassificationLevel.SECRET,
            authentication: {
                method: 'password',
                strength: 0.8,
                mfaUsed: false,
                certificateUsed: false,
                biometricUsed: false,
            },
        };
    }
}
exports.ApprovalEngine = ApprovalEngine;
