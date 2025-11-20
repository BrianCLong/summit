/**
 * Lineage Service
 * Service for tracking and analyzing data lineage
 */

import {
  LineageGraph,
  LineageNode,
  LineageEdge,
  LineageDirection,
  LineageLevel,
  LineageRequest,
  ImpactAnalysisResult,
  ImpactedAsset,
  ImpactLevel,
  ColumnLineage,
} from '../types/lineage.js';
import { AssetMetadata } from '../types/catalog.js';

export interface ILineageStore {
  getLineage(request: LineageRequest): Promise<LineageGraph>;
  addLineageEdge(edge: LineageEdge): Promise<LineageEdge>;
  removeLineageEdge(edgeId: string): Promise<void>;
  getColumnLineage(assetId: string, columnName: string): Promise<ColumnLineage | null>;
}

export class LineageService {
  constructor(private store: ILineageStore) {}

  /**
   * Get lineage graph for an asset
   */
  async getLineage(request: LineageRequest): Promise<LineageGraph> {
    return this.store.getLineage(request);
  }

  /**
   * Get upstream lineage
   */
  async getUpstreamLineage(
    assetId: string,
    depth: number = 5,
    level: LineageLevel = LineageLevel.TABLE
  ): Promise<LineageGraph> {
    const request: LineageRequest = {
      assetId,
      direction: LineageDirection.UPSTREAM,
      level,
      depth,
      includeTransformations: true,
    };

    return this.store.getLineage(request);
  }

  /**
   * Get downstream lineage
   */
  async getDownstreamLineage(
    assetId: string,
    depth: number = 5,
    level: LineageLevel = LineageLevel.TABLE
  ): Promise<LineageGraph> {
    const request: LineageRequest = {
      assetId,
      direction: LineageDirection.DOWNSTREAM,
      level,
      depth,
      includeTransformations: true,
    };

    return this.store.getLineage(request);
  }

  /**
   * Get end-to-end lineage
   */
  async getEndToEndLineage(
    assetId: string,
    depth: number = 5,
    level: LineageLevel = LineageLevel.TABLE
  ): Promise<LineageGraph> {
    const request: LineageRequest = {
      assetId,
      direction: LineageDirection.BOTH,
      level,
      depth,
      includeTransformations: true,
    };

    return this.store.getLineage(request);
  }

  /**
   * Get column-level lineage
   */
  async getColumnLineage(assetId: string, columnName: string): Promise<ColumnLineage | null> {
    return this.store.getColumnLineage(assetId, columnName);
  }

  /**
   * Add lineage relationship
   */
  async addLineage(edge: Omit<LineageEdge, 'id'>): Promise<LineageEdge> {
    const newEdge: LineageEdge = {
      ...edge,
      id: this.generateLineageId(edge.fromNodeId, edge.toNodeId),
    };

    return this.store.addLineageEdge(newEdge);
  }

  /**
   * Remove lineage relationship
   */
  async removeLineage(edgeId: string): Promise<void> {
    await this.store.removeLineageEdge(edgeId);
  }

  /**
   * Perform impact analysis
   */
  async analyzeImpact(assetId: string, depth: number = 10): Promise<ImpactAnalysisResult> {
    const lineage = await this.getDownstreamLineage(assetId, depth);

    const impactedAssets: ImpactedAsset[] = lineage.nodes
      .filter((node) => node.assetId !== assetId)
      .map((node) => ({
        assetId: node.assetId,
        assetName: node.name,
        assetType: node.type,
        impactLevel: this.calculateImpactLevel(node.level, lineage.edges),
        path: this.findPath(assetId, node.assetId, lineage),
      }));

    const criticalImpacts = impactedAssets.filter(
      (asset) => asset.impactLevel === ImpactLevel.CRITICAL || asset.impactLevel === ImpactLevel.HIGH
    ).length;

    return {
      assetId,
      impactedAssets,
      totalImpacted: impactedAssets.length,
      criticalImpacts,
    };
  }

  /**
   * Find critical paths in lineage
   */
  async findCriticalPaths(assetId: string): Promise<string[][]> {
    const lineage = await this.getEndToEndLineage(assetId, 10);

    const sources = lineage.nodes.filter((node) =>
      lineage.edges.every((edge) => edge.toNodeId !== node.id)
    );

    const sinks = lineage.nodes.filter((node) =>
      lineage.edges.every((edge) => edge.fromNodeId !== node.id)
    );

    const criticalPaths: string[][] = [];

    for (const source of sources) {
      for (const sink of sinks) {
        const path = this.findPath(source.assetId, sink.assetId, lineage);
        if (path.length > 3) {
          // Consider paths with 3+ hops as critical
          criticalPaths.push(path);
        }
      }
    }

    return criticalPaths;
  }

  /**
   * Calculate impact level based on distance and criticality
   */
  private calculateImpactLevel(distance: number, edges: LineageEdge[]): ImpactLevel {
    if (distance === 1) {
      return ImpactLevel.CRITICAL;
    } else if (distance === 2) {
      return ImpactLevel.HIGH;
    } else if (distance === 3) {
      return ImpactLevel.MEDIUM;
    } else {
      return ImpactLevel.LOW;
    }
  }

  /**
   * Find path between two assets
   */
  private findPath(fromAssetId: string, toAssetId: string, lineage: LineageGraph): string[] {
    const visited = new Set<string>();
    const queue: { assetId: string; path: string[] }[] = [{ assetId: fromAssetId, path: [fromAssetId] }];

    while (queue.length > 0) {
      const { assetId, path } = queue.shift()!;

      if (assetId === toAssetId) {
        return path;
      }

      if (visited.has(assetId)) {
        continue;
      }

      visited.add(assetId);

      const node = lineage.nodes.find((n) => n.assetId === assetId);
      if (!node) {
        continue;
      }

      const outgoingEdges = lineage.edges.filter((e) => e.fromNodeId === node.id);

      for (const edge of outgoingEdges) {
        const nextNode = lineage.nodes.find((n) => n.id === edge.toNodeId);
        if (nextNode && !visited.has(nextNode.assetId)) {
          queue.push({
            assetId: nextNode.assetId,
            path: [...path, nextNode.assetId],
          });
        }
      }
    }

    return [];
  }

  /**
   * Generate lineage ID
   */
  private generateLineageId(fromNodeId: string, toNodeId: string): string {
    return `lineage-${fromNodeId}-${toNodeId}-${Date.now()}`;
  }
}
