import pino from 'pino';
import { pool } from '../db/postgres.js';
import type { GovernanceVerdict } from '../governance/types.js';

const logger = (pino as any)({ name: 'onboarding-service' });

export type OnboardingPersona = 'admin' | 'analyst' | 'developer' | 'compliance_officer';

export interface OnboardingStep {
  id: string;
  type: 'interactive' | 'video' | 'checklist' | 'sample_action';
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  requiredActions: string[];
  governanceVerdict?: GovernanceVerdict;
}

export interface OnboardingFlow {
  id: string;
  tenantId: string;
  userId: string;
  persona: OnboardingPersona;
  steps: OnboardingStep[];
  currentStepIndex: number;
  startedAt: Date;
  completedAt?: Date;
  metadata: Record<string, unknown>;
}

const DEFAULT_FLOWS: Record<OnboardingPersona, Partial<OnboardingStep>[]> = {
  admin: [
    { id: 'setup_tenant', title: 'Setup Tenant Profile', type: 'interactive', requiredActions: ['complete_profile'] },
    { id: 'configure_opa', title: 'Configure OPA Policies', type: 'interactive', requiredActions: ['apply_baseline'] },
    { id: 'invite_users', title: 'Invite Your Team', type: 'checklist', requiredActions: ['send_invites'] },
  ],
  analyst: [
    { id: 'first_query', title: 'Run Your First Search', type: 'interactive', requiredActions: ['execute_search'] },
    { id: 'explore_graph', title: 'Explore the Graph', type: 'interactive', requiredActions: ['expand_nodes'] },
    { id: 'save_investigation', title: 'Save an Investigation', type: 'sample_action', requiredActions: ['create_folder'] },
  ],
  developer: [
    { id: 'api_keys', title: 'Generate API Keys', type: 'interactive', requiredActions: ['create_key'] },
    { id: 'sdk_setup', title: 'Initialize SDK', type: 'checklist', requiredActions: ['npm_install'] },
    { id: 'first_webhook', title: 'Register Webhook', type: 'interactive', requiredActions: ['test_endpoint'] },
  ],
  compliance_officer: [
    { id: 'audit_logs', title: 'Review Audit Logs', type: 'interactive', requiredActions: ['view_logs'] },
    { id: 'assess_hipaa', title: 'Run HIPAA Assessment', type: 'sample_action', requiredActions: ['launch_assess'] },
    { id: 'export_report', title: 'Export Evidence Bundle', type: 'interactive', requiredActions: ['download_zip'] },
  ],
};

export class OnboardingService {
  private static instance: OnboardingService;

  private constructor() {
    this.ensureTableExists();
  }

  static getInstance(): OnboardingService {
    if (!OnboardingService.instance) {
      OnboardingService.instance = new OnboardingService();
    }
    return OnboardingService.instance;
  }

  private async ensureTableExists() {
    const query = `
      CREATE TABLE IF NOT EXISTS onboarding_flows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        persona TEXT NOT NULL,
        current_step_index INTEGER DEFAULT 0,
        steps JSONB NOT NULL,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}',
        UNIQUE(tenant_id, user_id, persona)
      );
    `;
    try {
      await pool.query(query);
    } catch (err) {
      logger.error({ err }, 'Failed to ensure onboarding_flows table exists');
    }
  }

  async getOrCreateFlow(tenantId: string, userId: string, persona: OnboardingPersona): Promise<OnboardingFlow> {
    const existing = await pool.query(
      'SELECT * FROM onboarding_flows WHERE tenant_id = $1 AND user_id = $2 AND persona = $3',
      [tenantId, userId, persona]
    );

    if (existing.rows.length > 0) {
      return this.mapRowToFlow(existing.rows[0]);
    }

    const steps = DEFAULT_FLOWS[persona].map(step => ({
      ...step,
      status: 'pending',
    }));

    const result = await pool.query(
      'INSERT INTO onboarding_flows (tenant_id, user_id, persona, steps) VALUES ($1, $2, $3, $4) RETURNING *',
      [tenantId, userId, persona, JSON.stringify(steps)]
    );

    return this.mapRowToFlow(result.rows[0]);
  }

  async updateStep(flowId: string, stepId: string, status: OnboardingStep['status']): Promise<OnboardingFlow> {
    const flowResult = await pool.query('SELECT * FROM onboarding_flows WHERE id = $1', [flowId]);
    if (flowResult.rows.length === 0) throw new Error('Flow not found');

    const flow = this.mapRowToFlow(flowResult.rows[0]);
    const stepIndex = flow.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) throw new Error('Step not found');

    flow.steps[stepIndex].status = status;

    // Auto-advance currentStepIndex if this was the current step and it's completed
    if (status === 'completed' && flow.currentStepIndex === stepIndex) {
      flow.currentStepIndex = Math.min(flow.currentStepIndex + 1, flow.steps.length - 1);
    }

    // Check if flow is finished
    const allFinished = flow.steps.every(s => s.status === 'completed' || s.status === 'skipped');
    const completedAt = allFinished ? new Date() : null;

    const result = await pool.query(
      'UPDATE onboarding_flows SET steps = $1, current_step_index = $2, completed_at = $3 WHERE id = $4 RETURNING *',
      [JSON.stringify(flow.steps), flow.currentStepIndex, completedAt, flowId]
    );

    return this.mapRowToFlow(result.rows[0]);
  }

  private mapRowToFlow(row: any): OnboardingFlow {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      persona: row.persona as OnboardingPersona,
      steps: row.steps,
      currentStepIndex: row.current_step_index,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      metadata: row.metadata,
    };
  }
}

export const onboardingService = OnboardingService.getInstance();
