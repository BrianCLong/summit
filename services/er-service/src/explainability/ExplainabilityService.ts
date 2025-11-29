/**
 * Explainability Service
 *
 * Provides human-readable explanations for match decisions and cluster compositions.
 */

import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import type {
  MatchExplanation,
  FeatureEvidence,
  IdentityNode,
  IdentityCluster,
  MatchDecision,
  MatchEdge,
} from '../types/index.js';

const logger = pino({ name: 'ExplainabilityService' });

export interface ExplainMatchInput {
  nodeA: IdentityNode;
  nodeB: IdentityNode;
  features: FeatureEvidence[];
  score: number;
  decision: MatchDecision;
  matcherVersion: string;
}

export interface ExplainClusterInput {
  cluster: IdentityCluster;
  nodes: IdentityNode[];
}

export class ExplainabilityService {
  /**
   * Generate a detailed explanation for why two nodes match (or don't match)
   */
  explainMatch(input: ExplainMatchInput): MatchExplanation {
    const { nodeA, nodeB, features, score, decision, matcherVersion } = input;

    // Sort features by contribution
    const sortedFeatures = this.rankFeatures(features);

    // Generate decision path
    const decisionPath = this.buildDecisionPath(features, score, decision);

    // Calculate alternative decisions
    const alternatives = this.calculateAlternatives(score, decision);

    // Identify risk factors
    const riskFactors = this.identifyRisks(features, nodeA, nodeB);

    const explanation: MatchExplanation = {
      explanationId: uuidv4(),
      nodeAId: nodeA.nodeId,
      nodeBId: nodeB.nodeId,
      summary: this.generateSummary(decision, score, sortedFeatures),
      confidence: this.calculateConfidence(features),
      features: sortedFeatures.map((f) => ({
        featureType: f.featureType,
        description: this.describeFeature(f),
        valueA: this.formatValue(f.valueA),
        valueB: this.formatValue(f.valueB),
        similarity: f.similarity,
        weight: f.weight,
        contribution: f.similarity * f.weight,
        isDeterministic: f.isDeterministic,
        humanReadable: f.explanation,
      })),
      decisionPath,
      alternativeDecisions: alternatives,
      riskFactors,
      generatedAt: new Date().toISOString(),
      matcherVersion,
    };

    logger.debug(
      { nodeAId: nodeA.nodeId, nodeBId: nodeB.nodeId, decision },
      'Match explanation generated'
    );

    return explanation;
  }

  /**
   * Explain why entities in a cluster are linked together
   */
  explainCluster(input: ExplainClusterInput): {
    summary: string;
    connections: Array<{
      nodeAId: string;
      nodeBId: string;
      reason: string;
      strength: number;
    }>;
    weakLinks: Array<{
      nodeAId: string;
      nodeBId: string;
      concern: string;
    }>;
    overallCohesion: string;
  } {
    const { cluster, nodes } = input;

    const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));
    const connections: Array<{
      nodeAId: string;
      nodeBId: string;
      reason: string;
      strength: number;
    }> = [];
    const weakLinks: Array<{
      nodeAId: string;
      nodeBId: string;
      concern: string;
    }> = [];

    // Analyze each edge
    for (const edge of cluster.edges) {
      const nodeA = nodeMap.get(edge.nodeAId);
      const nodeB = nodeMap.get(edge.nodeBId);

      if (!nodeA || !nodeB) continue;

      const reason = this.explainEdge(edge);

      connections.push({
        nodeAId: edge.nodeAId,
        nodeBId: edge.nodeBId,
        reason,
        strength: edge.overallScore,
      });

      // Identify weak links
      if (edge.overallScore < 0.7) {
        weakLinks.push({
          nodeAId: edge.nodeAId,
          nodeBId: edge.nodeBId,
          concern: `Match score ${(edge.overallScore * 100).toFixed(1)}% is below typical threshold`,
        });
      }

      // Check for conflicting features
      const conflicts = edge.features.filter(
        (f) => f.similarity < 0.3 && f.weight > 0.5
      );
      for (const conflict of conflicts) {
        weakLinks.push({
          nodeAId: edge.nodeAId,
          nodeBId: edge.nodeBId,
          concern: `Conflicting ${conflict.featureType}: "${this.formatValue(conflict.valueA)}" vs "${this.formatValue(conflict.valueB)}"`,
        });
      }
    }

    // Generate summary
    const summary = this.generateClusterSummary(cluster, nodes.length, connections.length);

    // Describe cohesion
    const overallCohesion = this.describeCohesion(cluster.cohesionScore, cluster.nodeIds.length);

    return {
      summary,
      connections,
      weakLinks,
      overallCohesion,
    };
  }

  /**
   * Generate a natural language query response for "Why are A and B linked?"
   */
  generateWhyLinkedResponse(
    nodeA: IdentityNode,
    nodeB: IdentityNode,
    path: MatchEdge[]
  ): string {
    if (path.length === 0) {
      return `${this.getNodeName(nodeA)} and ${this.getNodeName(nodeB)} are not linked in any identity cluster.`;
    }

    if (path.length === 1) {
      const edge = path[0];
      const topFeatures = edge.features
        .filter((f) => f.similarity >= 0.8)
        .slice(0, 3)
        .map((f) => f.featureType.toLowerCase().replace(/_/g, ' '));

      return `${this.getNodeName(nodeA)} and ${this.getNodeName(nodeB)} are directly linked with ${(edge.overallScore * 100).toFixed(0)}% confidence based on matching ${topFeatures.join(', ')}.`;
    }

    // Multiple hops
    const intermediates = path.slice(0, -1).map((_, i) => `intermediate entity ${i + 1}`);
    return `${this.getNodeName(nodeA)} and ${this.getNodeName(nodeB)} are linked through ${path.length - 1} intermediate connection(s). The chain involves: ${intermediates.join(' → ')}.`;
  }

  private rankFeatures(features: FeatureEvidence[]): FeatureEvidence[] {
    return [...features].sort((a, b) => {
      // Deterministic features first
      if (a.isDeterministic !== b.isDeterministic) {
        return a.isDeterministic ? -1 : 1;
      }
      // Then by contribution (similarity * weight)
      return (b.similarity * b.weight) - (a.similarity * a.weight);
    });
  }

  private buildDecisionPath(
    features: FeatureEvidence[],
    score: number,
    decision: MatchDecision
  ): Array<{
    step: number;
    description: string;
    result: string;
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  }> {
    const path: Array<{
      step: number;
      description: string;
      result: string;
      impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    }> = [];

    let stepNum = 1;

    // Check for deterministic matches
    const deterministicMatches = features.filter((f) => f.isDeterministic && f.similarity >= 1.0);
    if (deterministicMatches.length > 0) {
      path.push({
        step: stepNum++,
        description: 'Check deterministic identifiers',
        result: `Found ${deterministicMatches.length} exact match(es): ${deterministicMatches.map((f) => f.featureType).join(', ')}`,
        impact: 'POSITIVE',
      });
    }

    // Check for deterministic mismatches
    const deterministicMismatches = features.filter((f) => f.isDeterministic && f.similarity === 0);
    if (deterministicMismatches.length > 0) {
      path.push({
        step: stepNum++,
        description: 'Check for conflicting identifiers',
        result: `Found ${deterministicMismatches.length} conflicting identifier(s)`,
        impact: 'NEGATIVE',
      });
    }

    // Probabilistic scoring
    const probFeatures = features.filter((f) => !f.isDeterministic);
    if (probFeatures.length > 0) {
      const avgSimilarity = probFeatures.reduce((sum, f) => sum + f.similarity, 0) / probFeatures.length;
      path.push({
        step: stepNum++,
        description: 'Calculate probabilistic match score',
        result: `Average similarity across ${probFeatures.length} features: ${(avgSimilarity * 100).toFixed(1)}%`,
        impact: avgSimilarity >= 0.7 ? 'POSITIVE' : avgSimilarity >= 0.4 ? 'NEUTRAL' : 'NEGATIVE',
      });
    }

    // Final decision
    path.push({
      step: stepNum,
      description: 'Apply decision thresholds',
      result: `Overall score ${(score * 100).toFixed(1)}% → ${decision}`,
      impact: decision === 'AUTO_MERGE' || decision === 'MANUAL_MERGE' ? 'POSITIVE'
        : decision === 'AUTO_NO_MATCH' || decision === 'MANUAL_NO_MATCH' ? 'NEGATIVE'
        : 'NEUTRAL',
    });

    return path;
  }

  private calculateAlternatives(
    score: number,
    decision: MatchDecision
  ): Array<{
    decision: MatchDecision;
    probability: number;
    reason: string;
  }> {
    const alternatives: Array<{
      decision: MatchDecision;
      probability: number;
      reason: string;
    }> = [];

    if (decision === 'AUTO_MERGE') {
      alternatives.push({
        decision: 'CANDIDATE',
        probability: 0.1,
        reason: 'If additional conflicting information is discovered',
      });
    } else if (decision === 'CANDIDATE') {
      alternatives.push({
        decision: 'AUTO_MERGE',
        probability: 0.9 - score,
        reason: 'With additional confirming evidence',
      });
      alternatives.push({
        decision: 'AUTO_NO_MATCH',
        probability: score - 0.3,
        reason: 'If key attributes are found to conflict',
      });
    } else if (decision === 'AUTO_NO_MATCH') {
      alternatives.push({
        decision: 'CANDIDATE',
        probability: 0.15,
        reason: 'If matching identifiers are discovered',
      });
    }

    return alternatives;
  }

  private identifyRisks(
    features: FeatureEvidence[],
    nodeA: IdentityNode,
    nodeB: IdentityNode
  ): Array<{
    factor: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
  }> {
    const risks: Array<{
      factor: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      description: string;
    }> = [];

    // Check for thin evidence
    if (features.length < 3) {
      risks.push({
        factor: 'Limited Evidence',
        severity: 'MEDIUM',
        description: `Only ${features.length} feature(s) compared. More data points would increase confidence.`,
      });
    }

    // Check for conflicting high-weight features
    const conflicts = features.filter((f) => f.similarity < 0.3 && f.weight >= 0.5);
    if (conflicts.length > 0) {
      risks.push({
        factor: 'Conflicting Attributes',
        severity: 'HIGH',
        description: `${conflicts.length} important attribute(s) show significant differences.`,
      });
    }

    // Check source reliability
    if (nodeA.sourceRef.confidence < 0.7 || nodeB.sourceRef.confidence < 0.7) {
      risks.push({
        factor: 'Source Reliability',
        severity: 'MEDIUM',
        description: 'One or both records come from lower-confidence sources.',
      });
    }

    // Check for stale data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const nodeADate = new Date(nodeA.sourceRef.ingestedAt);
    const nodeBDate = new Date(nodeB.sourceRef.ingestedAt);

    if (nodeADate < sixMonthsAgo || nodeBDate < sixMonthsAgo) {
      risks.push({
        factor: 'Data Freshness',
        severity: 'LOW',
        description: 'One or both records were ingested more than 6 months ago.',
      });
    }

    return risks;
  }

  private generateSummary(
    decision: MatchDecision,
    score: number,
    features: FeatureEvidence[]
  ): string {
    const topMatches = features
      .filter((f) => f.similarity >= 0.8)
      .slice(0, 3)
      .map((f) => f.featureType.toLowerCase().replace(/_/g, ' '));

    const scorePercent = (score * 100).toFixed(0);

    switch (decision) {
      case 'AUTO_MERGE':
        return `Strong match (${scorePercent}%) - These records likely represent the same entity based on matching ${topMatches.join(', ') || 'multiple attributes'}.`;
      case 'MANUAL_MERGE':
        return `Records merged by analyst review. Match score was ${scorePercent}%.`;
      case 'CANDIDATE':
        return `Potential match (${scorePercent}%) - Manual review recommended to confirm identity.`;
      case 'AUTO_NO_MATCH':
        return `Low match score (${scorePercent}%) - These records likely represent different entities.`;
      case 'MANUAL_NO_MATCH':
        return `Analyst determined these are different entities despite ${scorePercent}% similarity.`;
      case 'MANUAL_SPLIT':
        return `Records were previously merged but have been split by analyst review.`;
      default:
        return `Match score: ${scorePercent}%`;
    }
  }

  private calculateConfidence(features: FeatureEvidence[]): number {
    if (features.length === 0) return 0;

    // Higher confidence with more features, especially deterministic ones
    const featureCountBonus = Math.min(0.2, features.length * 0.03);
    const deterministicBonus = features.some((f) => f.isDeterministic && f.similarity >= 1.0) ? 0.2 : 0;
    const avgSimilarity = features.reduce((sum, f) => sum + f.similarity, 0) / features.length;

    return Math.min(1.0, avgSimilarity * 0.6 + featureCountBonus + deterministicBonus);
  }

  private describeFeature(feature: FeatureEvidence): string {
    const type = feature.featureType.toLowerCase().replace(/_/g, ' ');
    if (feature.isDeterministic) {
      return feature.similarity >= 1.0
        ? `Exact ${type} match (definitive identifier)`
        : `${type} does not match (different identifiers)`;
    }
    if (feature.similarity >= 0.9) {
      return `Strong ${type} similarity`;
    }
    if (feature.similarity >= 0.7) {
      return `Moderate ${type} similarity`;
    }
    if (feature.similarity >= 0.4) {
      return `Weak ${type} similarity`;
    }
    return `${type} differs significantly`;
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) return '[empty]';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private explainEdge(edge: MatchEdge): string {
    const topFeatures = edge.features
      .filter((f) => f.similarity >= 0.7)
      .slice(0, 2)
      .map((f) => f.featureType.toLowerCase().replace(/_/g, ' '));

    if (topFeatures.length === 0) {
      return `Linked with ${(edge.overallScore * 100).toFixed(0)}% confidence`;
    }

    return `Matched on ${topFeatures.join(' and ')} (${(edge.overallScore * 100).toFixed(0)}% confidence)`;
  }

  private generateClusterSummary(
    cluster: IdentityCluster,
    nodeCount: number,
    connectionCount: number
  ): string {
    return `This cluster contains ${nodeCount} record(s) representing the same ${cluster.entityType.toLowerCase()}, connected by ${connectionCount} match relationship(s). Overall cohesion: ${(cluster.cohesionScore * 100).toFixed(0)}%.`;
  }

  private describeCohesion(cohesionScore: number, nodeCount: number): string {
    if (nodeCount <= 2) {
      return 'Cluster contains a pair of matched records.';
    }

    if (cohesionScore >= 0.9) {
      return 'Excellent cohesion - all records are strongly interconnected.';
    }
    if (cohesionScore >= 0.7) {
      return 'Good cohesion - most records have strong connections.';
    }
    if (cohesionScore >= 0.5) {
      return 'Moderate cohesion - some records may be loosely connected.';
    }
    return 'Low cohesion - consider reviewing for potential false positives.';
  }

  private getNodeName(node: IdentityNode): string {
    const name = node.attributes?.props?.name ?? node.attributes?.name;
    if (typeof name === 'string') return `"${name}"`;
    return `Entity ${node.nodeId.slice(0, 8)}`;
  }
}

export const explainabilityService = new ExplainabilityService();
