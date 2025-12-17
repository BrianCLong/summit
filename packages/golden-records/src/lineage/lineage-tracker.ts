/**
 * Lineage Tracker
 * Tracks data lineage and provenance for golden records
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  RecordLineage,
  LineageOperation,
  TransformationStep,
  MatchingEvent,
  MergeEvent
} from '@summit/mdm-core';

export interface LineageQuery {
  recordId?: string;
  operationType?: string;
  sourceSystem?: string;
  startDate?: Date;
  endDate?: Date;
  user?: string;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

export interface LineageNode {
  id: string;
  type: 'record' | 'operation' | 'source' | 'transformation';
  label: string;
  metadata: Record<string, unknown>;
}

export interface LineageEdge {
  id: string;
  source: string;
  target: string;
  type: 'derived_from' | 'transformed_by' | 'merged_from' | 'sourced_from';
  metadata: Record<string, unknown>;
}

export class LineageTracker {
  private lineages: Map<string, RecordLineage>;
  private operations: Map<string, LineageOperation>;

  constructor() {
    this.lineages = new Map();
    this.operations = new Map();
  }

  /**
   * Initialize lineage for a new record
   */
  initializeLineage(recordId: string): RecordLineage {
    const lineage: RecordLineage = {
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
  trackSourceOperation(
    recordId: string,
    operationType: 'create' | 'update' | 'merge' | 'split' | 'delete',
    user: string,
    sourceSystem?: string,
    changes: Array<{
      fieldName: string;
      oldValue: unknown;
      newValue: unknown;
      source: string;
      confidence: number;
    }> = []
  ): LineageOperation {
    const operation: LineageOperation = {
      operationId: uuidv4(),
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
  trackTransformation(
    recordId: string,
    transformationType: string,
    inputData: Record<string, unknown>,
    outputData: Record<string, unknown>,
    ruleName?: string
  ): TransformationStep {
    const transformation: TransformationStep = {
      stepId: uuidv4(),
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
  trackMatchingEvent(
    recordId: string,
    matchedRecords: string[],
    matchScore: number,
    matchAlgorithm: string,
    autoApproved: boolean
  ): MatchingEvent {
    const event: MatchingEvent = {
      eventId: uuidv4(),
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
  trackMergeEvent(
    recordId: string,
    mergeEvent: MergeEvent
  ): void {
    const lineage = this.lineages.get(recordId);
    if (lineage) {
      lineage.mergeHistory.push(mergeEvent);
    }
  }

  /**
   * Get full lineage for a record
   */
  getLineage(recordId: string): RecordLineage | undefined {
    return this.lineages.get(recordId);
  }

  /**
   * Query lineage based on criteria
   */
  queryLineage(query: LineageQuery): LineageOperation[] {
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
      results = results.filter(op => op.timestamp >= query.startDate!);
    }

    if (query.endDate) {
      results = results.filter(op => op.timestamp <= query.endDate!);
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Build lineage graph for visualization
   */
  buildLineageGraph(recordId: string): LineageGraph {
    const lineage = this.lineages.get(recordId);
    if (!lineage) {
      return { nodes: [], edges: [] };
    }

    const nodes: LineageNode[] = [];
    const edges: LineageEdge[] = [];

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
        id: uuidv4(),
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
          id: uuidv4(),
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
        id: uuidv4(),
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
            id: uuidv4(),
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
  getOperationHistory(recordId: string): LineageOperation[] {
    const lineage = this.lineages.get(recordId);
    if (!lineage) return [];

    return lineage.sourceOperations.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Get transformation history for a record
   */
  getTransformationHistory(recordId: string): TransformationStep[] {
    const lineage = this.lineages.get(recordId);
    if (!lineage) return [];

    return lineage.transformations.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Trace field value back to source
   */
  traceFieldToSource(
    recordId: string,
    fieldName: string
  ): Array<{
    operation: LineageOperation;
    value: unknown;
    source: string;
  }> {
    const lineage = this.lineages.get(recordId);
    if (!lineage) return [];

    const trace: Array<{
      operation: LineageOperation;
      value: unknown;
      source: string;
    }> = [];

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

    return trace.sort(
      (a, b) => b.operation.timestamp.getTime() - a.operation.timestamp.getTime()
    );
  }
}
