"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowTrigger = void 0;
const PredictionBinding_1 = require("../models/PredictionBinding");
const DecisionFlow_1 = require("../models/DecisionFlow");
/**
 * FlowTrigger Algorithm
 *
 * Evaluates prediction bindings and triggers autonomous decision flows
 * when trigger rules are satisfied.
 */
class FlowTrigger {
    logger;
    opaUrl;
    flowModel;
    driver = null;
    constructor(logger, opaUrl) {
        this.logger = logger;
        this.opaUrl = opaUrl;
        this.flowModel = new DecisionFlow_1.DecisionFlowModel();
    }
    /**
     * Initialize with Neo4j driver
     */
    initialize(driver) {
        this.driver = driver;
    }
    /**
     * Evaluate trigger rules for a binding
     */
    async evaluateTriggers(binding) {
        this.logger.info({ bindingId: binding.id, nodeId: binding.nodeId }, 'Evaluating trigger rules');
        const satisfiedRules = [];
        for (const rule of binding.triggerRules) {
            if (this.evaluateCondition(rule, binding.prediction)) {
                this.logger.debug({ ruleId: rule.id }, 'Trigger rule satisfied');
                satisfiedRules.push(rule);
            }
        }
        // Sort by priority (lower number = higher priority)
        satisfiedRules.sort((a, b) => a.priority - b.priority);
        this.logger.info({ bindingId: binding.id, satisfiedCount: satisfiedRules.length }, 'Trigger evaluation complete');
        return satisfiedRules;
    }
    /**
     * Evaluate a single trigger condition
     */
    evaluateCondition(rule, prediction) {
        const { field, operator, threshold } = rule.condition;
        // Resolve field value (supports nested paths like 'value.riskScore')
        const fieldValue = this.resolveFieldValue(prediction, field);
        switch (operator) {
            case PredictionBinding_1.ConditionOperator.GT:
                return typeof fieldValue === 'number' && fieldValue > threshold;
            case PredictionBinding_1.ConditionOperator.LT:
                return typeof fieldValue === 'number' && fieldValue < threshold;
            case PredictionBinding_1.ConditionOperator.EQ:
                return fieldValue === threshold;
            case PredictionBinding_1.ConditionOperator.IN:
                return Array.isArray(threshold) && threshold.includes(fieldValue);
            case PredictionBinding_1.ConditionOperator.BETWEEN:
                if (Array.isArray(threshold) &&
                    threshold.length === 2 &&
                    typeof fieldValue === 'number') {
                    return fieldValue >= threshold[0] && fieldValue <= threshold[1];
                }
                return false;
            default:
                this.logger.warn({ operator }, 'Unknown operator');
                return false;
        }
    }
    /**
     * Resolve field value from prediction (supports dot notation)
     */
    resolveFieldValue(prediction, field) {
        const parts = field.split('.');
        let value = prediction;
        for (const part of parts) {
            if (value && typeof value === 'object') {
                value = value[part];
            }
            else {
                return undefined;
            }
        }
        return value;
    }
    /**
     * Trigger a decision flow
     */
    async triggerFlow(binding, rule) {
        this.logger.info({ bindingId: binding.id, ruleId: rule.id }, 'Triggering decision flow');
        // 1. Load graph context
        const graphContext = await this.loadGraphContext(binding.nodeId);
        // 2. Check OPA policy
        const policyDecision = await this.checkPolicy(binding, rule, graphContext);
        // 3. Create decision flow
        const flow = this.flowModel.create({
            bindingId: binding.id,
            triggeredBy: rule,
            context: {
                prediction: binding.prediction,
                graphContext,
            },
        }, policyDecision);
        // 4. If policy allowed, start execution
        if (policyDecision.allowed) {
            this.logger.info({ flowId: flow.id }, 'Flow authorized, starting execution');
            // Execution will be handled by DecisionExecutor
        }
        else {
            this.logger.warn({ flowId: flow.id, reason: policyDecision.reason }, 'Flow denied by policy');
        }
        return flow;
    }
    /**
     * Load graph context for a node
     */
    async loadGraphContext(nodeId) {
        if (!this.driver) {
            this.logger.warn('Neo4j driver not available, using minimal graph context');
            return {
                nodeProperties: {},
                neighborhoodSize: 0,
                pathways: [],
            };
        }
        const session = this.driver.session();
        try {
            // Get node properties
            const nodeResult = await session.run('MATCH (n {id: $nodeId}) RETURN properties(n) as props', { nodeId });
            const nodeProperties = nodeResult.records[0]?.get('props') || {};
            // Get neighborhood size (1-hop neighbors)
            const neighborhoodResult = await session.run('MATCH (n {id: $nodeId})-[]-(neighbor) RETURN count(DISTINCT neighbor) as size', { nodeId });
            const neighborhoodSize = neighborhoodResult.records[0]?.get('size').toNumber() || 0;
            // Get pathways this node participates in
            const pathwaysResult = await session.run(`
        MATCH (n {id: $nodeId})
        MATCH path=(n)-[:PATHWAY*1..3]-(other)
        RETURN DISTINCT id(path) as pathwayId
        LIMIT 10
      `, { nodeId });
            const pathways = pathwaysResult.records.map((r) => r.get('pathwayId').toString());
            return {
                nodeProperties,
                neighborhoodSize,
                pathways,
            };
        }
        catch (error) {
            this.logger.error({ error, nodeId }, 'Failed to load graph context');
            return {
                nodeProperties: {},
                neighborhoodSize: 0,
                pathways: [],
            };
        }
        finally {
            await session.close();
        }
    }
    /**
     * Check OPA policy for workflow execution
     */
    async checkPolicy(binding, rule, graphContext) {
        if (!this.opaUrl) {
            this.logger.warn('OPA URL not configured, allowing by default');
            return {
                allowed: true,
                policy: 'default_allow',
            };
        }
        try {
            const input = {
                action: 'execute_workflow',
                actor: 'predictive-orchestrator',
                prediction: {
                    type: binding.predictionType,
                    value: binding.prediction.value,
                    confidence: binding.prediction.confidence,
                    modelId: binding.modelId,
                },
                workflow: {
                    template: rule.workflowTemplate,
                    parameters: rule.parameters,
                },
                resource: binding.nodeId,
                context: {
                    graphContext,
                },
            };
            const response = await fetch(`${this.opaUrl}/v1/data/${rule.policyCheck}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input }),
            });
            if (!response.ok) {
                throw new Error(`OPA request failed: ${response.statusText}`);
            }
            const result = await response.json();
            const allowed = result.result === true || result.result?.allow === true;
            return {
                allowed,
                reason: allowed ? undefined : result.result?.reason || 'Policy denied',
                policy: rule.policyCheck,
            };
        }
        catch (error) {
            this.logger.error({ error }, 'OPA policy check failed, denying by default');
            return {
                allowed: false,
                reason: 'Policy check failed',
                policy: rule.policyCheck,
            };
        }
    }
    /**
     * Auto-trigger flows for a binding (evaluate all rules and trigger satisfied ones)
     */
    async autoTrigger(binding) {
        const satisfiedRules = await this.evaluateTriggers(binding);
        const triggeredFlows = [];
        for (const rule of satisfiedRules) {
            const flow = await this.triggerFlow(binding, rule);
            if (flow) {
                triggeredFlows.push(flow);
            }
        }
        return triggeredFlows;
    }
    /**
     * Get flow by ID
     */
    async getFlow(id) {
        return this.flowModel.getById(id);
    }
    /**
     * Get active flows
     */
    async getActiveFlows(filters) {
        return this.flowModel.getActiveFlows({
            status: filters?.status,
            workflowTemplate: filters?.workflowTemplate,
            limit: filters?.limit,
            offset: filters?.offset,
        });
    }
    /**
     * Cancel a flow
     */
    async cancelFlow(id) {
        return this.flowModel.cancel(id);
    }
    /**
     * Get model instance (for testing)
     */
    getModel() {
        return this.flowModel;
    }
}
exports.FlowTrigger = FlowTrigger;
