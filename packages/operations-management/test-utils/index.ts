/**
 * Test Utilities and Mock Data Generators
 *
 * Utilities for testing and demonstrating the Operations Management package.
 */

import type {
  MissionPlan,
  IntelligenceRequirement,
  OperationWorkflow,
  AfterActionReview,
  WorkflowStep
} from '../src/index.js';

/**
 * Generate a mock mission plan
 */
export function createMockMission(overrides?: Partial<MissionPlan>): MissionPlan {
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return {
    id: `mission-${Date.now()}`,
    operationId: `op-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Operation',
    codeName: 'TESTOP',
    classification: 'SECRET',
    type: 'COLLECTION',
    objective: 'Test intelligence collection operation',
    background: 'Testing environment',
    priority: 'MEDIUM',
    status: 'PLANNING',

    planningTeam: [
      {
        userId: 'user-001',
        role: 'Mission Commander',
        clearanceLevel: 'SECRET'
      }
    ],

    requirements: [],

    collectionPlan: {
      assets: [],
      platforms: [],
      sensors: [],
      timelines: [],
      deconflictions: []
    },

    resources: {
      personnel: [],
      budget: {
        allocated: 100000,
        spent: 0,
        currency: 'USD'
      },
      equipment: []
    },

    timeline: {
      startDate: now,
      endDate: future,
      milestones: [
        {
          id: 'milestone-1',
          name: 'Planning Complete',
          description: 'Initial planning phase',
          dueDate: now,
          completed: false,
          dependencies: []
        }
      ]
    },

    risks: [],

    compliance: {
      legalAuthority: [],
      policyReferences: [],
      approvals: [],
      restrictions: [],
      reviewDates: []
    },

    opsec: {
      criticalInformation: [],
      indicators: [],
      threats: [],
      vulnerabilities: [],
      countermeasures: []
    },

    contingencies: [],

    createdAt: now,
    updatedAt: now,
    createdBy: 'test-user',
    metadata: {},

    ...overrides
  };
}

/**
 * Generate a mock intelligence requirement
 */
export function createMockRequirement(
  operationId: string,
  overrides?: Partial<IntelligenceRequirement>
): IntelligenceRequirement {
  return {
    id: `req-${Date.now()}`,
    operationId,
    priority: 'HIGH',
    type: 'ESSENTIAL_ELEMENT',
    description: 'Test intelligence requirement',
    rationale: 'Testing purposes',
    targetLocation: {
      lat: 35.0,
      lon: 45.0,
      radius: 10,
      name: 'Test Area'
    },
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    collectionGuidance: 'Multi-INT collection',
    disseminationRestrictions: [],
    relatedRequirements: [],
    metadata: {},

    ...overrides
  };
}

/**
 * Generate a mock workflow
 */
export function createMockWorkflow(
  operationId: string,
  overrides?: Partial<OperationWorkflow>
): OperationWorkflow {
  const steps: WorkflowStep[] = [
    {
      id: 'step-1',
      name: 'Planning',
      type: 'EXECUTION',
      status: 'IN_PROGRESS',
      assignedTo: ['user-001'],
      requiredApprovals: 0,
      approvals: [],
      dependencies: [],
      metadata: {}
    },
    {
      id: 'step-2',
      name: 'Review',
      type: 'REVIEW',
      status: 'PENDING',
      assignedTo: ['user-002'],
      requiredApprovals: 1,
      approvals: [],
      dependencies: ['step-1'],
      metadata: {}
    },
    {
      id: 'step-3',
      name: 'Approval',
      type: 'APPROVAL',
      status: 'PENDING',
      assignedTo: ['user-003'],
      requiredApprovals: 1,
      approvals: [],
      dependencies: ['step-2'],
      metadata: {}
    }
  ];

  return {
    id: `workflow-${Date.now()}`,
    operationId,
    type: 'MISSION_PLANNING',
    steps,
    currentStep: 'step-1',
    status: 'ACTIVE',
    startedAt: new Date().toISOString(),
    metadata: {},

    ...overrides
  };
}

/**
 * Generate a mock after-action review
 */
export function createMockAAR(
  operationId: string,
  missionPlanId: string,
  overrides?: Partial<AfterActionReview>
): AfterActionReview {
  return {
    id: `aar-${Date.now()}`,
    operationId,
    missionPlanId,

    execution: {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      actualDuration: 168,
      plannedDuration: 168,
      objectives: [
        {
          objective: 'Complete intelligence collection',
          achieved: true,
          percentComplete: 100,
          notes: 'All objectives met'
        }
      ]
    },

    performance: {
      overall: 'GOOD',
      collection: {
        rating: 'GOOD',
        coverageAchieved: 95,
        qualityScore: 85,
        timeliness: 'ON_TIME'
      },
      analysis: {
        rating: 'GOOD',
        accuracy: 90,
        depth: 'ADEQUATE',
        timelyDelivery: true
      },
      dissemination: {
        rating: 'GOOD',
        reach: 10,
        timeliness: 'ON_TIME',
        feedback: ['Positive feedback from consumers']
      }
    },

    lessonsLearned: [
      {
        category: 'COLLECTION',
        observation: 'Asset coordination worked well',
        impact: 'POSITIVE',
        recommendation: 'Continue current coordination procedures',
        priority: 'LOW',
        actionable: false
      }
    ],

    issues: [],

    recommendations: [
      {
        area: 'Planning',
        recommendation: 'Increase planning time for complex operations',
        priority: 'MEDIUM',
        implementationCost: 'LOW',
        expectedBenefit: 'Better preparation and coordination',
        timeline: '30 days'
      }
    ],

    participants: [
      {
        userId: 'user-001',
        role: 'Mission Commander',
        contribution: 'Led mission planning and execution'
      }
    ],

    reviewedBy: 'user-001',
    reviewDate: new Date().toISOString(),
    approved: true,
    metadata: {},

    ...overrides
  };
}

/**
 * Generate multiple mock missions
 */
export function createMockMissions(count: number): MissionPlan[] {
  const missions: MissionPlan[] = [];
  const types = ['RECONNAISSANCE', 'SURVEILLANCE', 'TARGETING', 'COLLECTION', 'ANALYSIS'];
  const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const statuses = ['PLANNING', 'APPROVED', 'ACTIVE', 'COMPLETED'];

  for (let i = 0; i < count; i++) {
    missions.push(
      createMockMission({
        name: `Test Mission ${i + 1}`,
        type: types[i % types.length] as any,
        priority: priorities[i % priorities.length] as any,
        status: statuses[i % statuses.length] as any
      })
    );
  }

  return missions;
}

/**
 * Generate a complete mission with all components
 */
export function createCompleteMockMission(): {
  mission: MissionPlan;
  requirements: IntelligenceRequirement[];
  workflow: OperationWorkflow;
} {
  const mission = createMockMission({
    name: 'Complete Test Mission',
    priority: 'HIGH',
    status: 'ACTIVE'
  });

  const requirements = [
    createMockRequirement(mission.operationId, {
      priority: 'CRITICAL',
      description: 'Identify target locations'
    }),
    createMockRequirement(mission.operationId, {
      priority: 'HIGH',
      description: 'Assess target capabilities'
    })
  ];

  mission.requirements = requirements;

  const workflow = createMockWorkflow(mission.operationId);

  return {
    mission,
    requirements,
    workflow
  };
}

/**
 * Test data scenarios
 */
export const TestScenarios = {
  /**
   * High priority active mission
   */
  activeMission: () =>
    createMockMission({
      name: 'Active High Priority Mission',
      priority: 'HIGH',
      status: 'ACTIVE'
    }),

  /**
   * Planning phase mission
   */
  planningMission: () =>
    createMockMission({
      name: 'Planning Phase Mission',
      priority: 'MEDIUM',
      status: 'PLANNING'
    }),

  /**
   * Completed mission
   */
  completedMission: () =>
    createMockMission({
      name: 'Completed Mission',
      priority: 'HIGH',
      status: 'COMPLETED'
    }),

  /**
   * Mission with high risks
   */
  highRiskMission: () =>
    createMockMission({
      name: 'High Risk Mission',
      priority: 'CRITICAL',
      status: 'PLANNING',
      risks: [
        {
          id: 'risk-1',
          category: 'OPERATIONAL',
          description: 'High probability of detection',
          likelihood: 'HIGH',
          impact: 'CRITICAL',
          mitigation: 'Use standoff collection',
          contingency: 'Abort if detected',
          owner: 'user-001',
          status: 'IDENTIFIED'
        }
      ]
    }),

  /**
   * Mission with multiple requirements
   */
  complexMission: () => {
    const mission = createMockMission({
      name: 'Complex Multi-INT Mission',
      priority: 'HIGH',
      type: 'MULTI_DISCIPLINE'
    });

    mission.requirements = [
      createMockRequirement(mission.operationId, {
        type: 'ESSENTIAL_ELEMENT',
        priority: 'CRITICAL'
      }),
      createMockRequirement(mission.operationId, {
        type: 'PRIORITY_REQUIREMENT',
        priority: 'HIGH'
      }),
      createMockRequirement(mission.operationId, {
        type: 'SUPPORTING_REQUIREMENT',
        priority: 'MEDIUM'
      })
    ];

    return mission;
  }
};

/**
 * Assertion helpers for testing
 */
export const TestAssertions = {
  /**
   * Assert mission is valid
   */
  assertValidMission(mission: MissionPlan): void {
    if (!mission.id) throw new Error('Mission must have ID');
    if (!mission.name) throw new Error('Mission must have name');
    if (!mission.operationId) throw new Error('Mission must have operation ID');
    if (!mission.timeline) throw new Error('Mission must have timeline');
    if (new Date(mission.timeline.startDate) > new Date(mission.timeline.endDate)) {
      throw new Error('Mission start date must be before end date');
    }
  },

  /**
   * Assert requirement is valid
   */
  assertValidRequirement(req: IntelligenceRequirement): void {
    if (!req.id) throw new Error('Requirement must have ID');
    if (!req.operationId) throw new Error('Requirement must have operation ID');
    if (!req.description) throw new Error('Requirement must have description');
    if (!req.deadline) throw new Error('Requirement must have deadline');
  },

  /**
   * Assert workflow is valid
   */
  assertValidWorkflow(workflow: OperationWorkflow): void {
    if (!workflow.id) throw new Error('Workflow must have ID');
    if (!workflow.operationId) throw new Error('Workflow must have operation ID');
    if (!workflow.steps || workflow.steps.length === 0) {
      throw new Error('Workflow must have steps');
    }
    if (!workflow.currentStep) throw new Error('Workflow must have current step');
  }
};

/**
 * Performance test helpers
 */
export const PerformanceTests = {
  /**
   * Time a function execution
   */
  async timeExecution<T>(fn: () => T | Promise<T>, label?: string): Promise<{ result: T; time: number }> {
    const start = performance.now();
    const result = await fn();
    const time = performance.now() - start;

    if (label) {
      console.log(`${label}: ${time.toFixed(2)}ms`);
    }

    return { result, time };
  },

  /**
   * Test bulk mission creation performance
   */
  async testBulkCreation(count: number): Promise<number> {
    const { time } = await this.timeExecution(
      () => createMockMissions(count),
      `Creating ${count} missions`
    );
    return time;
  }
};

// Export all utilities
export default {
  createMockMission,
  createMockRequirement,
  createMockWorkflow,
  createMockAAR,
  createMockMissions,
  createCompleteMockMission,
  TestScenarios,
  TestAssertions,
  PerformanceTests
};
