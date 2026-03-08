"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionExecutor = void 0;
const DecisionFlow_1 = require("../models/DecisionFlow");
/**
 * DecisionExecutor Algorithm
 *
 * Executes autonomous decisions with full policy governance.
 * Manages workflow execution, step tracking, and error handling.
 */
class DecisionExecutor {
    logger;
    flowModel;
    workflows = new Map();
    constructor(logger, flowModel) {
        this.logger = logger;
        this.flowModel = flowModel;
        this.registerDefaultWorkflows();
    }
    /**
     * Register default workflow templates
     */
    registerDefaultWorkflows() {
        // Auto-investigation workflow
        this.registerWorkflow({
            id: 'auto_investigate_entity',
            steps: [
                {
                    name: 'Expand neighborhood',
                    execute: async (context) => {
                        this.logger.info({ nodeId: context.nodeId }, 'Expanding graph neighborhood');
                        // Simulate graph expansion
                        await new Promise((resolve) => setTimeout(resolve, 100));
                        return { expandedNodes: 10 };
                    },
                },
                {
                    name: 'Score connections',
                    execute: async (context) => {
                        this.logger.info('Scoring connections');
                        await new Promise((resolve) => setTimeout(resolve, 100));
                        return { scores: [0.8, 0.6, 0.9] };
                    },
                },
                {
                    name: 'Generate report',
                    execute: async (context) => {
                        this.logger.info('Generating investigation report');
                        await new Promise((resolve) => setTimeout(resolve, 50));
                        return {
                            reportId: `report_${Date.now()}`,
                            findings: 'High-risk entity with suspicious connections',
                        };
                    },
                },
            ],
            timeout: 30000,
            retryOnFailure: true,
        });
        // Pathway rewiring workflow
        this.registerWorkflow({
            id: 'rewire_supply_chain',
            steps: [
                {
                    name: 'Identify affected routes',
                    execute: async (context) => {
                        this.logger.info('Identifying affected supply chain routes');
                        await new Promise((resolve) => setTimeout(resolve, 100));
                        return { affectedRoutes: 3 };
                    },
                },
                {
                    name: 'Calculate alternatives',
                    execute: async (context) => {
                        this.logger.info('Calculating alternative routes');
                        await new Promise((resolve) => setTimeout(resolve, 150));
                        return { alternatives: [{ route: 'A', cost: 1000 }, { route: 'B', cost: 1200 }] };
                    },
                },
                {
                    name: 'Update topology',
                    execute: async (context) => {
                        this.logger.info('Updating pathway topology');
                        await new Promise((resolve) => setTimeout(resolve, 100));
                        return { updated: true };
                    },
                },
            ],
            timeout: 60000,
            retryOnFailure: false,
        });
        // Security response workflow
        this.registerWorkflow({
            id: 'security_response',
            steps: [
                {
                    name: 'Suspend access',
                    execute: async (context) => {
                        this.logger.warn({ userId: context.userId }, 'Suspending user access');
                        await new Promise((resolve) => setTimeout(resolve, 50));
                        return { suspended: true };
                    },
                },
                {
                    name: 'Revoke sessions',
                    execute: async (context) => {
                        this.logger.warn('Revoking active sessions');
                        await new Promise((resolve) => setTimeout(resolve, 50));
                        return { sessionsRevoked: 2 };
                    },
                },
                {
                    name: 'Alert SOC',
                    execute: async (context) => {
                        this.logger.error('Alerting Security Operations Center');
                        await new Promise((resolve) => setTimeout(resolve, 50));
                        return { alertSent: true };
                    },
                },
            ],
            timeout: 10000,
            retryOnFailure: false,
        });
    }
    /**
     * Register a workflow template
     */
    registerWorkflow(template) {
        this.workflows.set(template.id, template);
        this.logger.info({ workflowId: template.id }, 'Workflow template registered');
    }
    /**
     * Execute a decision flow
     */
    async executeDecision(flowId) {
        this.logger.info({ flowId }, 'Executing decision flow');
        // 1. Get flow
        const flow = this.flowModel.getById(flowId);
        if (!flow) {
            this.logger.error({ flowId }, 'Flow not found');
            return false;
        }
        // 2. Check if flow is authorized
        if (!flow.policyDecision.allowed) {
            this.logger.warn({ flowId }, 'Flow not authorized by policy');
            return false;
        }
        // 3. Check flow status
        if (flow.status !== DecisionFlow_1.FlowStatus.PENDING) {
            this.logger.warn({ flowId, status: flow.status }, 'Flow not in PENDING state');
            return false;
        }
        // 4. Get workflow template
        const template = this.workflows.get(flow.workflowTemplate);
        if (!template) {
            this.logger.error({ flowId, template: flow.workflowTemplate }, 'Workflow template not found');
            return false;
        }
        // 5. Start execution
        this.flowModel.startExecution(flowId);
        // 6. Execute workflow steps
        try {
            await this.executeWorkflow(flowId, template, flow);
            return true;
        }
        catch (error) {
            this.logger.error({ error, flowId }, 'Flow execution failed');
            this.flowModel.completeExecution(flowId, DecisionFlow_1.ExecutionOutcome.FAILURE);
            return false;
        }
    }
    /**
     * Execute workflow steps
     */
    async executeWorkflow(flowId, template, flow) {
        const context = {
            flowId,
            prediction: flow.context.prediction,
            graphContext: flow.context.graphContext,
            parameters: flow.triggeredBy.parameters,
            nodeId: flow.context.graphContext.nodeProperties.id,
            userId: flow.context.graphContext.nodeProperties.userId,
        };
        let allStepsSucceeded = true;
        for (const workflowStep of template.steps) {
            // Add step to flow
            const step = this.flowModel.addStep(flowId, {
                name: workflowStep.name,
                status: DecisionFlow_1.StepStatus.RUNNING,
                startedAt: new Date(),
            });
            if (!step) {
                this.logger.error({ flowId }, 'Failed to add step to flow');
                allStepsSucceeded = false;
                break;
            }
            this.logger.info({ flowId, stepId: step.id, stepName: step.name }, 'Executing step');
            try {
                // Execute step with timeout
                const result = await this.executeStepWithTimeout(workflowStep, context, template.timeout || 30000);
                // Update step status
                this.flowModel.updateStep(flowId, step.id, DecisionFlow_1.StepStatus.COMPLETED, result);
                this.logger.info({ flowId, stepId: step.id }, 'Step completed successfully');
            }
            catch (error) {
                this.logger.error({ error, flowId, stepId: step.id }, 'Step execution failed');
                // Update step status
                this.flowModel.updateStep(flowId, step.id, DecisionFlow_1.StepStatus.FAILED, {
                    error: error instanceof Error ? error.message : String(error),
                });
                // Call error handler if defined
                if (workflowStep.onError) {
                    try {
                        await workflowStep.onError(error, context);
                    }
                    catch (handlerError) {
                        this.logger.error({ handlerError }, 'Error handler failed');
                    }
                }
                // Check if we should retry
                if (template.retryOnFailure) {
                    this.logger.info({ flowId, stepId: step.id }, 'Retrying failed step');
                    try {
                        const retryResult = await this.executeStepWithTimeout(workflowStep, context, template.timeout || 30000);
                        this.flowModel.updateStep(flowId, step.id, DecisionFlow_1.StepStatus.COMPLETED, retryResult);
                        this.logger.info({ flowId, stepId: step.id }, 'Step retry succeeded');
                    }
                    catch (retryError) {
                        this.logger.error({ retryError, flowId, stepId: step.id }, 'Step retry failed');
                        allStepsSucceeded = false;
                        break;
                    }
                }
                else {
                    allStepsSucceeded = false;
                    break;
                }
            }
        }
        // Complete flow execution
        const outcome = allStepsSucceeded ? DecisionFlow_1.ExecutionOutcome.SUCCESS : DecisionFlow_1.ExecutionOutcome.FAILURE;
        this.flowModel.completeExecution(flowId, outcome);
        this.logger.info({ flowId, outcome }, 'Workflow execution completed');
    }
    /**
     * Execute a step with timeout
     */
    async executeStepWithTimeout(step, context, timeout) {
        return Promise.race([
            step.execute(context),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Step execution timeout')), timeout)),
        ]);
    }
    /**
     * Get workflow template
     */
    getWorkflow(id) {
        return this.workflows.get(id);
    }
    /**
     * List all workflow templates
     */
    listWorkflows() {
        return Array.from(this.workflows.keys());
    }
    /**
     * Cancel a flow execution
     */
    async cancelExecution(flowId) {
        return this.flowModel.cancel(flowId);
    }
}
exports.DecisionExecutor = DecisionExecutor;
