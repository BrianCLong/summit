// Agent Timeline and HITL API Routes
import express from 'express';
import { prometheusConductorMetrics } from '../observability/prometheus';

const router = express.Router();

interface AgentStep {
  id: string;
  role: 'planner' | 'critic' | 'executor' | 'human';
  state:
    | 'pending'
    | 'running'
    | 'need_approval'
    | 'approved'
    | 'blocked'
    | 'completed'
    | 'error';
  text: string;
  ts: number;
  metadata?: {
    duration?: number;
    cost?: number;
    confidence?: number;
    tools_used?: string[];
    checkpoint_type?: string;
    user_action?: string;
    edit_history?: Array<{
      timestamp: number;
      original: string;
      edited: string;
      reason?: string;
    }>;
  };
  inputs?: any;
  outputs?: any;
  error?: string;
}

interface HITLCheckpoint {
  id: string;
  stepId: string;
  type: 'approval' | 'validation' | 'safety_check' | 'quality_review';
  description: string;
  requiredRole?: string;
  autoApprove?: boolean;
  timeout?: number;
  metadata?: any;
}

// In-memory storage for demo (in production, use database)
const agentSteps = new Map<string, AgentStep[]>();
const hitlCheckpoints = new Map<string, HITLCheckpoint[]>();

/**
 * GET /api/maestro/v1/runs/:runId/agents/timeline
 * Get agent timeline with HITL checkpoints
 */
router.get('/runs/:runId/agents/timeline', async (req, res) => {
  try {
    const { runId } = req.params;

    // Get or create mock steps for demo
    let steps = agentSteps.get(runId);
    let checkpoints = hitlCheckpoints.get(runId);

    if (!steps) {
      // Generate demo steps
      steps = [
        {
          id: `${runId}-step-1`,
          role: 'planner',
          state: 'completed',
          text: 'I will analyze the security requirements and create a comprehensive threat assessment plan.',
          ts: Date.now() - 300000,
          metadata: {
            duration: 2500,
            cost: 0.012,
            confidence: 0.92,
            tools_used: ['threat_analysis', 'policy_check'],
            checkpoint_type: 'planning',
          },
          inputs: {
            task: 'Security threat assessment',
            requirements: [
              'CIA triad analysis',
              'Risk scoring',
              'Mitigation strategies',
            ],
          },
          outputs: {
            plan: 'Multi-phase security analysis with stakeholder review checkpoints',
          },
        },
        {
          id: `${runId}-step-2`,
          role: 'critic',
          state: 'completed',
          text: 'The plan looks comprehensive. I suggest adding compliance checks for SOC2 and ISO27001 requirements.',
          ts: Date.now() - 240000,
          metadata: {
            duration: 1800,
            cost: 0.008,
            confidence: 0.88,
            tools_used: ['compliance_check', 'risk_assessment'],
            checkpoint_type: 'review',
          },
          inputs: {
            plan_to_review: 'Security analysis plan from planner',
          },
          outputs: {
            feedback: 'Add compliance checks',
            risk_level: 'medium',
          },
        },
        {
          id: `${runId}-step-3`,
          role: 'executor',
          state: 'need_approval',
          text: 'I am about to run vulnerability scans against the production network. This will include:\n\n1. Port scanning on critical infrastructure\n2. Web application security testing\n3. Database penetration testing\n\nThis may impact system performance. Should I proceed?',
          ts: Date.now() - 60000,
          metadata: {
            duration: 0,
            cost: 0.0,
            confidence: 0.95,
            tools_used: ['vulnerability_scanner', 'penetration_testing'],
            checkpoint_type: 'safety_check',
          },
          inputs: {
            target_systems: [
              'web-server-prod',
              'db-cluster-main',
              'api-gateway',
            ],
            scan_intensity: 'aggressive',
          },
        },
      ];

      checkpoints = [
        {
          id: `${runId}-checkpoint-1`,
          stepId: `${runId}-step-3`,
          type: 'safety_check',
          description:
            'High-impact operation requires approval before execution',
          requiredRole: 'security_admin',
          autoApprove: false,
          timeout: 3600000, // 1 hour
          metadata: {
            impact_level: 'high',
            affected_systems: ['production'],
          },
        },
      ];

      agentSteps.set(runId, steps);
      hitlCheckpoints.set(runId, checkpoints);
    }

    prometheusConductorMetrics?.agentTimelineRequests?.inc({
      status: 'success',
    });

    res.json({
      runId,
      steps,
      checkpoints,
      timeline: {
        totalSteps: steps.length,
        pendingApprovals: steps.filter((s) => s.state === 'need_approval')
          .length,
        completed: steps.filter(
          (s) => s.state === 'completed' || s.state === 'approved',
        ).length,
        blocked: steps.filter((s) => s.state === 'blocked').length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    prometheusConductorMetrics?.agentTimelineRequests?.inc({ status: 'error' });

    console.error('Agent timeline fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch agent timeline',
      code: 'TIMELINE_FETCH_FAILED',
      message: error.message,
    });
  }
});

/**
 * POST /api/maestro/v1/runs/:runId/hitl/:checkpointId/approve
 * Approve HITL checkpoint
 */
router.post('/runs/:runId/hitl/:checkpointId/approve', async (req, res) => {
  try {
    const { runId, checkpointId } = req.params;
    const { patch, reason } = req.body;

    const steps = agentSteps.get(runId) || [];
    const stepIndex = steps.findIndex(
      (s) =>
        s.id === checkpointId ||
        hitlCheckpoints.get(runId)?.find((c) => c.id === checkpointId)
          ?.stepId === s.id,
    );

    if (stepIndex === -1) {
      return res.status(404).json({
        error: 'Step not found',
        code: 'STEP_NOT_FOUND',
        checkpointId,
      });
    }

    const step = steps[stepIndex];
    const originalText = step.text;

    // Update step
    steps[stepIndex] = {
      ...step,
      state: 'approved',
      text: patch || step.text,
      metadata: {
        ...step.metadata,
        user_action: 'approve',
        edit_history:
          patch && patch !== originalText
            ? [
                ...(step.metadata?.edit_history || []),
                {
                  timestamp: Date.now(),
                  original: originalText,
                  edited: patch,
                  reason,
                },
              ]
            : step.metadata?.edit_history,
      },
    };

    agentSteps.set(runId, steps);

    prometheusConductorMetrics?.hitlActionRequests?.inc({
      status: 'success',
      action: 'approve',
    });

    res.json({
      success: true,
      stepId: step.id,
      action: 'approve',
      updatedStep: steps[stepIndex],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    prometheusConductorMetrics?.hitlActionRequests?.inc({
      status: 'error',
      action: 'approve',
    });

    console.error('HITL approve error:', error);
    res.status(500).json({
      error: 'Failed to approve checkpoint',
      code: 'APPROVAL_FAILED',
      message: error.message,
    });
  }
});

/**
 * POST /api/maestro/v1/runs/:runId/hitl/:checkpointId/block
 * Block HITL checkpoint
 */
router.post('/runs/:runId/hitl/:checkpointId/block', async (req, res) => {
  try {
    const { runId, checkpointId } = req.params;
    const { reason } = req.body;

    const steps = agentSteps.get(runId) || [];
    const stepIndex = steps.findIndex(
      (s) =>
        s.id === checkpointId ||
        hitlCheckpoints.get(runId)?.find((c) => c.id === checkpointId)
          ?.stepId === s.id,
    );

    if (stepIndex === -1) {
      return res.status(404).json({
        error: 'Step not found',
        code: 'STEP_NOT_FOUND',
        checkpointId,
      });
    }

    const step = steps[stepIndex];

    // Update step
    steps[stepIndex] = {
      ...step,
      state: 'blocked',
      metadata: {
        ...step.metadata,
        user_action: 'block',
        block_reason: reason,
      },
    };

    agentSteps.set(runId, steps);

    prometheusConductorMetrics?.hitlActionRequests?.inc({
      status: 'success',
      action: 'block',
    });

    res.json({
      success: true,
      stepId: step.id,
      action: 'block',
      reason,
      updatedStep: steps[stepIndex],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    prometheusConductorMetrics?.hitlActionRequests?.inc({
      status: 'error',
      action: 'block',
    });

    console.error('HITL block error:', error);
    res.status(500).json({
      error: 'Failed to block checkpoint',
      code: 'BLOCK_FAILED',
      message: error.message,
    });
  }
});

/**
 * POST /api/maestro/v1/runs/:runId/hitl/:checkpointId/edit
 * Edit and approve HITL checkpoint
 */
router.post('/runs/:runId/hitl/:checkpointId/edit', async (req, res) => {
  try {
    const { runId, checkpointId } = req.params;
    const { patch, reason } = req.body;

    if (!patch) {
      return res.status(400).json({
        error: 'patch is required for edit action',
        code: 'MISSING_PATCH',
      });
    }

    const steps = agentSteps.get(runId) || [];
    const stepIndex = steps.findIndex(
      (s) =>
        s.id === checkpointId ||
        hitlCheckpoints.get(runId)?.find((c) => c.id === checkpointId)
          ?.stepId === s.id,
    );

    if (stepIndex === -1) {
      return res.status(404).json({
        error: 'Step not found',
        code: 'STEP_NOT_FOUND',
        checkpointId,
      });
    }

    const step = steps[stepIndex];
    const originalText = step.text;

    // Update step with edit
    steps[stepIndex] = {
      ...step,
      state: 'approved',
      text: patch,
      metadata: {
        ...step.metadata,
        user_action: 'edit_approve',
        edit_history: [
          ...(step.metadata?.edit_history || []),
          {
            timestamp: Date.now(),
            original: originalText,
            edited: patch,
            reason: reason || 'User edited and approved',
          },
        ],
      },
    };

    agentSteps.set(runId, steps);

    prometheusConductorMetrics?.hitlActionRequests?.inc({
      status: 'success',
      action: 'edit',
    });

    res.json({
      success: true,
      stepId: step.id,
      action: 'edit_approve',
      changes: {
        original: originalText,
        edited: patch,
        reason,
      },
      updatedStep: steps[stepIndex],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    prometheusConductorMetrics?.hitlActionRequests?.inc({
      status: 'error',
      action: 'edit',
    });

    console.error('HITL edit error:', error);
    res.status(500).json({
      error: 'Failed to edit checkpoint',
      code: 'EDIT_FAILED',
      message: error.message,
    });
  }
});

/**
 * GET /api/maestro/v1/runs/:runId/hitl/pending
 * Get all pending HITL checkpoints
 */
router.get('/runs/:runId/hitl/pending', async (req, res) => {
  try {
    const { runId } = req.params;

    const steps = agentSteps.get(runId) || [];
    const checkpoints = hitlCheckpoints.get(runId) || [];

    const pendingSteps = steps.filter((s) => s.state === 'need_approval');
    const pendingCheckpoints = checkpoints.filter((c) =>
      pendingSteps.some((s) => s.id === c.stepId),
    );

    res.json({
      runId,
      pendingSteps,
      pendingCheckpoints,
      count: pendingSteps.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pending HITL fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch pending checkpoints',
      code: 'PENDING_FETCH_FAILED',
      message: error.message,
    });
  }
});

/**
 * POST /api/maestro/v1/runs/:runId/agents/simulate
 * Simulate agent step execution
 */
router.post('/runs/:runId/agents/simulate', async (req, res) => {
  try {
    const { runId } = req.params;
    const { stepId, action, inputs } = req.body;

    // Simulate step execution
    const simulationResult = {
      stepId,
      action,
      inputs,
      predictedOutput: {
        result: 'Simulated execution result',
        confidence: 0.85,
        estimatedDuration: 3000,
        estimatedCost: 0.015,
        riskLevel: 'medium',
        sideEffects: [],
      },
      recommendations: [
        'Review the security implications before approval',
        'Consider running in staging environment first',
        'Monitor system performance during execution',
      ],
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      runId,
      simulation: simulationResult,
    });
  } catch (error) {
    console.error('Agent simulation error:', error);
    res.status(500).json({
      error: 'Failed to simulate agent step',
      code: 'SIMULATION_FAILED',
      message: error.message,
    });
  }
});

export { router as agentRoutes };
