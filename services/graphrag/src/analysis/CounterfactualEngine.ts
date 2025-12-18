/**
 * Counterfactual Analysis Engine
 * Generates "what if" scenarios and minimum change analysis
 */

import { v4 as uuidv4 } from 'uuid';
import { Driver } from 'neo4j-driver';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { EvidenceChunk, GraphPath, RAGAnswer } from '../types/index.js';
import { LLMIntegration } from '../llm/LLMIntegration.js';

const tracer = trace.getTracer('graphrag-counterfactual');

export interface Counterfactual {
  id: string;
  originalAnswer: string;
  change: string;
  changeType: 'remove_evidence' | 'modify_relationship' | 'add_constraint' | 'temporal_shift';
  wouldFlipAnswer: boolean;
  alternativeAnswer?: string;
  confidence: number;
  explanation: string;
  affectedEvidence: string[];
}

export interface SensitivityAnalysis {
  mostInfluentialEvidence: Array<{
    evidenceId: string;
    influence: number;
    removalImpact: string;
  }>;
  criticalPaths: Array<{
    pathId: string;
    criticality: number;
    alternativePaths: number;
  }>;
  robustnessScore: number;
}

export class CounterfactualEngine {
  constructor(
    private driver: Driver,
    private llm: LLMIntegration,
  ) {}

  /**
   * Generate counterfactual scenarios for an answer
   */
  async generateCounterfactuals(
    answer: RAGAnswer,
    evidenceChunks: EvidenceChunk[],
    maxCounterfactuals = 5,
  ): Promise<Counterfactual[]> {
    return tracer.startActiveSpan('generate_counterfactuals', async (span) => {
      try {
        span.setAttribute('answer.id', answer.id);
        span.setAttribute('evidence.count', evidenceChunks.length);

        const counterfactuals: Counterfactual[] = [];

        // 1. Evidence removal counterfactuals
        const removalCFs = await this.generateEvidenceRemovalCounterfactuals(
          answer,
          evidenceChunks,
        );
        counterfactuals.push(...removalCFs);

        // 2. Relationship modification counterfactuals
        const relationshipCFs = await this.generateRelationshipCounterfactuals(
          answer,
          evidenceChunks,
        );
        counterfactuals.push(...relationshipCFs);

        // 3. Temporal shift counterfactuals
        const temporalCFs = await this.generateTemporalCounterfactuals(
          answer,
          evidenceChunks,
        );
        counterfactuals.push(...temporalCFs);

        // Sort by influence and limit
        const sorted = counterfactuals
          .sort((a, b) => {
            // Prioritize answer-flipping counterfactuals
            if (a.wouldFlipAnswer !== b.wouldFlipAnswer) {
              return a.wouldFlipAnswer ? -1 : 1;
            }
            return b.confidence - a.confidence;
          })
          .slice(0, maxCounterfactuals);

        span.setAttribute('counterfactuals.count', sorted.length);
        span.setStatus({ code: SpanStatusCode.OK });

        return sorted;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Find minimum change that would flip the answer
   */
  async findMinimumFlippingChange(
    answer: RAGAnswer,
    evidenceChunks: EvidenceChunk[],
  ): Promise<Counterfactual | null> {
    return tracer.startActiveSpan('find_minimum_flip', async (span) => {
      try {
        // Sort evidence by contribution to answer
        const rankedEvidence = await this.rankEvidenceByInfluence(
          answer,
          evidenceChunks,
        );

        // Try removing evidence one at a time, starting with most influential
        for (const { chunk, influence } of rankedEvidence) {
          const remaining = evidenceChunks.filter((e) => e.id !== chunk.id);

          if (remaining.length === 0) continue;

          // Regenerate answer without this evidence
          const alternativeAnswer = await this.regenerateAnswer(
            answer.query,
            remaining,
          );

          // Check if answer changed significantly
          const changed = await this.answersAreDifferent(
            answer.answer,
            alternativeAnswer,
          );

          if (changed) {
            span.setStatus({ code: SpanStatusCode.OK });
            return {
              id: uuidv4(),
              originalAnswer: answer.answer,
              change: `Remove evidence: "${chunk.content.slice(0, 100)}..."`,
              changeType: 'remove_evidence',
              wouldFlipAnswer: true,
              alternativeAnswer,
              confidence: influence,
              explanation: `Removing this evidence changes the answer because it provides key support for the original conclusion.`,
              affectedEvidence: [chunk.id],
            };
          }
        }

        span.setStatus({ code: SpanStatusCode.OK });
        return null;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Perform sensitivity analysis on the answer
   */
  async analyzeSensitivity(
    answer: RAGAnswer,
    evidenceChunks: EvidenceChunk[],
  ): Promise<SensitivityAnalysis> {
    return tracer.startActiveSpan('sensitivity_analysis', async (span) => {
      try {
        // Rank evidence by influence
        const rankedEvidence = await this.rankEvidenceByInfluence(
          answer,
          evidenceChunks,
        );

        const mostInfluentialEvidence = rankedEvidence.slice(0, 5).map((r) => ({
          evidenceId: r.chunk.id,
          influence: r.influence,
          removalImpact: r.influence > 0.7 ? 'high' : r.influence > 0.4 ? 'medium' : 'low',
        }));

        // Analyze critical paths
        const allPaths = evidenceChunks.flatMap((c) => c.graphPaths);
        const criticalPaths = await this.analyzeCriticalPaths(allPaths);

        // Calculate robustness score
        const robustnessScore = this.calculateRobustness(
          rankedEvidence,
          criticalPaths,
        );

        span.setAttribute('robustness.score', robustnessScore);
        span.setStatus({ code: SpanStatusCode.OK });

        return {
          mostInfluentialEvidence,
          criticalPaths,
          robustnessScore,
        };
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Generate counterfactuals by removing evidence
   */
  private async generateEvidenceRemovalCounterfactuals(
    answer: RAGAnswer,
    evidenceChunks: EvidenceChunk[],
  ): Promise<Counterfactual[]> {
    const counterfactuals: Counterfactual[] = [];
    const topEvidence = evidenceChunks
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3);

    for (const chunk of topEvidence) {
      const citationInfo = chunk.citations[0];
      const change = `What if we didn't have the evidence from ${citationInfo?.documentTitle || 'this source'}?`;

      // Estimate impact using LLM
      const prompt = `Original answer: "${answer.answer}"

Evidence being removed: "${chunk.content.slice(0, 300)}"

Would removing this evidence significantly change the answer? Respond with JSON:
{
  "wouldFlip": true/false,
  "alternativeConclusion": "...",
  "confidence": 0.8,
  "explanation": "..."
}`;

      try {
        const response = await this.llm.generateAnswer(prompt, [], { maxTokens: 300 });
        const result = JSON.parse(response.answer);

        counterfactuals.push({
          id: uuidv4(),
          originalAnswer: answer.answer,
          change,
          changeType: 'remove_evidence',
          wouldFlipAnswer: result.wouldFlip,
          alternativeAnswer: result.alternativeConclusion,
          confidence: result.confidence,
          explanation: result.explanation,
          affectedEvidence: [chunk.id],
        });
      } catch {
        // If parsing fails, add a basic counterfactual
        counterfactuals.push({
          id: uuidv4(),
          originalAnswer: answer.answer,
          change,
          changeType: 'remove_evidence',
          wouldFlipAnswer: chunk.relevanceScore > 0.7,
          confidence: chunk.relevanceScore,
          explanation: `This evidence has ${(chunk.relevanceScore * 100).toFixed(0)}% relevance to the answer.`,
          affectedEvidence: [chunk.id],
        });
      }
    }

    return counterfactuals;
  }

  /**
   * Generate counterfactuals by modifying relationships
   */
  private async generateRelationshipCounterfactuals(
    answer: RAGAnswer,
    evidenceChunks: EvidenceChunk[],
  ): Promise<Counterfactual[]> {
    const counterfactuals: Counterfactual[] = [];

    // Find key relationships in graph paths
    const allPaths = evidenceChunks.flatMap((c) => c.graphPaths);
    const keyRelationships = this.extractKeyRelationships(allPaths);

    for (const rel of keyRelationships.slice(0, 2)) {
      const change = `What if "${rel.sourceLabel}" was not connected to "${rel.targetLabel}" via ${rel.type}?`;

      counterfactuals.push({
        id: uuidv4(),
        originalAnswer: answer.answer,
        change,
        changeType: 'modify_relationship',
        wouldFlipAnswer: rel.criticality > 0.6,
        confidence: rel.criticality,
        explanation: `This relationship is ${rel.criticality > 0.6 ? 'critical' : 'supporting'} to the conclusion.`,
        affectedEvidence: rel.affectedChunks,
      });
    }

    return counterfactuals;
  }

  /**
   * Generate temporal counterfactuals
   */
  private async generateTemporalCounterfactuals(
    answer: RAGAnswer,
    evidenceChunks: EvidenceChunk[],
  ): Promise<Counterfactual[]> {
    const counterfactuals: Counterfactual[] = [];

    // Find evidence with temporal context
    const temporalEvidence = evidenceChunks.filter((c) => c.temporalContext);

    if (temporalEvidence.length > 0) {
      const earliest = temporalEvidence[0];
      const change = `What if we only considered evidence from before ${earliest.temporalContext?.validFrom || 'the earliest date'}?`;

      counterfactuals.push({
        id: uuidv4(),
        originalAnswer: answer.answer,
        change,
        changeType: 'temporal_shift',
        wouldFlipAnswer: temporalEvidence.length > evidenceChunks.length / 2,
        confidence: 0.6,
        explanation: 'Limiting temporal scope may exclude relevant recent evidence.',
        affectedEvidence: temporalEvidence.map((e) => e.id),
      });
    }

    return counterfactuals;
  }

  /**
   * Rank evidence by influence on the answer
   */
  private async rankEvidenceByInfluence(
    answer: RAGAnswer,
    evidenceChunks: EvidenceChunk[],
  ): Promise<Array<{ chunk: EvidenceChunk; influence: number }>> {
    const ranked: Array<{ chunk: EvidenceChunk; influence: number }> = [];

    for (const chunk of evidenceChunks) {
      // Base influence from relevance score
      let influence = chunk.relevanceScore;

      // Boost if cited in answer
      const citationUsed = answer.citations.some((c) =>
        chunk.citations.some((cc) => cc.id === c.source.id),
      );
      if (citationUsed) {
        influence *= 1.5;
      }

      // Boost if has graph paths
      if (chunk.graphPaths.length > 0) {
        influence *= 1.2;
      }

      ranked.push({ chunk, influence: Math.min(influence, 1) });
    }

    return ranked.sort((a, b) => b.influence - a.influence);
  }

  /**
   * Regenerate answer with different evidence
   */
  private async regenerateAnswer(
    query: string,
    evidenceChunks: EvidenceChunk[],
  ): Promise<string> {
    const answer = await this.llm.generateAnswer(query, evidenceChunks, {
      maxTokens: 500,
    });
    return answer.answer;
  }

  /**
   * Check if two answers are semantically different
   */
  private async answersAreDifferent(
    answerA: string,
    answerB: string,
  ): Promise<boolean> {
    // Simple word overlap check
    const wordsA = new Set(answerA.toLowerCase().split(/\s+/));
    const wordsB = new Set(answerB.toLowerCase().split(/\s+/));

    const intersection = new Set([...wordsA].filter((x) => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);

    const similarity = intersection.size / union.size;
    return similarity < 0.5;
  }

  /**
   * Extract key relationships from paths
   */
  private extractKeyRelationships(paths: GraphPath[]): Array<{
    sourceLabel: string;
    targetLabel: string;
    type: string;
    criticality: number;
    affectedChunks: string[];
  }> {
    const relationshipCounts = new Map<string, {
      sourceLabel: string;
      targetLabel: string;
      type: string;
      count: number;
      pathIds: string[];
    }>();

    for (const path of paths) {
      for (const edge of path.edges) {
        const key = `${edge.sourceId}-${edge.type}-${edge.targetId}`;
        const existing = relationshipCounts.get(key);

        if (existing) {
          existing.count++;
          existing.pathIds.push(path.id);
        } else {
          const sourceNode = path.nodes.find((n) => n.id === edge.sourceId);
          const targetNode = path.nodes.find((n) => n.id === edge.targetId);

          relationshipCounts.set(key, {
            sourceLabel: sourceNode?.label || edge.sourceId,
            targetLabel: targetNode?.label || edge.targetId,
            type: edge.type,
            count: 1,
            pathIds: [path.id],
          });
        }
      }
    }

    return Array.from(relationshipCounts.values())
      .map((r) => ({
        sourceLabel: r.sourceLabel,
        targetLabel: r.targetLabel,
        type: r.type,
        criticality: Math.min(r.count / paths.length, 1),
        affectedChunks: r.pathIds,
      }))
      .sort((a, b) => b.criticality - a.criticality);
  }

  /**
   * Analyze critical paths
   */
  private async analyzeCriticalPaths(paths: GraphPath[]): Promise<Array<{
    pathId: string;
    criticality: number;
    alternativePaths: number;
  }>> {
    const pathAnalysis: Array<{
      pathId: string;
      criticality: number;
      alternativePaths: number;
    }> = [];

    for (const path of paths) {
      // Count paths with same endpoints
      const sameEndpoints = paths.filter(
        (p) =>
          p.id !== path.id &&
          p.nodes[0]?.id === path.nodes[0]?.id &&
          p.nodes[p.nodes.length - 1]?.id === path.nodes[path.nodes.length - 1]?.id,
      );

      pathAnalysis.push({
        pathId: path.id,
        criticality: sameEndpoints.length === 0 ? 1 : 1 / (sameEndpoints.length + 1),
        alternativePaths: sameEndpoints.length,
      });
    }

    return pathAnalysis.sort((a, b) => b.criticality - a.criticality);
  }

  /**
   * Calculate robustness score
   */
  private calculateRobustness(
    rankedEvidence: Array<{ chunk: EvidenceChunk; influence: number }>,
    criticalPaths: Array<{ pathId: string; criticality: number; alternativePaths: number }>,
  ): number {
    // Lower is worse - if few pieces of evidence dominate, less robust
    const evidenceConcentration = rankedEvidence.length > 0
      ? rankedEvidence.slice(0, 3).reduce((sum, e) => sum + e.influence, 0) /
        rankedEvidence.reduce((sum, e) => sum + e.influence, 0)
      : 1;

    // More alternative paths = more robust
    const pathRedundancy = criticalPaths.length > 0
      ? criticalPaths.reduce((sum, p) => sum + p.alternativePaths, 0) / criticalPaths.length
      : 0;

    // Combine metrics
    const robustness = (1 - evidenceConcentration) * 0.6 + Math.min(pathRedundancy / 3, 1) * 0.4;

    return Math.max(0, Math.min(1, robustness));
  }
}
