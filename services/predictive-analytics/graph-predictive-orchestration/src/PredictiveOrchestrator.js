"use strict";
/**
 * Predictive Orchestrator - Core Engine
 * Drives automated workflows from graph-embedded predictions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictiveOrchestrator = void 0;
exports.createOrchestrator = createOrchestrator;
const PredictionBinder_js_1 = require("./algorithms/PredictionBinder.js");
const FlowTrigger_js_1 = require("./algorithms/FlowTrigger.js");
const PathwayRewirer_js_1 = require("./algorithms/PathwayRewirer.js");
const DecisionExecutor_js_1 = require("./algorithms/DecisionExecutor.js");
const DecisionFlow_js_1 = require("./models/DecisionFlow.js");
class PredictiveOrchestrator {
    binder;
    trigger;
    rewirer;
    executor;
    bindings = new Map();
    flows = new Map();
    pathways = new Map();
    config;
    constructor(config) {
        this.config = {
            autoTriggerEnabled: true,
            maxConcurrentFlows: 10,
            defaultTimeout: 30000,
            rewireThreshold: 0.7,
            ...config,
        };
        this.binder = new PredictionBinder_js_1.PredictionBinder();
        this.trigger = new FlowTrigger_js_1.FlowTrigger();
        this.rewirer = new PathwayRewirer_js_1.PathwayRewirer(this.config.rewireThreshold);
        this.executor = new DecisionExecutor_js_1.DecisionExecutor(this.config.defaultTimeout);
    }
    // Binding Management
    bindPrediction(nodeId, predictionId, predictionValue, confidence) {
        const binding = this.binder.bind({
            nodeId,
            predictionId,
            predictionValue,
            confidence,
            boundAt: new Date(),
        });
        this.bindings.set(binding.id, binding);
        // Check if binding should trigger a flow
        if (this.config.autoTriggerEnabled) {
            this.checkTriggers(binding);
        }
        return binding;
    }
    unbindPrediction(bindingId) {
        return this.bindings.delete(bindingId);
    }
    getBinding(bindingId) {
        return this.bindings.get(bindingId);
    }
    getBindingsForNode(nodeId) {
        return [...this.bindings.values()].filter((b) => b.nodeId === nodeId);
    }
    // Flow Management
    createFlow(name, triggerCondition, actions) {
        const flow = {
            id: crypto.randomUUID(),
            name,
            triggerCondition,
            actions,
            status: DecisionFlow_js_1.FlowStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.flows.set(flow.id, flow);
        return flow;
    }
    async executeFlow(flowId) {
        const flow = this.flows.get(flowId);
        if (!flow) {
            throw new Error(`Flow not found: ${flowId}`);
        }
        // Check concurrent flow limit
        const activeCount = [...this.flows.values()].filter((f) => f.status === DecisionFlow_js_1.FlowStatus.RUNNING).length;
        if (activeCount >= this.config.maxConcurrentFlows) {
            throw new Error('Maximum concurrent flows reached');
        }
        // Update flow status
        flow.status = DecisionFlow_js_1.FlowStatus.RUNNING;
        flow.startedAt = new Date();
        this.flows.set(flow.id, flow);
        try {
            const result = await this.executor.execute(flow);
            flow.status = result.success ? DecisionFlow_js_1.FlowStatus.COMPLETED : DecisionFlow_js_1.FlowStatus.FAILED;
            flow.completedAt = new Date();
            flow.result = result;
            this.flows.set(flow.id, flow);
            return result;
        }
        catch (error) {
            flow.status = DecisionFlow_js_1.FlowStatus.FAILED;
            flow.completedAt = new Date();
            flow.error = error instanceof Error ? error.message : 'Unknown error';
            this.flows.set(flow.id, flow);
            throw error;
        }
    }
    getFlow(flowId) {
        return this.flows.get(flowId);
    }
    getActiveFlows() {
        return [...this.flows.values()].filter((f) => f.status === DecisionFlow_js_1.FlowStatus.RUNNING);
    }
    // Pathway Management
    createPathway(name, nodes, transitions) {
        const pathway = {
            id: crypto.randomUUID(),
            name,
            nodes,
            transitions,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.pathways.set(pathway.id, pathway);
        return pathway;
    }
    async rewirePathway(pathwayId, reason) {
        const pathway = this.pathways.get(pathwayId);
        if (!pathway) {
            throw new Error(`Pathway not found: ${pathwayId}`);
        }
        // Gather relevant bindings for pathway nodes
        const relevantBindings = pathway.nodes.flatMap((nodeId) => this.getBindingsForNode(nodeId));
        const result = await this.rewirer.rewire(pathway, relevantBindings, reason);
        if (result.success && result.newPathway) {
            this.pathways.set(pathway.id, result.newPathway);
        }
        return result;
    }
    getPathway(pathwayId) {
        return this.pathways.get(pathwayId);
    }
    getAllPathways() {
        return [...this.pathways.values()];
    }
    // Trigger Management
    async checkTriggers(binding) {
        for (const flow of this.flows.values()) {
            if (flow.status !== DecisionFlow_js_1.FlowStatus.PENDING)
                continue;
            const shouldTrigger = await this.trigger.evaluate(flow.triggerCondition, binding, this.bindings);
            if (shouldTrigger) {
                // Queue flow for execution
                this.executeFlow(flow.id).catch((err) => {
                    console.error(`Flow execution failed: ${flow.id}`, err);
                });
            }
        }
    }
    evaluateTriggers() {
        const results = [];
        for (const flow of this.flows.values()) {
            if (flow.status !== DecisionFlow_js_1.FlowStatus.PENDING)
                continue;
            results.push({
                flowId: flow.id,
                flowName: flow.name,
                condition: flow.triggerCondition,
                wouldTrigger: false, // Would need to evaluate condition
                relevantBindings: [],
            });
        }
        return results;
    }
    // Status
    getStatus() {
        return {
            activeFlows: this.getActiveFlows().length,
            pendingTriggers: [...this.flows.values()].filter((f) => f.status === DecisionFlow_js_1.FlowStatus.PENDING).length,
            totalBindings: this.bindings.size,
            lastActivity: new Date(),
        };
    }
    // Cleanup
    cleanup() {
        // Remove completed flows older than 1 hour
        const oneHourAgo = Date.now() - 3600000;
        for (const [id, flow] of this.flows) {
            if ((flow.status === DecisionFlow_js_1.FlowStatus.COMPLETED || flow.status === DecisionFlow_js_1.FlowStatus.FAILED) &&
                flow.completedAt &&
                flow.completedAt.getTime() < oneHourAgo) {
                this.flows.delete(id);
            }
        }
        // Remove stale bindings
        for (const [id, binding] of this.bindings) {
            if (binding.expiresAt && binding.expiresAt.getTime() < Date.now()) {
                this.bindings.delete(id);
            }
        }
    }
}
exports.PredictiveOrchestrator = PredictiveOrchestrator;
function createOrchestrator(config) {
    return new PredictiveOrchestrator(config);
}
