/**
 * Impact Analyzer - Analyze downstream impact of changes
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ImpactAnalysis,
  LineageNode,
  LineageEdge,
  ChangeType,
  RiskLevel,
  AffectedNode,
  AffectedColumn,
  ImpactScope,
  ImpactEstimate,
  ImpactRecommendation,
  ColumnMetadata,
} from '../types.js';

export class ImpactAnalyzer {
  /**
   * Analyze the impact of a change to a node
   */
  analyzeImpact(
    sourceNode: LineageNode,
    changeType: ChangeType,
    changeDescription: string,
    allNodes: LineageNode[],
    allEdges: LineageEdge[],
    options: {
      maxDepth?: number;
      includeIndirect?: boolean;
      criticalSystems?: string[];
    } = {}
  ): ImpactAnalysis {
    const maxDepth = options.maxDepth || 10;
    const affectedNodes: AffectedNode[] = [];
    const affectedColumns: AffectedColumn[] = [];
    const visited = new Set<string>();

    // Traverse downstream to find affected nodes
    this.traverseDownstream(
      sourceNode.id,
      0,
      maxDepth,
      allNodes,
      allEdges,
      affectedNodes,
      visited,
      options.includeIndirect !== false
    );

    // Analyze column-level impact if applicable
    if (this.isColumnLevelChange(changeType)) {
      this.analyzeColumnImpact(
        sourceNode,
        changeType,
        allNodes,
        allEdges,
        affectedColumns
      );
    }

    // Calculate impact scope
    const impactScope = this.calculateImpactScope(
      affectedNodes,
      affectedColumns,
      options.criticalSystems
    );

    // Determine risk level
    const riskLevel = this.determineRiskLevel(
      changeType,
      impactScope,
      affectedNodes
    );

    // Generate impact estimate
    const estimatedImpact = this.estimateImpact(affectedNodes);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      sourceNode,
      changeType,
      affectedNodes,
      riskLevel
    );

    return {
      id: uuidv4(),
      sourceNode,
      changeType,
      changeDescription,
      impactScope,
      affectedNodes,
      affectedColumns,
      riskLevel,
      estimatedImpact,
      recommendations,
      analysisDate: new Date(),
    };
  }

  /**
   * Analyze the impact of a schema change
   */
  analyzeSchemaChange(
    node: LineageNode,
    schemaChanges: {
      addedColumns?: string[];
      removedColumns?: string[];
      renamedColumns?: Array<{ old: string; new: string }>;
      typeChanges?: Array<{ column: string; oldType: string; newType: string }>;
    },
    allNodes: LineageNode[],
    allEdges: LineageEdge[]
  ): ImpactAnalysis {
    let changeType: ChangeType = 'schema-change';
    let changeDescription = 'Schema changes: ';
    const changes: string[] = [];

    if (schemaChanges.addedColumns?.length) {
      changes.push(`Added columns: ${schemaChanges.addedColumns.join(', ')}`);
      changeType = 'column-add';
    }

    if (schemaChanges.removedColumns?.length) {
      changes.push(`Removed columns: ${schemaChanges.removedColumns.join(', ')}`);
      changeType = 'column-remove';
    }

    if (schemaChanges.renamedColumns?.length) {
      const renames = schemaChanges.renamedColumns
        .map(r => `${r.old} -> ${r.new}`)
        .join(', ');
      changes.push(`Renamed columns: ${renames}`);
      changeType = 'column-rename';
    }

    if (schemaChanges.typeChanges?.length) {
      const typeChanges = schemaChanges.typeChanges
        .map(t => `${t.column}: ${t.oldType} -> ${t.newType}`)
        .join(', ');
      changes.push(`Type changes: ${typeChanges}`);
      changeType = 'datatype-change';
    }

    changeDescription += changes.join('; ');

    return this.analyzeImpact(node, changeType, changeDescription, allNodes, allEdges);
  }

  /**
   * Analyze the impact of removing a node
   */
  analyzeNodeRemoval(
    node: LineageNode,
    allNodes: LineageNode[],
    allEdges: LineageEdge[],
    replacementNode?: LineageNode
  ): ImpactAnalysis {
    const changeDescription = replacementNode
      ? `Node ${node.name} will be removed and replaced by ${replacementNode.name}`
      : `Node ${node.name} will be removed`;

    const analysis = this.analyzeImpact(
      node,
      'removal',
      changeDescription,
      allNodes,
      allEdges
    );

    // Mark all affected nodes as breaking changes
    for (const affected of analysis.affectedNodes) {
      affected.breakingChange = true;
      affected.migrationRequired = true;
    }

    return analysis;
  }

  /**
   * Analyze the impact of transformation changes
   */
  analyzeTransformationChange(
    node: LineageNode,
    oldTransformation: string,
    newTransformation: string,
    allNodes: LineageNode[],
    allEdges: LineageEdge[]
  ): ImpactAnalysis {
    const changeDescription = `Transformation logic changed from "${oldTransformation}" to "${newTransformation}"`;

    return this.analyzeImpact(
      node,
      'transformation-change',
      changeDescription,
      allNodes,
      allEdges
    );
  }

  /**
   * Compare two versions of a node to identify changes
   */
  compareNodeVersions(
    oldVersion: LineageNode,
    newVersion: LineageNode
  ): {
    hasChanges: boolean;
    changes: Array<{ type: ChangeType; description: string }>;
  } {
    const changes: Array<{ type: ChangeType; description: string }> = [];

    // Compare columns
    const oldColumns = new Set(oldVersion.columns.map(c => c.name));
    const newColumns = new Set(newVersion.columns.map(c => c.name));

    // Added columns
    const added = Array.from(newColumns).filter(c => !oldColumns.has(c));
    if (added.length > 0) {
      changes.push({
        type: 'column-add',
        description: `Added columns: ${added.join(', ')}`,
      });
    }

    // Removed columns
    const removed = Array.from(oldColumns).filter(c => !newColumns.has(c));
    if (removed.length > 0) {
      changes.push({
        type: 'column-remove',
        description: `Removed columns: ${removed.join(', ')}`,
      });
    }

    // Type changes
    for (const oldCol of oldVersion.columns) {
      const newCol = newVersion.columns.find(c => c.name === oldCol.name);
      if (newCol && oldCol.dataType !== newCol.dataType) {
        changes.push({
          type: 'datatype-change',
          description: `Column ${oldCol.name} type changed from ${oldCol.dataType} to ${newCol.dataType}`,
        });
      }
    }

    // Compare metadata
    if (oldVersion.type !== newVersion.type) {
      changes.push({
        type: 'schema-change',
        description: `Node type changed from ${oldVersion.type} to ${newVersion.type}`,
      });
    }

    return {
      hasChanges: changes.length > 0,
      changes,
    };
  }

  /**
   * Estimate the blast radius of a change
   */
  estimateBlastRadius(
    node: LineageNode,
    allNodes: LineageNode[],
    allEdges: LineageEdge[],
    maxDepth: number = 20
  ): {
    directlyAffected: number;
    indirectlyAffected: number;
    totalAffected: number;
    criticalPathsAffected: number;
  } {
    const affectedNodes: AffectedNode[] = [];
    const visited = new Set<string>();

    this.traverseDownstream(
      node.id,
      0,
      maxDepth,
      allNodes,
      allEdges,
      affectedNodes,
      visited,
      true
    );

    const directlyAffected = affectedNodes.filter(n => n.impactType === 'direct').length;
    const indirectlyAffected = affectedNodes.filter(n => n.impactType === 'indirect').length;

    // Estimate critical paths (nodes that are reports, dashboards, or ML models)
    const criticalTypes = ['report', 'dashboard', 'ml-model'];
    const criticalPathsAffected = affectedNodes.filter(n =>
      criticalTypes.includes(n.node.type)
    ).length;

    return {
      directlyAffected,
      indirectlyAffected,
      totalAffected: affectedNodes.length,
      criticalPathsAffected,
    };
  }

  // Private helper methods

  private traverseDownstream(
    nodeId: string,
    currentDepth: number,
    maxDepth: number,
    allNodes: LineageNode[],
    allEdges: LineageEdge[],
    affectedNodes: AffectedNode[],
    visited: Set<string>,
    includeIndirect: boolean
  ): void {
    if (currentDepth >= maxDepth || visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);

    // Find outgoing edges
    const outgoingEdges = allEdges.filter(e => e.sourceNodeId === nodeId);

    for (const edge of outgoingEdges) {
      const targetNode = allNodes.find(n => n.id === edge.targetNodeId);
      if (!targetNode) continue;

      const impactType = currentDepth === 0 ? 'direct' : 'indirect';

      // Skip indirect impacts if not requested
      if (!includeIndirect && impactType === 'indirect') {
        continue;
      }

      const severity = this.calculateNodeSeverity(targetNode, currentDepth);
      const breakingChange = this.isBreakingChange(edge);

      affectedNodes.push({
        node: targetNode,
        distance: currentDepth + 1,
        impactType,
        severity,
        breakingChange,
        migrationRequired: breakingChange,
        estimatedEffort: this.estimateEffort(targetNode, breakingChange),
      });

      // Continue traversal
      this.traverseDownstream(
        targetNode.id,
        currentDepth + 1,
        maxDepth,
        allNodes,
        allEdges,
        affectedNodes,
        visited,
        includeIndirect
      );
    }
  }

  private analyzeColumnImpact(
    sourceNode: LineageNode,
    changeType: ChangeType,
    allNodes: LineageNode[],
    allEdges: LineageEdge[],
    affectedColumns: AffectedColumn[]
  ): void {
    // Find all edges from this node
    const outgoingEdges = allEdges.filter(e => e.sourceNodeId === sourceNode.id);

    for (const edge of outgoingEdges) {
      const targetNode = allNodes.find(n => n.id === edge.targetNodeId);
      if (!targetNode) continue;

      // Analyze each column mapping
      for (const mapping of edge.columnMappings) {
        const breakingChange = changeType === 'column-remove' || changeType === 'datatype-change';

        affectedColumns.push({
          nodeId: targetNode.id,
          nodeName: targetNode.name,
          columnName: mapping.targetColumn,
          impactDescription: this.getColumnImpactDescription(changeType, mapping.targetColumn),
          breakingChange,
          suggestedAction: this.suggestColumnAction(changeType, mapping.targetColumn),
        });
      }
    }
  }

  private calculateImpactScope(
    affectedNodes: AffectedNode[],
    affectedColumns: AffectedColumn[],
    criticalSystems?: string[]
  ): ImpactScope {
    const maxDistance = Math.max(...affectedNodes.map(n => n.distance), 0);

    const criticalSystemsAffected = affectedNodes
      .filter(n => criticalSystems?.includes(n.node.name))
      .map(n => n.node.name);

    return {
      totalNodesAffected: affectedNodes.length,
      totalColumnsAffected: affectedColumns.length,
      downstreamDepth: maxDistance,
      criticalSystemsAffected,
    };
  }

  private determineRiskLevel(
    changeType: ChangeType,
    impactScope: ImpactScope,
    affectedNodes: AffectedNode[]
  ): RiskLevel {
    // Critical if any critical systems are affected or breaking changes to many nodes
    if (impactScope.criticalSystemsAffected.length > 0) {
      return 'critical';
    }

    const breakingChangeCount = affectedNodes.filter(n => n.breakingChange).length;

    if (breakingChangeCount > 10) {
      return 'critical';
    } else if (breakingChangeCount > 5) {
      return 'high';
    } else if (breakingChangeCount > 0) {
      return 'medium';
    } else if (affectedNodes.length > 20) {
      return 'medium';
    } else if (affectedNodes.length > 0) {
      return 'low';
    }

    return 'informational';
  }

  private estimateImpact(affectedNodes: AffectedNode[]): ImpactEstimate {
    const systemsImpacted = affectedNodes.length;
    const reportsImpacted = affectedNodes.filter(n => n.node.type === 'report').length;
    const dashboardsImpacted = affectedNodes.filter(n => n.node.type === 'dashboard').length;
    const mlModelsImpacted = affectedNodes.filter(n => n.node.type === 'ml-model').length;

    const breakingChanges = affectedNodes.filter(n => n.breakingChange).length;

    let estimatedDowntime = 'None';
    if (breakingChanges > 10) {
      estimatedDowntime = '4-8 hours';
    } else if (breakingChanges > 5) {
      estimatedDowntime = '2-4 hours';
    } else if (breakingChanges > 0) {
      estimatedDowntime = '1-2 hours';
    }

    let estimatedMigrationEffort = 'Minimal';
    if (breakingChanges > 20) {
      estimatedMigrationEffort = 'High (2-3 weeks)';
    } else if (breakingChanges > 10) {
      estimatedMigrationEffort = 'Medium (1-2 weeks)';
    } else if (breakingChanges > 5) {
      estimatedMigrationEffort = 'Low (3-5 days)';
    }

    return {
      systemsImpacted,
      reportsImpacted,
      dashboardsImpacted,
      mlModelsImpacted,
      estimatedDowntime,
      estimatedMigrationEffort,
    };
  }

  private generateRecommendations(
    sourceNode: LineageNode,
    changeType: ChangeType,
    affectedNodes: AffectedNode[],
    riskLevel: RiskLevel
  ): ImpactRecommendation[] {
    const recommendations: ImpactRecommendation[] = [];

    // High priority recommendations based on risk
    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push({
        priority: 'high',
        category: 'Testing',
        action: 'Conduct comprehensive integration testing before deployment',
        rationale: 'High-risk change affecting critical systems',
        estimatedEffort: '2-3 days',
      });

      recommendations.push({
        priority: 'high',
        category: 'Communication',
        action: 'Notify all affected system owners and stakeholders',
        rationale: 'Multiple systems will be impacted by this change',
        estimatedEffort: '1 day',
      });
    }

    // Breaking change recommendations
    const breakingChanges = affectedNodes.filter(n => n.breakingChange);
    if (breakingChanges.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Migration',
        action: `Create migration plan for ${breakingChanges.length} affected systems`,
        rationale: 'Breaking changes require coordinated migration',
        estimatedEffort: '3-5 days',
      });

      recommendations.push({
        priority: 'medium',
        category: 'Versioning',
        action: 'Consider implementing backward compatibility or versioning',
        rationale: 'Reduce impact of breaking changes',
        estimatedEffort: '2-3 days',
      });
    }

    // Change-type specific recommendations
    if (changeType === 'column-remove') {
      recommendations.push({
        priority: 'high',
        category: 'Deprecation',
        action: 'Implement deprecation period before removing columns',
        rationale: 'Give downstream systems time to adapt',
        estimatedEffort: '1 week',
      });
    }

    if (changeType === 'datatype-change') {
      recommendations.push({
        priority: 'medium',
        category: 'Data Quality',
        action: 'Validate data conversions and ensure no data loss',
        rationale: 'Type changes can cause data loss or corruption',
        estimatedEffort: '1-2 days',
      });
    }

    // Report/Dashboard recommendations
    const reportsAffected = affectedNodes.filter(n => n.node.type === 'report' || n.node.type === 'dashboard');
    if (reportsAffected.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Validation',
        action: `Verify and test ${reportsAffected.length} affected reports/dashboards`,
        rationale: 'Ensure visualizations and calculations remain correct',
        estimatedEffort: '2-3 days',
      });
    }

    // ML Model recommendations
    const mlModelsAffected = affectedNodes.filter(n => n.node.type === 'ml-model');
    if (mlModelsAffected.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'ML Operations',
        action: `Retrain and validate ${mlModelsAffected.length} affected ML models`,
        rationale: 'Schema changes may affect model performance and predictions',
        estimatedEffort: '1-2 weeks',
      });
    }

    return recommendations;
  }

  private isColumnLevelChange(changeType: ChangeType): boolean {
    return [
      'column-add',
      'column-remove',
      'column-rename',
      'datatype-change',
    ].includes(changeType);
  }

  private calculateNodeSeverity(node: LineageNode, distance: number): RiskLevel {
    // Critical nodes (reports, dashboards, ML models)
    if (['report', 'dashboard', 'ml-model'].includes(node.type)) {
      return distance === 0 ? 'critical' : 'high';
    }

    // High importance nodes
    if (['materialized-view', 'api'].includes(node.type)) {
      return distance === 0 ? 'high' : 'medium';
    }

    // Medium importance
    if (distance < 3) {
      return 'medium';
    }

    return 'low';
  }

  private isBreakingChange(edge: LineageEdge): boolean {
    // Consider transformation changes as potentially breaking
    return edge.type === 'transformation' && edge.confidence < 0.9;
  }

  private estimateEffort(node: LineageNode, breakingChange: boolean): string {
    if (breakingChange) {
      if (node.type === 'ml-model') {
        return '1-2 weeks';
      } else if (['report', 'dashboard'].includes(node.type)) {
        return '2-3 days';
      } else {
        return '3-5 days';
      }
    }

    return '1-2 days';
  }

  private getColumnImpactDescription(changeType: ChangeType, columnName: string): string {
    switch (changeType) {
      case 'column-remove':
        return `Column ${columnName} will no longer be available`;
      case 'column-rename':
        return `Column ${columnName} reference needs to be updated`;
      case 'datatype-change':
        return `Column ${columnName} data type will change, may affect calculations`;
      case 'column-add':
        return `New column ${columnName} will be available`;
      default:
        return `Column ${columnName} may be affected`;
    }
  }

  private suggestColumnAction(changeType: ChangeType, columnName: string): string {
    switch (changeType) {
      case 'column-remove':
        return `Update queries to remove reference to ${columnName} or find alternative`;
      case 'column-rename':
        return `Update all references to use new column name`;
      case 'datatype-change':
        return `Review and update any type-specific operations on ${columnName}`;
      case 'column-add':
        return `Consider incorporating ${columnName} into analysis`;
      default:
        return `Review usage of ${columnName}`;
    }
  }
}
