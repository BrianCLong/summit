"use strict";
/**
 * Intelligence Operations Management
 *
 * Comprehensive operations planning, mission management, and workflow coordination
 * for intelligence operations with full lifecycle support.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationsManager = exports.AfterActionReviewSchema = exports.OperationWorkflowSchema = exports.WorkflowStepSchema = exports.MissionPlanSchema = exports.IntelligenceRequirementSchema = exports.OperationTypeSchema = exports.OperationClassificationSchema = exports.OperationPrioritySchema = exports.OperationStatusSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Core Operation Types
// ============================================================================
exports.OperationStatusSchema = zod_1.z.enum([
    'PLANNING',
    'APPROVED',
    'ACTIVE',
    'SUSPENDED',
    'COMPLETED',
    'CANCELLED',
    'FAILED'
]);
exports.OperationPrioritySchema = zod_1.z.enum([
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW',
    'ROUTINE'
]);
exports.OperationClassificationSchema = zod_1.z.enum([
    'UNCLASSIFIED',
    'CONFIDENTIAL',
    'SECRET',
    'TOP_SECRET',
    'TOP_SECRET_SCI'
]);
exports.OperationTypeSchema = zod_1.z.enum([
    'RECONNAISSANCE',
    'SURVEILLANCE',
    'TARGETING',
    'COLLECTION',
    'ANALYSIS',
    'COUNTER_INTELLIGENCE',
    'SPECIAL_OPERATIONS',
    'CYBER_OPERATIONS',
    'MULTI_DISCIPLINE'
]);
// ============================================================================
// Mission Planning
// ============================================================================
exports.IntelligenceRequirementSchema = zod_1.z.object({
    id: zod_1.z.string(),
    operationId: zod_1.z.string(),
    priority: exports.OperationPrioritySchema,
    type: zod_1.z.enum([
        'ESSENTIAL_ELEMENT',
        'PRIORITY_REQUIREMENT',
        'SUPPORTING_REQUIREMENT',
        'STANDING_REQUIREMENT'
    ]),
    description: zod_1.z.string(),
    rationale: zod_1.z.string(),
    targetEntity: zod_1.z.string().optional(),
    targetLocation: zod_1.z.object({
        lat: zod_1.z.number(),
        lon: zod_1.z.number(),
        radius: zod_1.z.number().optional(),
        name: zod_1.z.string().optional()
    }).optional(),
    deadline: zod_1.z.string(),
    status: zod_1.z.enum(['ACTIVE', 'SATISFIED', 'PARTIAL', 'CANCELLED']),
    collectionGuidance: zod_1.z.string(),
    disseminationRestrictions: zod_1.z.array(zod_1.z.string()),
    relatedRequirements: zod_1.z.array(zod_1.z.string()),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
});
exports.MissionPlanSchema = zod_1.z.object({
    id: zod_1.z.string(),
    operationId: zod_1.z.string(),
    name: zod_1.z.string(),
    codeName: zod_1.z.string().optional(),
    classification: exports.OperationClassificationSchema,
    type: exports.OperationTypeSchema,
    objective: zod_1.z.string(),
    background: zod_1.z.string(),
    priority: exports.OperationPrioritySchema,
    status: exports.OperationStatusSchema,
    // Planning details
    planningTeam: zod_1.z.array(zod_1.z.object({
        userId: zod_1.z.string(),
        role: zod_1.z.string(),
        clearanceLevel: zod_1.z.string()
    })),
    // Intelligence requirements
    requirements: zod_1.z.array(exports.IntelligenceRequirementSchema),
    // Collection planning
    collectionPlan: zod_1.z.object({
        assets: zod_1.z.array(zod_1.z.string()),
        platforms: zod_1.z.array(zod_1.z.string()),
        sensors: zod_1.z.array(zod_1.z.string()),
        timelines: zod_1.z.array(zod_1.z.object({
            assetId: zod_1.z.string(),
            startTime: zod_1.z.string(),
            endTime: zod_1.z.string(),
            taskDescription: zod_1.z.string()
        })),
        deconflictions: zod_1.z.array(zod_1.z.object({
            assetId: zod_1.z.string(),
            conflictWith: zod_1.z.string(),
            resolution: zod_1.z.string()
        }))
    }),
    // Resource allocation
    resources: zod_1.z.object({
        personnel: zod_1.z.array(zod_1.z.object({
            userId: zod_1.z.string(),
            role: zod_1.z.string(),
            allocation: zod_1.z.number() // Percentage
        })),
        budget: zod_1.z.object({
            allocated: zod_1.z.number(),
            spent: zod_1.z.number(),
            currency: zod_1.z.string()
        }),
        equipment: zod_1.z.array(zod_1.z.object({
            equipmentId: zod_1.z.string(),
            quantity: zod_1.z.number(),
            status: zod_1.z.string()
        }))
    }),
    // Timeline and milestones
    timeline: zod_1.z.object({
        startDate: zod_1.z.string(),
        endDate: zod_1.z.string(),
        milestones: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
            description: zod_1.z.string(),
            dueDate: zod_1.z.string(),
            completed: zod_1.z.boolean(),
            dependencies: zod_1.z.array(zod_1.z.string())
        }))
    }),
    // Risk management
    risks: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string(),
        category: zod_1.z.enum([
            'OPERATIONAL',
            'SECURITY',
            'TECHNICAL',
            'POLITICAL',
            'LEGAL',
            'ENVIRONMENTAL'
        ]),
        description: zod_1.z.string(),
        likelihood: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        impact: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        mitigation: zod_1.z.string(),
        contingency: zod_1.z.string(),
        owner: zod_1.z.string(),
        status: zod_1.z.enum(['IDENTIFIED', 'MITIGATED', 'ACCEPTED', 'OCCURRED'])
    })),
    // Legal and policy compliance
    compliance: zod_1.z.object({
        legalAuthority: zod_1.z.array(zod_1.z.string()),
        policyReferences: zod_1.z.array(zod_1.z.string()),
        approvals: zod_1.z.array(zod_1.z.object({
            authority: zod_1.z.string(),
            approver: zod_1.z.string(),
            date: zod_1.z.string(),
            conditions: zod_1.z.array(zod_1.z.string())
        })),
        restrictions: zod_1.z.array(zod_1.z.string()),
        reviewDates: zod_1.z.array(zod_1.z.string())
    }),
    // OPSEC
    opsec: zod_1.z.object({
        criticalInformation: zod_1.z.array(zod_1.z.string()),
        indicators: zod_1.z.array(zod_1.z.string()),
        threats: zod_1.z.array(zod_1.z.string()),
        vulnerabilities: zod_1.z.array(zod_1.z.string()),
        countermeasures: zod_1.z.array(zod_1.z.object({
            measure: zod_1.z.string(),
            implementation: zod_1.z.string(),
            responsible: zod_1.z.string()
        })),
        coverPlan: zod_1.z.string().optional()
    }),
    // Contingency planning
    contingencies: zod_1.z.array(zod_1.z.object({
        scenario: zod_1.z.string(),
        triggerConditions: zod_1.z.array(zod_1.z.string()),
        response: zod_1.z.string(),
        resources: zod_1.z.array(zod_1.z.string()),
        decisionAuthority: zod_1.z.string()
    })),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
    createdBy: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
});
// ============================================================================
// Workflow Management
// ============================================================================
exports.WorkflowStepSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum([
        'APPROVAL',
        'REVIEW',
        'EXECUTION',
        'ANALYSIS',
        'COORDINATION',
        'DECISION',
        'NOTIFICATION'
    ]),
    status: zod_1.z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED']),
    assignedTo: zod_1.z.array(zod_1.z.string()),
    requiredApprovals: zod_1.z.number(),
    approvals: zod_1.z.array(zod_1.z.object({
        userId: zod_1.z.string(),
        decision: zod_1.z.enum(['APPROVED', 'REJECTED', 'CONDITIONAL']),
        timestamp: zod_1.z.string(),
        comments: zod_1.z.string()
    })),
    dependencies: zod_1.z.array(zod_1.z.string()),
    deadline: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
});
exports.OperationWorkflowSchema = zod_1.z.object({
    id: zod_1.z.string(),
    operationId: zod_1.z.string(),
    type: zod_1.z.enum([
        'MISSION_PLANNING',
        'APPROVAL_CHAIN',
        'EXECUTION',
        'AFTER_ACTION_REVIEW'
    ]),
    steps: zod_1.z.array(exports.WorkflowStepSchema),
    currentStep: zod_1.z.string(),
    status: zod_1.z.enum(['ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED']),
    startedAt: zod_1.z.string(),
    completedAt: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
});
// ============================================================================
// After Action Review
// ============================================================================
exports.AfterActionReviewSchema = zod_1.z.object({
    id: zod_1.z.string(),
    operationId: zod_1.z.string(),
    missionPlanId: zod_1.z.string(),
    // Execution summary
    execution: zod_1.z.object({
        startDate: zod_1.z.string(),
        endDate: zod_1.z.string(),
        actualDuration: zod_1.z.number(), // hours
        plannedDuration: zod_1.z.number(), // hours
        objectives: zod_1.z.array(zod_1.z.object({
            objective: zod_1.z.string(),
            achieved: zod_1.z.boolean(),
            percentComplete: zod_1.z.number(),
            notes: zod_1.z.string()
        }))
    }),
    // Performance assessment
    performance: zod_1.z.object({
        overall: zod_1.z.enum(['EXCELLENT', 'GOOD', 'SATISFACTORY', 'POOR']),
        collection: zod_1.z.object({
            rating: zod_1.z.enum(['EXCELLENT', 'GOOD', 'SATISFACTORY', 'POOR']),
            coverageAchieved: zod_1.z.number(), // percentage
            qualityScore: zod_1.z.number(), // 0-100
            timeliness: zod_1.z.enum(['ON_TIME', 'DELAYED', 'EARLY'])
        }),
        analysis: zod_1.z.object({
            rating: zod_1.z.enum(['EXCELLENT', 'GOOD', 'SATISFACTORY', 'POOR']),
            accuracy: zod_1.z.number(), // percentage
            depth: zod_1.z.enum(['COMPREHENSIVE', 'ADEQUATE', 'LIMITED']),
            timelyDelivery: zod_1.z.boolean()
        }),
        dissemination: zod_1.z.object({
            rating: zod_1.z.enum(['EXCELLENT', 'GOOD', 'SATISFACTORY', 'POOR']),
            reach: zod_1.z.number(), // number of recipients
            timeliness: zod_1.z.enum(['ON_TIME', 'DELAYED', 'EARLY']),
            feedback: zod_1.z.array(zod_1.z.string())
        })
    }),
    // Lessons learned
    lessonsLearned: zod_1.z.array(zod_1.z.object({
        category: zod_1.z.enum([
            'PLANNING',
            'COLLECTION',
            'ANALYSIS',
            'COORDINATION',
            'TECHNOLOGY',
            'PERSONNEL',
            'PROCEDURES'
        ]),
        observation: zod_1.z.string(),
        impact: zod_1.z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL']),
        recommendation: zod_1.z.string(),
        priority: exports.OperationPrioritySchema,
        actionable: zod_1.z.boolean()
    })),
    // Issues and challenges
    issues: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum([
            'TECHNICAL',
            'OPERATIONAL',
            'COORDINATION',
            'RESOURCE',
            'SECURITY',
            'LEGAL'
        ]),
        description: zod_1.z.string(),
        impact: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        resolution: zod_1.z.string(),
        preventativeMeasures: zod_1.z.array(zod_1.z.string())
    })),
    // Recommendations
    recommendations: zod_1.z.array(zod_1.z.object({
        area: zod_1.z.string(),
        recommendation: zod_1.z.string(),
        priority: exports.OperationPrioritySchema,
        implementationCost: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']),
        expectedBenefit: zod_1.z.string(),
        timeline: zod_1.z.string()
    })),
    // Participants
    participants: zod_1.z.array(zod_1.z.object({
        userId: zod_1.z.string(),
        role: zod_1.z.string(),
        contribution: zod_1.z.string()
    })),
    reviewedBy: zod_1.z.string(),
    reviewDate: zod_1.z.string(),
    approved: zod_1.z.boolean(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown())
});
// ============================================================================
// Operations Management Service
// ============================================================================
class OperationsManager {
    missions = new Map();
    workflows = new Map();
    reviews = new Map();
    /**
     * Create a new mission plan
     */
    createMissionPlan(plan) {
        const validated = exports.MissionPlanSchema.parse(plan);
        this.missions.set(validated.id, validated);
        return validated;
    }
    /**
     * Update mission plan
     */
    updateMissionPlan(id, updates) {
        const existing = this.missions.get(id);
        if (!existing) {
            throw new Error(`Mission plan ${id} not found`);
        }
        const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
        const validated = exports.MissionPlanSchema.parse(updated);
        this.missions.set(id, validated);
        return validated;
    }
    /**
     * Get mission plan by ID
     */
    getMissionPlan(id) {
        return this.missions.get(id);
    }
    /**
     * List all mission plans
     */
    listMissionPlans(filter) {
        let plans = Array.from(this.missions.values());
        if (filter?.status) {
            plans = plans.filter(p => p.status === filter.status);
        }
        if (filter?.type) {
            plans = plans.filter(p => p.type === filter.type);
        }
        if (filter?.priority) {
            plans = plans.filter(p => p.priority === filter.priority);
        }
        return plans;
    }
    /**
     * Create operation workflow
     */
    createWorkflow(workflow) {
        const validated = exports.OperationWorkflowSchema.parse(workflow);
        this.workflows.set(validated.id, validated);
        return validated;
    }
    /**
     * Advance workflow to next step
     */
    advanceWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }
        const currentStepIndex = workflow.steps.findIndex(s => s.id === workflow.currentStep);
        if (currentStepIndex === -1 || currentStepIndex === workflow.steps.length - 1) {
            throw new Error('Cannot advance workflow');
        }
        const nextStep = workflow.steps[currentStepIndex + 1];
        workflow.currentStep = nextStep.id;
        return workflow;
    }
    /**
     * Create after-action review
     */
    createAfterActionReview(review) {
        const validated = exports.AfterActionReviewSchema.parse(review);
        this.reviews.set(validated.id, validated);
        return validated;
    }
    /**
     * Get after-action review
     */
    getAfterActionReview(id) {
        return this.reviews.get(id);
    }
    /**
     * Calculate mission completion percentage
     */
    calculateMissionCompletion(missionId) {
        const mission = this.missions.get(missionId);
        if (!mission) {
            throw new Error(`Mission ${missionId} not found`);
        }
        const totalMilestones = mission.timeline.milestones.length;
        if (totalMilestones === 0) {
            return 0;
        }
        const completedMilestones = mission.timeline.milestones.filter(m => m.completed).length;
        return (completedMilestones / totalMilestones) * 100;
    }
    /**
     * Assess mission risk level
     */
    assessMissionRisk(missionId) {
        const mission = this.missions.get(missionId);
        if (!mission) {
            throw new Error(`Mission ${missionId} not found`);
        }
        const activeRisks = mission.risks.filter(r => r.status === 'IDENTIFIED' || r.status === 'OCCURRED');
        const criticalRisks = activeRisks.filter(r => r.likelihood === 'CRITICAL' || r.impact === 'CRITICAL');
        let overall = 'LOW';
        if (criticalRisks.length > 0) {
            overall = 'CRITICAL';
        }
        else if (activeRisks.length > 5) {
            overall = 'HIGH';
        }
        else if (activeRisks.length > 2) {
            overall = 'MEDIUM';
        }
        return {
            overall,
            activeRisks: activeRisks.length,
            criticalRisks: criticalRisks.length
        };
    }
}
exports.OperationsManager = OperationsManager;
