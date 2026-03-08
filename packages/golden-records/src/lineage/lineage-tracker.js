"use strict";
/**
 * Lineage Tracker
 * Tracks data lineage and provenance for golden records
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineageTracker = void 0;
const uuid_1 = require("uuid");
class LineageTracker {
    lineages;
    operations;
    constructor() {
        this.lineages = new Map();
        this.operations = new Map();
    }
    /**
     * Initialize lineage for a new record
     */
    initializeLineage(recordId) {
        const lineage = {
            sourceOperations: [],
            transformations: [],
            matchingHistory: [],
            mergeHistory: []
        };
        this.lineages.set(recordId, lineage);
        return lineage;
    }
    /**
     * Track a source operation
     */
    trackSourceOperation(recordId, operationType, user, sourceSystem, changes = []) {
        const operation = {
            operationId: (0, uuid_1.v4)(),
            operationType,
            timestamp: new Date(),
            user,
            sourceSystem,
            changes
        };
        const lineage = this.lineages.get(recordId);
        if (lineage) {
            lineage.sourceOperations.push(operation);
        }
        this.operations.set(operation.operationId, operation);
        return operation;
    }
    /**
     * Track a transformation
     */
    trackTransformation(recordId, transformationType, inputData, outputData, ruleName) {
        const transformation = {
            stepId: (0, uuid_1.v4)(),
            transformationType,
            inputData,
            outputData,
            timestamp: new Date(),
            ruleName
        };
        const lineage = this.lineages.get(recordId);
        if (lineage) {
            lineage.transformations.push(transformation);
        }
        return transformation;
    }
    /**
     * Track a matching event
     */
    trackMatchingEvent(recordId, matchedRecords, matchScore, matchAlgorithm, autoApproved) {
        const event = {
            eventId: (0, uuid_1.v4)(),
            matchedRecords,
            matchScore,
            matchAlgorithm,
            timestamp: new Date(),
            autoApproved
        };
        const lineage = this.lineages.get(recordId);
        if (lineage) {
            lineage.matchingHistory.push(event);
        }
        return event;
    }
    /**
     * Track a merge event
     */
    trackMergeEvent(recordId, mergeEvent) {
        const lineage = this.lineages.get(recordId);
        if (lineage) {
            lineage.mergeHistory.push(mergeEvent);
        }
    }
    /**
     * Get full lineage for a record
     */
    getLineage(recordId) {
        return this.lineages.get(recordId);
    }
    /**
     * Query lineage based on criteria
     */
    queryLineage(query) {
        let results = Array.from(this.operations.values());
        if (query.operationType) {
            results = results.filter(op => op.operationType === query.operationType);
        }
        if (query.sourceSystem) {
            results = results.filter(op => op.sourceSystem === query.sourceSystem);
        }
        if (query.user) {
            results = results.filter(op => op.user === query.user);
        }
        if (query.startDate) {
            results = results.filter(op => op.timestamp >= query.startDate);
        }
        if (query.endDate) {
            results = results.filter(op => op.timestamp <= query.endDate);
        }
        return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    /**
     * Build lineage graph for visualization
     */
    buildLineageGraph(recordId) {
        const lineage = this.lineages.get(recordId);
        if (!lineage) {
            return { nodes: [], edges: [] };
        }
        const nodes = [];
        const edges = [];
        // Add record node
        nodes.push({
            id: recordId,
            type: 'record',
            label: `Record ${recordId.substring(0, 8)}`,
            metadata: {}
        });
        // Add source operation nodes
        for (const op of lineage.sourceOperations) {
            nodes.push({
                id: op.operationId,
                type: 'operation',
                label: `${op.operationType} by ${op.user}`,
                metadata: {
                    timestamp: op.timestamp,
                    sourceSystem: op.sourceSystem
                }
            });
            edges.push({
                id: (0, uuid_1.v4)(),
                source: op.operationId,
                target: recordId,
                type: 'derived_from',
                metadata: {
                    changes: op.changes.length
                }
            });
            if (op.sourceSystem) {
                const sourceId = `source-${op.sourceSystem}`;
                if (!nodes.find(n => n.id === sourceId)) {
                    nodes.push({
                        id: sourceId,
                        type: 'source',
                        label: op.sourceSystem,
                        metadata: {}
                    });
                }
                edges.push({
                    id: (0, uuid_1.v4)(),
                    source: sourceId,
                    target: op.operationId,
                    type: 'sourced_from',
                    metadata: {}
                });
            }
        }
        // Add transformation nodes
        for (const transform of lineage.transformations) {
            nodes.push({
                id: transform.stepId,
                type: 'transformation',
                label: transform.transformationType,
                metadata: {
                    timestamp: transform.timestamp,
                    ruleName: transform.ruleName
                }
            });
            edges.push({
                id: (0, uuid_1.v4)(),
                source: transform.stepId,
                target: recordId,
                type: 'transformed_by',
                metadata: {}
            });
        }
        // Add merge history
        for (const merge of lineage.mergeHistory) {
            for (const sourceRecordId of merge.sourceRecords) {
                if (sourceRecordId !== recordId) {
                    edges.push({
                        id: (0, uuid_1.v4)(),
                        source: sourceRecordId,
                        target: recordId,
                        type: 'merged_from',
                        metadata: {
                            timestamp: merge.timestamp,
                            mergedBy: merge.mergedBy
                        }
                    });
                }
            }
        }
        return { nodes, edges };
    }
    /**
     * Get operation history for a record
     */
    getOperationHistory(recordId) {
        const lineage = this.lineages.get(recordId);
        if (!lineage)
            return [];
        return lineage.sourceOperations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    /**
     * Get transformation history for a record
     */
    getTransformationHistory(recordId) {
        const lineage = this.lineages.get(recordId);
        if (!lineage)
            return [];
        return lineage.transformations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    /**
     * Trace field value back to source
     */
    traceFieldToSource(recordId, fieldName) {
        const lineage = this.lineages.get(recordId);
        if (!lineage)
            return [];
        const trace = [];
        for (const op of lineage.sourceOperations) {
            const change = op.changes.find(c => c.fieldName === fieldName);
            if (change) {
                trace.push({
                    operation: op,
                    value: change.newValue,
                    source: change.source
                });
            }
        }
        return trace.sort((a, b) => b.operation.timestamp.getTime() - a.operation.timestamp.getTime());
    }
}
exports.LineageTracker = LineageTracker;
