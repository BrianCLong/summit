"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowEngine = void 0;
const IntegrationRegistry_js_1 = require("./IntegrationRegistry.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const engineLogger = logger_js_1.default.child({ name: 'WorkflowEngine' });
class WorkflowEngine {
    pg;
    registry;
    constructor(pg) {
        this.pg = pg;
        this.registry = IntegrationRegistry_js_1.IntegrationRegistry.getInstance();
    }
    /**
     * Execute a playbook run
     * In a real system, this would likely be async and queued.
     * For this MVP, we execute inline or pseudo-async.
     */
    async executeRun(runId) {
        // Fetch run
        const { rows } = await this.pg.query(`SELECT * FROM maestro.playbook_runs WHERE id = $1`, [runId]);
        if (rows.length === 0)
            return;
        const run = this.mapRun(rows[0]);
        // Fetch playbook
        const { rows: pbRows } = await this.pg.query(`SELECT * FROM maestro.playbooks WHERE id = $1`, [run.playbookId]);
        if (pbRows.length === 0) {
            await this.updateRunStatus(runId, 'failed', { error: 'Playbook not found' });
            return;
        }
        const playbook = this.mapPlaybook(pbRows[0]);
        await this.updateRunStatus(runId, 'running');
        try {
            // Start execution from startStep
            let currentStepId = playbook.workflow.startStepId;
            const context = { ...run.context };
            const stepsState = [];
            while (currentStepId) {
                const step = playbook.workflow.steps.find(s => s.id === currentStepId);
                if (!step) {
                    throw new Error(`Step ${currentStepId} not found`);
                }
                // Execute step
                const stepState = {
                    stepId: step.id,
                    status: 'running',
                    startedAt: new Date(),
                };
                stepsState.push(stepState);
                // Update DB with partial progress could happen here
                try {
                    const output = await this.executeStep(step, context);
                    stepState.status = 'completed';
                    stepState.completedAt = new Date();
                    stepState.output = output;
                    // Merge output into context for next steps
                    context[step.id] = output;
                }
                catch (err) {
                    stepState.status = 'failed';
                    stepState.error = err.message;
                    stepState.completedAt = new Date();
                    throw err; // Stop execution on failure for now
                }
                // Determine next step
                if (step.branches) {
                    // Evaluate conditions
                    let next = null;
                    for (const branch of step.branches) {
                        if (this.evaluateCondition(branch.condition, context)) {
                            next = branch.nextStepId;
                            break;
                        }
                    }
                    currentStepId = next || step.nextStepId;
                }
                else {
                    currentStepId = step.nextStepId;
                }
            }
            await this.updateRunStatus(runId, 'completed', { result: context, stepsState });
        }
        catch (error) {
            engineLogger.error({ runId, error }, 'Playbook execution failed');
            await this.updateRunStatus(runId, 'failed', { error: error.message });
        }
    }
    async executeStep(step, context) {
        if (step.type === 'action') {
            if (!step.actionId)
                throw new Error('Action ID required');
            const action = this.registry.getAction(step.actionId);
            if (!action)
                throw new Error(`Action ${step.actionId} not found`);
            // Resolve params (simple variable substitution)
            const params = this.resolveParams(step.params, context);
            return await action.execute(params, context);
        }
        return null;
    }
    resolveParams(params, context) {
        // Deep clone and replace strings starting with $
        // Simplified implementation
        const str = JSON.stringify(params);
        // Basic substitution for "${stepId.output}"
        // For MVP, assume params are static or simple
        return params;
    }
    evaluateCondition(condition, context) {
        // MVP: Evaluate simple JS expression? unsafe.
        // Better: json-logic or similar.
        // For MVP always return true or check specific flags
        return true;
    }
    async updateRunStatus(runId, status, data = {}) {
        const updates = [status, new Date(), runId];
        let query = `UPDATE maestro.playbook_runs SET status = $1, updated_at = NOW()`;
        if (status === 'completed' || status === 'failed') {
            query += `, completed_at = $2`;
        }
        else {
            // just placeholder for $2 if not used
            updates[1] = null;
            query += `, started_at = COALESCE(started_at, NOW())`; // Ensure started_at is set if not already
        }
        if (data.result) {
            query += `, result = $${updates.push(JSON.stringify(data.result))}`;
        }
        if (data.error) {
            query += `, error = $${updates.push(data.error)}`;
        }
        if (data.stepsState) {
            query += `, steps_state = $${updates.push(JSON.stringify(data.stepsState))}`;
        }
        query += ` WHERE id = $${updates.length > 2 ? updates.length : 3}`; // runId is always last or near last
        // Fix param index logic (messy above)
        // Let's rewrite cleaner
        const setClauses = [`status = $1`, `updated_at = NOW()`];
        const sqlParams = [status];
        if (status === 'completed' || status === 'failed') {
            setClauses.push(`completed_at = NOW()`);
        }
        if (data.result) {
            setClauses.push(`result = $${sqlParams.push(JSON.stringify(data.result))}`);
        }
        if (data.error) {
            setClauses.push(`error = $${sqlParams.push(data.error)}`);
        }
        if (data.stepsState) {
            setClauses.push(`steps_state = $${sqlParams.push(JSON.stringify(data.stepsState))}`);
        }
        sqlParams.push(runId);
        await this.pg.query(`UPDATE maestro.playbook_runs SET ${setClauses.join(', ')} WHERE id = $${sqlParams.length}`, sqlParams);
    }
    mapRun(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            playbookId: row.playbook_id,
            caseId: row.case_id,
            status: row.status,
            context: row.context || {},
            stepsState: row.steps_state || [],
            result: row.result,
            startedAt: row.started_at,
            completedAt: row.completed_at,
            error: row.error,
            triggeredBy: row.triggered_by
        };
    }
    mapPlaybook(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            description: row.description,
            workflow: row.workflow,
            triggers: row.triggers || [],
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
            metadata: row.metadata || {}
        };
    }
}
exports.WorkflowEngine = WorkflowEngine;
