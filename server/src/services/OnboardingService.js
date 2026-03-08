"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onboardingService = exports.OnboardingService = void 0;
const pino_1 = __importDefault(require("pino"));
const postgres_js_1 = require("../db/postgres.js");
const logger = pino_1.default({ name: 'onboarding-service' });
const DEFAULT_FLOWS = {
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
class OnboardingService {
    static instance;
    constructor() {
        this.ensureTableExists();
    }
    static getInstance() {
        if (!OnboardingService.instance) {
            OnboardingService.instance = new OnboardingService();
        }
        return OnboardingService.instance;
    }
    async ensureTableExists() {
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
            await postgres_js_1.pool.query(query);
        }
        catch (err) {
            logger.error({ err }, 'Failed to ensure onboarding_flows table exists');
        }
    }
    async getOrCreateFlow(tenantId, userId, persona) {
        const existing = await postgres_js_1.pool.query('SELECT * FROM onboarding_flows WHERE tenant_id = $1 AND user_id = $2 AND persona = $3', [tenantId, userId, persona]);
        if (existing.rows.length > 0) {
            return this.mapRowToFlow(existing.rows[0]);
        }
        const steps = DEFAULT_FLOWS[persona].map(step => ({
            ...step,
            status: 'pending',
        }));
        const result = await postgres_js_1.pool.query('INSERT INTO onboarding_flows (tenant_id, user_id, persona, steps) VALUES ($1, $2, $3, $4) RETURNING *', [tenantId, userId, persona, JSON.stringify(steps)]);
        return this.mapRowToFlow(result.rows[0]);
    }
    async updateStep(flowId, stepId, status) {
        const flowResult = await postgres_js_1.pool.query('SELECT * FROM onboarding_flows WHERE id = $1', [flowId]);
        if (flowResult.rows.length === 0)
            throw new Error('Flow not found');
        const flow = this.mapRowToFlow(flowResult.rows[0]);
        const stepIndex = flow.steps.findIndex(s => s.id === stepId);
        if (stepIndex === -1)
            throw new Error('Step not found');
        flow.steps[stepIndex].status = status;
        // Auto-advance currentStepIndex if this was the current step and it's completed
        if (status === 'completed' && flow.currentStepIndex === stepIndex) {
            flow.currentStepIndex = Math.min(flow.currentStepIndex + 1, flow.steps.length - 1);
        }
        // Check if flow is finished
        const allFinished = flow.steps.every(s => s.status === 'completed' || s.status === 'skipped');
        const completedAt = allFinished ? new Date() : null;
        const result = await postgres_js_1.pool.query('UPDATE onboarding_flows SET steps = $1, current_step_index = $2, completed_at = $3 WHERE id = $4 RETURNING *', [JSON.stringify(flow.steps), flow.currentStepIndex, completedAt, flowId]);
        return this.mapRowToFlow(result.rows[0]);
    }
    mapRowToFlow(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            userId: row.user_id,
            persona: row.persona,
            steps: row.steps,
            currentStepIndex: row.current_step_index,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            metadata: row.metadata,
        };
    }
}
exports.OnboardingService = OnboardingService;
exports.onboardingService = OnboardingService.getInstance();
