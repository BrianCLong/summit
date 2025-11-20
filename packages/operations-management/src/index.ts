/**
 * Intelligence Operations Management
 *
 * Comprehensive operations planning, mission management, and workflow coordination
 * for intelligence operations with full lifecycle support.
 */

import { z } from 'zod';

// ============================================================================
// Core Operation Types
// ============================================================================

export const OperationStatusSchema = z.enum([
  'PLANNING',
  'APPROVED',
  'ACTIVE',
  'SUSPENDED',
  'COMPLETED',
  'CANCELLED',
  'FAILED'
]);

export const OperationPrioritySchema = z.enum([
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'ROUTINE'
]);

export const OperationClassificationSchema = z.enum([
  'UNCLASSIFIED',
  'CONFIDENTIAL',
  'SECRET',
  'TOP_SECRET',
  'TOP_SECRET_SCI'
]);

export const OperationTypeSchema = z.enum([
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

export const IntelligenceRequirementSchema = z.object({
  id: z.string(),
  operationId: z.string(),
  priority: OperationPrioritySchema,
  type: z.enum([
    'ESSENTIAL_ELEMENT',
    'PRIORITY_REQUIREMENT',
    'SUPPORTING_REQUIREMENT',
    'STANDING_REQUIREMENT'
  ]),
  description: z.string(),
  rationale: z.string(),
  targetEntity: z.string().optional(),
  targetLocation: z.object({
    lat: z.number(),
    lon: z.number(),
    radius: z.number().optional(),
    name: z.string().optional()
  }).optional(),
  deadline: z.string(),
  status: z.enum(['ACTIVE', 'SATISFIED', 'PARTIAL', 'CANCELLED']),
  collectionGuidance: z.string(),
  disseminationRestrictions: z.array(z.string()),
  relatedRequirements: z.array(z.string()),
  metadata: z.record(z.unknown())
});

export const MissionPlanSchema = z.object({
  id: z.string(),
  operationId: z.string(),
  name: z.string(),
  codeName: z.string().optional(),
  classification: OperationClassificationSchema,
  type: OperationTypeSchema,
  objective: z.string(),
  background: z.string(),
  priority: OperationPrioritySchema,
  status: OperationStatusSchema,

  // Planning details
  planningTeam: z.array(z.object({
    userId: z.string(),
    role: z.string(),
    clearanceLevel: z.string()
  })),

  // Intelligence requirements
  requirements: z.array(IntelligenceRequirementSchema),

  // Collection planning
  collectionPlan: z.object({
    assets: z.array(z.string()),
    platforms: z.array(z.string()),
    sensors: z.array(z.string()),
    timelines: z.array(z.object({
      assetId: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      taskDescription: z.string()
    })),
    deconflictions: z.array(z.object({
      assetId: z.string(),
      conflictWith: z.string(),
      resolution: z.string()
    }))
  }),

  // Resource allocation
  resources: z.object({
    personnel: z.array(z.object({
      userId: z.string(),
      role: z.string(),
      allocation: z.number() // Percentage
    })),
    budget: z.object({
      allocated: z.number(),
      spent: z.number(),
      currency: z.string()
    }),
    equipment: z.array(z.object({
      equipmentId: z.string(),
      quantity: z.number(),
      status: z.string()
    }))
  }),

  // Timeline and milestones
  timeline: z.object({
    startDate: z.string(),
    endDate: z.string(),
    milestones: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      dueDate: z.string(),
      completed: z.boolean(),
      dependencies: z.array(z.string())
    }))
  }),

  // Risk management
  risks: z.array(z.object({
    id: z.string(),
    category: z.enum([
      'OPERATIONAL',
      'SECURITY',
      'TECHNICAL',
      'POLITICAL',
      'LEGAL',
      'ENVIRONMENTAL'
    ]),
    description: z.string(),
    likelihood: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    impact: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    mitigation: z.string(),
    contingency: z.string(),
    owner: z.string(),
    status: z.enum(['IDENTIFIED', 'MITIGATED', 'ACCEPTED', 'OCCURRED'])
  })),

  // Legal and policy compliance
  compliance: z.object({
    legalAuthority: z.array(z.string()),
    policyReferences: z.array(z.string()),
    approvals: z.array(z.object({
      authority: z.string(),
      approver: z.string(),
      date: z.string(),
      conditions: z.array(z.string())
    })),
    restrictions: z.array(z.string()),
    reviewDates: z.array(z.string())
  }),

  // OPSEC
  opsec: z.object({
    criticalInformation: z.array(z.string()),
    indicators: z.array(z.string()),
    threats: z.array(z.string()),
    vulnerabilities: z.array(z.string()),
    countermeasures: z.array(z.object({
      measure: z.string(),
      implementation: z.string(),
      responsible: z.string()
    })),
    coverPlan: z.string().optional()
  }),

  // Contingency planning
  contingencies: z.array(z.object({
    scenario: z.string(),
    triggerConditions: z.array(z.string()),
    response: z.string(),
    resources: z.array(z.string()),
    decisionAuthority: z.string()
  })),

  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
  metadata: z.record(z.unknown())
});

// ============================================================================
// Workflow Management
// ============================================================================

export const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum([
    'APPROVAL',
    'REVIEW',
    'EXECUTION',
    'ANALYSIS',
    'COORDINATION',
    'DECISION',
    'NOTIFICATION'
  ]),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED']),
  assignedTo: z.array(z.string()),
  requiredApprovals: z.number(),
  approvals: z.array(z.object({
    userId: z.string(),
    decision: z.enum(['APPROVED', 'REJECTED', 'CONDITIONAL']),
    timestamp: z.string(),
    comments: z.string()
  })),
  dependencies: z.array(z.string()),
  deadline: z.string().optional(),
  metadata: z.record(z.unknown())
});

export const OperationWorkflowSchema = z.object({
  id: z.string(),
  operationId: z.string(),
  type: z.enum([
    'MISSION_PLANNING',
    'APPROVAL_CHAIN',
    'EXECUTION',
    'AFTER_ACTION_REVIEW'
  ]),
  steps: z.array(WorkflowStepSchema),
  currentStep: z.string(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED']),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  metadata: z.record(z.unknown())
});

// ============================================================================
// After Action Review
// ============================================================================

export const AfterActionReviewSchema = z.object({
  id: z.string(),
  operationId: z.string(),
  missionPlanId: z.string(),

  // Execution summary
  execution: z.object({
    startDate: z.string(),
    endDate: z.string(),
    actualDuration: z.number(), // hours
    plannedDuration: z.number(), // hours
    objectives: z.array(z.object({
      objective: z.string(),
      achieved: z.boolean(),
      percentComplete: z.number(),
      notes: z.string()
    }))
  }),

  // Performance assessment
  performance: z.object({
    overall: z.enum(['EXCELLENT', 'GOOD', 'SATISFACTORY', 'POOR']),
    collection: z.object({
      rating: z.enum(['EXCELLENT', 'GOOD', 'SATISFACTORY', 'POOR']),
      coverageAchieved: z.number(), // percentage
      qualityScore: z.number(), // 0-100
      timeliness: z.enum(['ON_TIME', 'DELAYED', 'EARLY'])
    }),
    analysis: z.object({
      rating: z.enum(['EXCELLENT', 'GOOD', 'SATISFACTORY', 'POOR']),
      accuracy: z.number(), // percentage
      depth: z.enum(['COMPREHENSIVE', 'ADEQUATE', 'LIMITED']),
      timelyDelivery: z.boolean()
    }),
    dissemination: z.object({
      rating: z.enum(['EXCELLENT', 'GOOD', 'SATISFACTORY', 'POOR']),
      reach: z.number(), // number of recipients
      timeliness: z.enum(['ON_TIME', 'DELAYED', 'EARLY']),
      feedback: z.array(z.string())
    })
  }),

  // Lessons learned
  lessonsLearned: z.array(z.object({
    category: z.enum([
      'PLANNING',
      'COLLECTION',
      'ANALYSIS',
      'COORDINATION',
      'TECHNOLOGY',
      'PERSONNEL',
      'PROCEDURES'
    ]),
    observation: z.string(),
    impact: z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL']),
    recommendation: z.string(),
    priority: OperationPrioritySchema,
    actionable: z.boolean()
  })),

  // Issues and challenges
  issues: z.array(z.object({
    type: z.enum([
      'TECHNICAL',
      'OPERATIONAL',
      'COORDINATION',
      'RESOURCE',
      'SECURITY',
      'LEGAL'
    ]),
    description: z.string(),
    impact: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    resolution: z.string(),
    preventativeMeasures: z.array(z.string())
  })),

  // Recommendations
  recommendations: z.array(z.object({
    area: z.string(),
    recommendation: z.string(),
    priority: OperationPrioritySchema,
    implementationCost: z.enum(['LOW', 'MEDIUM', 'HIGH']),
    expectedBenefit: z.string(),
    timeline: z.string()
  })),

  // Participants
  participants: z.array(z.object({
    userId: z.string(),
    role: z.string(),
    contribution: z.string()
  })),

  reviewedBy: z.string(),
  reviewDate: z.string(),
  approved: z.boolean(),
  metadata: z.record(z.unknown())
});

// ============================================================================
// Type Exports
// ============================================================================

export type OperationStatus = z.infer<typeof OperationStatusSchema>;
export type OperationPriority = z.infer<typeof OperationPrioritySchema>;
export type OperationClassification = z.infer<typeof OperationClassificationSchema>;
export type OperationType = z.infer<typeof OperationTypeSchema>;
export type IntelligenceRequirement = z.infer<typeof IntelligenceRequirementSchema>;
export type MissionPlan = z.infer<typeof MissionPlanSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type OperationWorkflow = z.infer<typeof OperationWorkflowSchema>;
export type AfterActionReview = z.infer<typeof AfterActionReviewSchema>;

// ============================================================================
// Operations Management Service
// ============================================================================

export class OperationsManager {
  private missions: Map<string, MissionPlan> = new Map();
  private workflows: Map<string, OperationWorkflow> = new Map();
  private reviews: Map<string, AfterActionReview> = new Map();

  /**
   * Create a new mission plan
   */
  createMissionPlan(plan: MissionPlan): MissionPlan {
    const validated = MissionPlanSchema.parse(plan);
    this.missions.set(validated.id, validated);
    return validated;
  }

  /**
   * Update mission plan
   */
  updateMissionPlan(id: string, updates: Partial<MissionPlan>): MissionPlan {
    const existing = this.missions.get(id);
    if (!existing) {
      throw new Error(`Mission plan ${id} not found`);
    }

    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const validated = MissionPlanSchema.parse(updated);
    this.missions.set(id, validated);
    return validated;
  }

  /**
   * Get mission plan by ID
   */
  getMissionPlan(id: string): MissionPlan | undefined {
    return this.missions.get(id);
  }

  /**
   * List all mission plans
   */
  listMissionPlans(filter?: {
    status?: OperationStatus;
    type?: OperationType;
    priority?: OperationPriority;
  }): MissionPlan[] {
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
  createWorkflow(workflow: OperationWorkflow): OperationWorkflow {
    const validated = OperationWorkflowSchema.parse(workflow);
    this.workflows.set(validated.id, validated);
    return validated;
  }

  /**
   * Advance workflow to next step
   */
  advanceWorkflow(workflowId: string): OperationWorkflow {
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
  createAfterActionReview(review: AfterActionReview): AfterActionReview {
    const validated = AfterActionReviewSchema.parse(review);
    this.reviews.set(validated.id, validated);
    return validated;
  }

  /**
   * Get after-action review
   */
  getAfterActionReview(id: string): AfterActionReview | undefined {
    return this.reviews.get(id);
  }

  /**
   * Calculate mission completion percentage
   */
  calculateMissionCompletion(missionId: string): number {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }

    const totalMilestones = mission.timeline.milestones.length;
    if (totalMilestones === 0) return 0;

    const completedMilestones = mission.timeline.milestones.filter(m => m.completed).length;
    return (completedMilestones / totalMilestones) * 100;
  }

  /**
   * Assess mission risk level
   */
  assessMissionRisk(missionId: string): {
    overall: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    activeRisks: number;
    criticalRisks: number;
  } {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }

    const activeRisks = mission.risks.filter(r =>
      r.status === 'IDENTIFIED' || r.status === 'OCCURRED'
    );

    const criticalRisks = activeRisks.filter(r =>
      r.likelihood === 'CRITICAL' || r.impact === 'CRITICAL'
    );

    let overall: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (criticalRisks.length > 0) {
      overall = 'CRITICAL';
    } else if (activeRisks.length > 5) {
      overall = 'HIGH';
    } else if (activeRisks.length > 2) {
      overall = 'MEDIUM';
    }

    return {
      overall,
      activeRisks: activeRisks.length,
      criticalRisks: criticalRisks.length
    };
  }
}
