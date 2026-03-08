"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionFlowModel = exports.DecisionFlowSchema = exports.FlowExecutionSchema = exports.ExecutionStepSchema = exports.PolicyDecisionSchema = exports.FlowContextSchema = exports.GraphContextSchema = exports.ExecutionOutcome = exports.StepStatus = exports.FlowStatus = void 0;
const zod_1 = require("zod");
// Enums
var FlowStatus;
(function (FlowStatus) {
    FlowStatus["PENDING"] = "PENDING";
    FlowStatus["RUNNING"] = "RUNNING";
    FlowStatus["COMPLETED"] = "COMPLETED";
    FlowStatus["FAILED"] = "FAILED";
})(FlowStatus || (exports.FlowStatus = FlowStatus = {}));
var StepStatus;
(function (StepStatus) {
    StepStatus["PENDING"] = "PENDING";
    StepStatus["RUNNING"] = "RUNNING";
    StepStatus["COMPLETED"] = "COMPLETED";
    StepStatus["FAILED"] = "FAILED";
    StepStatus["SKIPPED"] = "SKIPPED";
})(StepStatus || (exports.StepStatus = StepStatus = {}));
var ExecutionOutcome;
(function (ExecutionOutcome) {
    ExecutionOutcome["SUCCESS"] = "SUCCESS";
    ExecutionOutcome["FAILURE"] = "FAILURE";
    ExecutionOutcome["PARTIAL"] = "PARTIAL";
})(ExecutionOutcome || (exports.ExecutionOutcome = ExecutionOutcome = {}));
// Zod Schemas
exports.GraphContextSchema = zod_1.z.object({
    nodeProperties: zod_1.z.record(zod_1.z.any()),
    neighborhoodSize: zod_1.z.number().int(),
    pathways: zod_1.z.array(zod_1.z.string()),
});
exports.FlowContextSchema = zod_1.z.object({
    prediction: zod_1.z.any(), // Reference to Prediction type
    graphContext: exports.GraphContextSchema,
});
exports.PolicyDecisionSchema = zod_1.z.object({
    allowed: zod_1.z.boolean(),
    reason: zod_1.z.string().optional(),
    policy: zod_1.z.string(),
});
exports.ExecutionStepSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    status: zod_1.z.nativeEnum(StepStatus),
    startedAt: zod_1.z.date(),
    completedAt: zod_1.z.date().optional(),
    result: zod_1.z.any().optional(),
});
exports.FlowExecutionSchema = zod_1.z.object({
    startedAt: zod_1.z.date(),
    completedAt: zod_1.z.date().optional(),
    steps: zod_1.z.array(exports.ExecutionStepSchema),
    outcome: zod_1.z.nativeEnum(ExecutionOutcome),
});
exports.DecisionFlowSchema = zod_1.z.object({
    id: zod_1.z.string(),
    bindingId: zod_1.z.string(),
    triggeredBy: zod_1.z.any(), // Reference to TriggerRule type
    workflowTemplate: zod_1.z.string(),
    status: zod_1.z.nativeEnum(FlowStatus),
    context: exports.FlowContextSchema,
    policyDecision: exports.PolicyDecisionSchema,
    execution: exports.FlowExecutionSchema.optional(),
    createdAt: zod_1.z.date(),
});
// Model Class
class DecisionFlowModel {
    flows = new Map();
    /**
     * Create a new decision flow
     */
    create(input, policyDecision) {
        const id = `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();
        const flow = {
            id,
            bindingId: input.bindingId,
            triggeredBy: input.triggeredBy,
            workflowTemplate: input.triggeredBy.workflowTemplate,
            status: policyDecision.allowed ? FlowStatus.PENDING : FlowStatus.FAILED,
            context: input.context,
            policyDecision,
            createdAt: now,
        };
        // Validate with Zod (partial validation to avoid circular refs)
        const validatedFlow = {
            ...flow,
            triggeredBy: input.triggeredBy,
            context: {
                ...flow.context,
                prediction: input.context.prediction,
            },
        };
        this.flows.set(id, flow);
        return flow;
    }
    /**
     * Get flow by ID
     */
    getById(id) {
        return this.flows.get(id);
    }
    /**
     * Get flows by binding ID
     */
    getByBindingId(bindingId) {
        return Array.from(this.flows.values()).filter((f) => f.bindingId === bindingId);
    }
    /**
     * Get active flows with filters
     */
    getActiveFlows(filters) {
        let results = Array.from(this.flows.values());
        if (filters?.status) {
            results = results.filter((f) => f.status === filters.status);
        }
        if (filters?.workflowTemplate) {
            results = results.filter((f) => f.workflowTemplate === filters.workflowTemplate);
        }
        // Sort by creation date descending
        results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const offset = filters?.offset ?? 0;
        const limit = filters?.limit ?? results.length;
        return results.slice(offset, offset + limit);
    }
    /**
     * Start flow execution
     */
    startExecution(id) {
        const flow = this.flows.get(id);
        if (!flow || flow.status !== FlowStatus.PENDING) {
            return false;
        }
        flow.status = FlowStatus.RUNNING;
        flow.execution = {
            startedAt: new Date(),
            steps: [],
            outcome: ExecutionOutcome.SUCCESS, // Will be updated as steps execute
        };
        return true;
    }
    /**
     * Add execution step
     */
    addStep(flowId, step) {
        const flow = this.flows.get(flowId);
        if (!flow || !flow.execution) {
            return undefined;
        }
        const stepId = `step_${flowId}_${flow.execution.steps.length}`;
        const fullStep = {
            id: stepId,
            ...step,
        };
        flow.execution.steps.push(fullStep);
        return fullStep;
    }
    /**
     * Update step status
     */
    updateStep(flowId, stepId, status, result) {
        const flow = this.flows.get(flowId);
        if (!flow || !flow.execution) {
            return false;
        }
        const step = flow.execution.steps.find((s) => s.id === stepId);
        if (!step) {
            return false;
        }
        step.status = status;
        if (status === StepStatus.COMPLETED || status === StepStatus.FAILED) {
            step.completedAt = new Date();
        }
        if (result !== undefined) {
            step.result = result;
        }
        return true;
    }
    /**
     * Complete flow execution
     */
    completeExecution(id, outcome) {
        const flow = this.flows.get(id);
        if (!flow || !flow.execution) {
            return false;
        }
        flow.status = outcome === ExecutionOutcome.SUCCESS
            ? FlowStatus.COMPLETED
            : FlowStatus.FAILED;
        flow.execution.completedAt = new Date();
        flow.execution.outcome = outcome;
        return true;
    }
    /**
     * Cancel a flow
     */
    cancel(id) {
        const flow = this.flows.get(id);
        if (!flow || flow.status === FlowStatus.COMPLETED) {
            return false;
        }
        flow.status = FlowStatus.FAILED;
        if (flow.execution) {
            flow.execution.completedAt = new Date();
            flow.execution.outcome = ExecutionOutcome.FAILURE;
            // Mark pending steps as skipped
            flow.execution.steps.forEach((step) => {
                if (step.status === StepStatus.PENDING || step.status === StepStatus.RUNNING) {
                    step.status = StepStatus.SKIPPED;
                    step.completedAt = new Date();
                }
            });
        }
        return true;
    }
    /**
     * Get all flows (for internal use)
     */
    getAll() {
        return Array.from(this.flows.values());
    }
    /**
     * Delete flow (for testing)
     */
    delete(id) {
        return this.flows.delete(id);
    }
    /**
     * Clear all flows (for testing)
     */
    clear() {
        this.flows.clear();
    }
}
exports.DecisionFlowModel = DecisionFlowModel;
