"use strict";
/**
 * What-If Operations Service
 *
 * Provides high-level operations for scenario manipulation:
 * - Add/remove/alter nodes and edges
 * - Adjust event timings
 * - Enable/disable detection rules, warrants, resources
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatIfOperations = void 0;
const index_js_1 = require("../types/index.js");
class WhatIfOperations {
    sandboxGraph;
    rules = new Map();
    parameters = new Map();
    constructor(sandboxGraph) {
        this.sandboxGraph = sandboxGraph;
    }
    // ============================================================================
    // Individual What-If Operations
    // ============================================================================
    /**
     * Execute a single what-if operation
     */
    async execute(operation, description) {
        const deltaSet = {
            id: (0, index_js_1.generateId)(),
            scenarioId: this.sandboxGraph.getScenarioId(),
            operations: [],
            createdAt: Date.now(),
            description,
            applied: false,
            rollbackAvailable: true,
        };
        const affectedNodeIds = [];
        const affectedEdgeIds = [];
        const warnings = [];
        const errors = [];
        try {
            // Process node operations
            if (operation.addNode) {
                const result = await this.executeAddNode(operation.addNode, deltaSet);
                affectedNodeIds.push(result.nodeId);
                affectedEdgeIds.push(...result.edgeIds);
            }
            if (operation.removeNode) {
                const result = await this.executeRemoveNode(operation.removeNode, deltaSet);
                affectedNodeIds.push(result.nodeId);
                affectedEdgeIds.push(...result.edgeIds);
            }
            if (operation.updateNode) {
                const result = await this.executeUpdateNode(operation.updateNode, deltaSet);
                affectedNodeIds.push(result.nodeId);
            }
            // Process edge operations
            if (operation.addEdge) {
                const result = await this.executeAddEdge(operation.addEdge, deltaSet);
                affectedEdgeIds.push(result.edgeId);
            }
            if (operation.removeEdge) {
                const result = await this.executeRemoveEdge(operation.removeEdge, deltaSet);
                affectedEdgeIds.push(result.edgeId);
            }
            if (operation.updateEdge) {
                const result = await this.executeUpdateEdge(operation.updateEdge, deltaSet);
                affectedEdgeIds.push(result.edgeId);
            }
            // Process timing operations
            if (operation.adjustTiming) {
                await this.executeAdjustTiming(operation.adjustTiming, deltaSet);
                if (operation.adjustTiming.targetType === 'node') {
                    affectedNodeIds.push(operation.adjustTiming.targetId);
                }
                else {
                    affectedEdgeIds.push(operation.adjustTiming.targetId);
                }
            }
            // Process rule operations
            if (operation.enableRule) {
                await this.executeEnableRule(operation.enableRule, deltaSet);
            }
            if (operation.disableRule) {
                await this.executeDisableRule(operation.disableRule, deltaSet);
            }
            // Process parameter operations
            if (operation.setParameter) {
                await this.executeSetParameter(operation.setParameter, deltaSet);
            }
            deltaSet.applied = true;
            deltaSet.appliedAt = Date.now();
            return {
                success: true,
                deltaSet,
                affectedNodeIds,
                affectedEdgeIds,
                warnings,
                errors,
            };
        }
        catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
            return {
                success: false,
                deltaSet,
                affectedNodeIds,
                affectedEdgeIds,
                warnings,
                errors,
            };
        }
    }
    /**
     * Execute multiple what-if operations as a batch
     */
    async executeBatch(operations, description) {
        const results = [];
        const deltaSets = [];
        let successfulOperations = 0;
        let failedOperations = 0;
        for (let i = 0; i < operations.length; i++) {
            const operation = operations[i];
            if (!operation)
                continue;
            const opDescription = description
                ? `${description} - Operation ${i + 1}`
                : `Batch Operation ${i + 1}`;
            const result = await this.execute(operation, opDescription);
            results.push(result);
            deltaSets.push(result.deltaSet);
            if (result.success) {
                successfulOperations++;
            }
            else {
                failedOperations++;
            }
        }
        return {
            totalOperations: operations.length,
            successfulOperations,
            failedOperations,
            deltaSets,
            results,
        };
    }
    // ============================================================================
    // Node Operations
    // ============================================================================
    async executeAddNode(params, deltaSet) {
        const node = this.sandboxGraph.addNode(params.labels, params.properties);
        const edgeIds = [];
        deltaSet.operations.push({
            id: (0, index_js_1.generateId)(),
            type: 'add_node',
            targetId: node.id,
            targetType: 'node',
            after: node,
            timestamp: Date.now(),
            reversible: true,
            metadata: {},
        });
        // Create connections if specified
        if (params.connectTo) {
            for (const connection of params.connectTo) {
                const targetNode = await this.sandboxGraph.getNode(connection.nodeId);
                if (!targetNode) {
                    continue;
                }
                if (connection.direction === 'outgoing' || connection.direction === 'both') {
                    const edge = await this.sandboxGraph.addEdge(node.id, connection.nodeId, connection.edgeType, connection.properties);
                    if (edge) {
                        edgeIds.push(edge.id);
                        deltaSet.operations.push({
                            id: (0, index_js_1.generateId)(),
                            type: 'add_edge',
                            targetId: edge.id,
                            targetType: 'edge',
                            after: edge,
                            timestamp: Date.now(),
                            reversible: true,
                            metadata: {},
                        });
                    }
                }
                if (connection.direction === 'incoming' || connection.direction === 'both') {
                    const edge = await this.sandboxGraph.addEdge(connection.nodeId, node.id, connection.edgeType, connection.properties);
                    if (edge) {
                        edgeIds.push(edge.id);
                        deltaSet.operations.push({
                            id: (0, index_js_1.generateId)(),
                            type: 'add_edge',
                            targetId: edge.id,
                            targetType: 'edge',
                            after: edge,
                            timestamp: Date.now(),
                            reversible: true,
                            metadata: {},
                        });
                    }
                }
            }
        }
        return { nodeId: node.id, edgeIds };
    }
    async executeRemoveNode(params, deltaSet) {
        const node = await this.sandboxGraph.getNode(params.nodeId);
        if (!node) {
            throw new index_js_1.InvalidDeltaError(`Node not found: ${params.nodeId}`);
        }
        const edgeIds = [];
        // If cascade, record affected edges
        if (params.cascade) {
            const edges = await this.sandboxGraph.getAllEdges(params.nodeId);
            for (const edge of edges) {
                edgeIds.push(edge.id);
                deltaSet.operations.push({
                    id: (0, index_js_1.generateId)(),
                    type: 'remove_edge',
                    targetId: edge.id,
                    targetType: 'edge',
                    before: edge,
                    timestamp: Date.now(),
                    reversible: true,
                    metadata: {},
                });
            }
        }
        // Record node removal
        deltaSet.operations.push({
            id: (0, index_js_1.generateId)(),
            type: 'remove_node',
            targetId: params.nodeId,
            targetType: 'node',
            before: node,
            timestamp: Date.now(),
            reversible: true,
            metadata: {},
        });
        await this.sandboxGraph.removeNode(params.nodeId, params.cascade);
        return { nodeId: params.nodeId, edgeIds };
    }
    async executeUpdateNode(params, deltaSet) {
        const before = await this.sandboxGraph.getNode(params.nodeId);
        if (!before) {
            throw new index_js_1.InvalidDeltaError(`Node not found: ${params.nodeId}`);
        }
        const after = await this.sandboxGraph.updateNode(params.nodeId, params.properties, params.merge);
        deltaSet.operations.push({
            id: (0, index_js_1.generateId)(),
            type: 'update_node',
            targetId: params.nodeId,
            targetType: 'node',
            before,
            after,
            timestamp: Date.now(),
            reversible: true,
            metadata: {},
        });
        return { nodeId: params.nodeId };
    }
    // ============================================================================
    // Edge Operations
    // ============================================================================
    async executeAddEdge(params, deltaSet) {
        const edge = await this.sandboxGraph.addEdge(params.sourceId, params.targetId, params.type, params.properties, params.weight);
        if (!edge) {
            throw new index_js_1.InvalidDeltaError(`Failed to create edge: endpoints may not exist`, { sourceId: params.sourceId, targetId: params.targetId });
        }
        deltaSet.operations.push({
            id: (0, index_js_1.generateId)(),
            type: 'add_edge',
            targetId: edge.id,
            targetType: 'edge',
            after: edge,
            timestamp: Date.now(),
            reversible: true,
            metadata: {},
        });
        return { edgeId: edge.id };
    }
    async executeRemoveEdge(params, deltaSet) {
        const edge = await this.sandboxGraph.getEdge(params.edgeId);
        if (!edge) {
            throw new index_js_1.InvalidDeltaError(`Edge not found: ${params.edgeId}`);
        }
        deltaSet.operations.push({
            id: (0, index_js_1.generateId)(),
            type: 'remove_edge',
            targetId: params.edgeId,
            targetType: 'edge',
            before: edge,
            timestamp: Date.now(),
            reversible: true,
            metadata: {},
        });
        await this.sandboxGraph.removeEdge(params.edgeId);
        return { edgeId: params.edgeId };
    }
    async executeUpdateEdge(params, deltaSet) {
        const before = await this.sandboxGraph.getEdge(params.edgeId);
        if (!before) {
            throw new index_js_1.InvalidDeltaError(`Edge not found: ${params.edgeId}`);
        }
        const after = await this.sandboxGraph.updateEdge(params.edgeId, params.properties, params.weight);
        deltaSet.operations.push({
            id: (0, index_js_1.generateId)(),
            type: 'update_edge',
            targetId: params.edgeId,
            targetType: 'edge',
            before,
            after,
            timestamp: Date.now(),
            reversible: true,
            metadata: {},
        });
        return { edgeId: params.edgeId };
    }
    // ============================================================================
    // Timing Operations
    // ============================================================================
    async executeAdjustTiming(params, deltaSet) {
        const { targetId, targetType, delayMs, field } = params;
        if (targetType === 'node') {
            const node = await this.sandboxGraph.getNode(targetId);
            if (!node) {
                throw new index_js_1.InvalidDeltaError(`Node not found: ${targetId}`);
            }
            const currentValue = node.properties[field] || 0;
            const newValue = currentValue + delayMs;
            await this.sandboxGraph.updateNode(targetId, { [field]: newValue });
            deltaSet.operations.push({
                id: (0, index_js_1.generateId)(),
                type: 'adjust_timing',
                targetId,
                targetType: 'node',
                before: { [field]: currentValue },
                after: { [field]: newValue, delayMs },
                timestamp: Date.now(),
                reversible: true,
                metadata: { field, delayMs },
            });
        }
        else {
            const edge = await this.sandboxGraph.getEdge(targetId);
            if (!edge) {
                throw new index_js_1.InvalidDeltaError(`Edge not found: ${targetId}`);
            }
            const currentValue = edge.properties[field] || 0;
            const newValue = currentValue + delayMs;
            await this.sandboxGraph.updateEdge(targetId, { [field]: newValue });
            deltaSet.operations.push({
                id: (0, index_js_1.generateId)(),
                type: 'adjust_timing',
                targetId,
                targetType: 'edge',
                before: { [field]: currentValue },
                after: { [field]: newValue, delayMs },
                timestamp: Date.now(),
                reversible: true,
                metadata: { field, delayMs },
            });
        }
    }
    // ============================================================================
    // Rule Operations
    // ============================================================================
    async executeEnableRule(params, deltaSet) {
        const existingRule = this.rules.get(params.ruleId);
        const before = existingRule ? { ...existingRule } : undefined;
        const rule = {
            id: params.ruleId,
            name: params.ruleId,
            enabled: true,
            parameters: params.parameters || {},
            type: 'detection',
        };
        this.rules.set(params.ruleId, rule);
        deltaSet.operations.push({
            id: (0, index_js_1.generateId)(),
            type: 'enable_rule',
            targetId: params.ruleId,
            targetType: 'rule',
            before,
            after: rule,
            timestamp: Date.now(),
            reversible: true,
            metadata: {},
        });
    }
    async executeDisableRule(params, deltaSet) {
        const existingRule = this.rules.get(params.ruleId);
        if (existingRule) {
            const before = { ...existingRule };
            existingRule.enabled = false;
            deltaSet.operations.push({
                id: (0, index_js_1.generateId)(),
                type: 'disable_rule',
                targetId: params.ruleId,
                targetType: 'rule',
                before,
                after: existingRule,
                timestamp: Date.now(),
                reversible: true,
                metadata: {},
            });
        }
        else {
            // Create disabled rule entry
            const rule = {
                id: params.ruleId,
                name: params.ruleId,
                enabled: false,
                parameters: {},
                type: 'detection',
            };
            this.rules.set(params.ruleId, rule);
            deltaSet.operations.push({
                id: (0, index_js_1.generateId)(),
                type: 'disable_rule',
                targetId: params.ruleId,
                targetType: 'rule',
                after: rule,
                timestamp: Date.now(),
                reversible: true,
                metadata: {},
            });
        }
    }
    // ============================================================================
    // Parameter Operations
    // ============================================================================
    async executeSetParameter(params, deltaSet) {
        const before = this.parameters.get(params.key);
        this.parameters.set(params.key, params.value);
        deltaSet.operations.push({
            id: (0, index_js_1.generateId)(),
            type: 'set_parameter',
            targetId: params.key,
            targetType: 'parameter',
            before,
            after: params.value,
            timestamp: Date.now(),
            reversible: true,
            metadata: {},
        });
    }
    // ============================================================================
    // Rollback Operations
    // ============================================================================
    /**
     * Rollback a specific delta set
     */
    async rollback(deltaSet) {
        await this.sandboxGraph.rollbackDeltaSet(deltaSet);
        // Rollback rule and parameter changes
        const operations = [...deltaSet.operations].reverse();
        for (const op of operations) {
            if (op.type === 'enable_rule' || op.type === 'disable_rule') {
                if (op.before) {
                    this.rules.set(op.targetId, op.before);
                }
                else {
                    this.rules.delete(op.targetId);
                }
            }
            else if (op.type === 'set_parameter') {
                if (op.before !== undefined) {
                    this.parameters.set(op.targetId, op.before);
                }
                else {
                    this.parameters.delete(op.targetId);
                }
            }
        }
    }
    // ============================================================================
    // Convenience Methods
    // ============================================================================
    /**
     * Add a new entity (node) with common defaults
     */
    async addEntity(type, name, attributes = {}) {
        return this.execute({
            addNode: {
                labels: [type],
                properties: { name, type, ...attributes, createdAt: Date.now() },
            },
        }, `Add ${type}: ${name}`);
    }
    /**
     * Remove an entity by ID
     */
    async removeEntity(entityId) {
        return this.execute({
            removeNode: { nodeId: entityId, cascade: true },
        }, `Remove entity: ${entityId}`);
    }
    /**
     * Create a relationship between two entities
     */
    async createRelationship(fromId, toId, type, attributes = {}) {
        return this.execute({
            addEdge: {
                sourceId: fromId,
                targetId: toId,
                type,
                properties: attributes,
            },
        }, `Create relationship: ${type}`);
    }
    /**
     * Remove a relationship by ID
     */
    async removeRelationship(relationshipId) {
        return this.execute({
            removeEdge: { edgeId: relationshipId },
        }, `Remove relationship: ${relationshipId}`);
    }
    /**
     * Delay an event by a specified amount of time
     */
    async delayEvent(targetId, targetType, delayMs, timestampField = 'timestamp') {
        return this.execute({
            adjustTiming: {
                targetId,
                targetType,
                delayMs,
                field: timestampField,
            },
        }, `Delay event by ${delayMs}ms`);
    }
    /**
     * Simulate enabling a detection rule
     */
    async enableDetectionRule(ruleId, parameters) {
        return this.execute({
            enableRule: { ruleId, parameters },
        }, `Enable rule: ${ruleId}`);
    }
    /**
     * Simulate disabling a detection rule
     */
    async disableDetectionRule(ruleId) {
        return this.execute({
            disableRule: { ruleId },
        }, `Disable rule: ${ruleId}`);
    }
    /**
     * Set a scenario parameter
     */
    async setScenarioParameter(key, value) {
        return this.execute({
            setParameter: { key, value },
        }, `Set parameter: ${key}`);
    }
    /**
     * Isolate a subgraph by removing all edges to nodes outside the specified set
     */
    async isolateSubgraph(nodeIds) {
        const operations = [];
        const nodeIdSet = new Set(nodeIds);
        for (const nodeId of nodeIds) {
            const edges = await this.sandboxGraph.getAllEdges(nodeId);
            for (const edge of edges) {
                const otherNodeId = edge.sourceId === nodeId ? edge.targetId : edge.sourceId;
                if (!nodeIdSet.has(otherNodeId)) {
                    operations.push({
                        removeEdge: { edgeId: edge.id },
                    });
                }
            }
        }
        return this.executeBatch(operations, 'Isolate subgraph');
    }
    /**
     * Connect two existing nodes
     */
    async connectNodes(nodeId1, nodeId2, edgeType, bidirectional = false) {
        const operations = [
            {
                addEdge: {
                    sourceId: nodeId1,
                    targetId: nodeId2,
                    type: edgeType,
                },
            },
        ];
        if (bidirectional) {
            operations.push({
                addEdge: {
                    sourceId: nodeId2,
                    targetId: nodeId1,
                    type: edgeType,
                },
            });
        }
        return this.executeBatch(operations, `Connect nodes: ${edgeType}`);
    }
    // ============================================================================
    // State Access
    // ============================================================================
    getEnabledRules() {
        return Array.from(this.rules.values()).filter(r => r.enabled);
    }
    getDisabledRules() {
        return Array.from(this.rules.values()).filter(r => !r.enabled);
    }
    getAllRules() {
        return Array.from(this.rules.values());
    }
    getRuleById(ruleId) {
        return this.rules.get(ruleId);
    }
    getParameter(key) {
        return this.parameters.get(key);
    }
    getAllParameters() {
        return Object.fromEntries(this.parameters);
    }
    getSandboxGraph() {
        return this.sandboxGraph;
    }
}
exports.WhatIfOperations = WhatIfOperations;
