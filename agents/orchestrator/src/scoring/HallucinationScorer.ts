/**
 * Hallucination Scorer
 *
 * Comprehensive hallucination detection and scoring system that uses
 * multiple factors including consistency checking, source verification,
 * and cross-model consensus to evaluate response reliability.
 */

import { EventEmitter } from 'eventemitter3';
import {
  HallucinationScore,
  HallucinationFactor,
  SourceVerification,
  HallucinationConfig,
  LLMMessage,
  LLMResponse,
  ChainContext,
} from '../types/index.js';

export interface HallucinationScorerDeps {
  verifySource?: (claim: string) => Promise<SourceVerification>;
  crossReference?: (claim: string, sources: string[]) => Promise<boolean>;
}

export class HallucinationScorer extends EventEmitter {
  private config: HallucinationConfig;
  private deps: HallucinationScorerDeps;

  constructor(
    config: Partial<HallucinationConfig> = {},
    deps: HallucinationScorerDeps = {},
  ) {
    super();
    this.config = {
      enabled: config.enabled ?? true,
      minimumScore: config.minimumScore ?? 0.6,
      factCheckingEnabled: config.factCheckingEnabled ?? true,
      crossReferenceEnabled: config.crossReferenceEnabled ?? false,
      sourceVerificationEnabled: config.sourceVerificationEnabled ?? false,
      consensusThreshold: config.consensusThreshold ?? 0.8,
    };
    this.deps = deps;
  }

  /**
   * Score a response for potential hallucinations
   */
  async score(
    response: LLMResponse,
    context: ChainContext,
    originalPrompt: string,
  ): Promise<HallucinationScore> {
    if (!this.config.enabled) {
      return this.createPassingScore();
    }

    const factors: HallucinationFactor[] = [];
    const sources: SourceVerification[] = [];

    // Factor 1: Consistency with prompt
    const consistencyFactor = this.evaluateConsistency(
      response.content,
      originalPrompt,
      context.history,
    );
    factors.push(consistencyFactor);

    // Factor 2: Confidence markers
    const confidenceFactor = this.evaluateConfidenceMarkers(response.content);
    factors.push(confidenceFactor);

    // Factor 3: Factual claims density
    const claimsDensity = this.evaluateClaimsDensity(response.content);
    factors.push(claimsDensity);

    // Factor 4: Self-contradiction check
    const contradictionFactor = this.evaluateSelfContradiction(response.content);
    factors.push(contradictionFactor);

    // Factor 5: Hedging language analysis
    const hedgingFactor = this.evaluateHedgingLanguage(response.content);
    factors.push(hedgingFactor);

    // Factor 6: Source verification (if enabled)
    if (this.config.sourceVerificationEnabled && this.deps.verifySource) {
      const claims = this.extractClaims(response.content);
      for (const claim of claims.slice(0, 5)) { // Limit to 5 claims
        const verification = await this.deps.verifySource(claim);
        sources.push(verification);
      }
    }

    // Calculate weighted overall score
    const overall = this.calculateOverallScore(factors, sources);
    const confidence = this.calculateConfidence(factors);

    const recommendations = this.generateRecommendations(overall, factors, sources);

    const score: HallucinationScore = {
      overall,
      confidence,
      factors,
      sources,
      recommendations,
    };

    // Emit event if score is below threshold
    if (overall < this.config.minimumScore) {
      this.emit('hallucination:detected', {
        score,
        response: response.id,
        context: context.chainId,
      });
    }

    return score;
  }

  /**
   * Compare multiple responses for consensus
   */
  async scoreConsensus(
    responses: LLMResponse[],
    context: ChainContext,
    originalPrompt: string,
  ): Promise<HallucinationScore> {
    if (responses.length < 2) {
      return this.score(responses[0], context, originalPrompt);
    }

    const factors: HallucinationFactor[] = [];
    const sources: SourceVerification[] = [];

    // Score each response individually
    const individualScores = await Promise.all(
      responses.map((r) => this.score(r, context, originalPrompt)),
    );

    // Factor 1: Agreement between models
    const agreementFactor = this.evaluateModelAgreement(
      responses.map((r) => r.content),
    );
    factors.push(agreementFactor);

    // Factor 2: Consistency across responses
    const crossConsistency = this.evaluateCrossConsistency(
      responses.map((r) => r.content),
    );
    factors.push(crossConsistency);

    // Factor 3: Average individual scores
    const avgIndividual: HallucinationFactor = {
      name: 'average-individual',
      score: individualScores.reduce((sum, s) => sum + s.overall, 0) / individualScores.length,
      weight: 0.3,
      details: `Average of ${individualScores.length} individual response scores`,
    };
    factors.push(avgIndividual);

    // Combine sources from all individual scores
    for (const score of individualScores) {
      sources.push(...score.sources);
    }

    const overall = this.calculateOverallScore(factors, sources);
    const confidence = Math.min(
      ...individualScores.map((s) => s.confidence),
      agreementFactor.score,
    );

    return {
      overall,
      confidence,
      factors,
      sources,
      recommendations: this.generateRecommendations(overall, factors, sources),
    };
  }

  // ============================================================================
  // Factor Evaluation Methods
  // ============================================================================

  private evaluateConsistency(
    response: string,
    prompt: string,
    history: LLMMessage[],
  ): HallucinationFactor {
    // Extract key topics from prompt
    const promptTopics = this.extractTopics(prompt);
    const responseTopics = this.extractTopics(response);

    // Calculate topic overlap
    const overlap = promptTopics.filter((t) =>
      responseTopics.some((rt) => rt.toLowerCase().includes(t.toLowerCase())),
    ).length;

    const relevance = promptTopics.length > 0 ? overlap / promptTopics.length : 1;

    // Check for context consistency with history
    let historyConsistency = 1;
    if (history.length > 0) {
      const historyContent = history.map((m) => m.content).join(' ');
      const historyTopics = this.extractTopics(historyContent);
      const historyOverlap = historyTopics.filter((t) =>
        responseTopics.some((rt) => rt.toLowerCase().includes(t.toLowerCase())),
      ).length;
      historyConsistency = historyTopics.length > 0
        ? Math.min(1, historyOverlap / Math.max(1, historyTopics.length / 3))
        : 1;
    }

    const score = (relevance * 0.7 + historyConsistency * 0.3);

    return {
      name: 'consistency',
      score,
      weight: 0.25,
      details: `Prompt relevance: ${(relevance * 100).toFixed(0)}%, History consistency: ${(historyConsistency * 100).toFixed(0)}%`,
    };
  }

  private evaluateConfidenceMarkers(response: string): HallucinationFactor {
    // Patterns indicating uncertainty (good - model is honest about limitations)
    const uncertaintyPatterns = [
      /I'm not (entirely )?sure/gi,
      /I (don't|cannot) (know|verify)/gi,
      /it's (possible|likely) that/gi,
      /this may (not )?be/gi,
      /I believe/gi,
      /from what I understand/gi,
    ];

    // Patterns indicating overconfidence (potentially bad)
    const overconfidencePatterns = [
      /I am (absolutely |100% )?certain/gi,
      /without (a )?doubt/gi,
      /there is no question/gi,
      /it is (definitely|absolutely) (true|false)/gi,
      /everyone knows/gi,
      /it's (a )?fact that/gi,
    ];

    let uncertaintyCount = 0;
    let overconfidenceCount = 0;

    for (const pattern of uncertaintyPatterns) {
      const matches = response.match(pattern);
      if (matches) uncertaintyCount += matches.length;
    }

    for (const pattern of overconfidencePatterns) {
      const matches = response.match(pattern);
      if (matches) overconfidenceCount += matches.length;
    }

    // Healthy uncertainty is good, overconfidence is suspicious
    const normalizedLength = response.length / 1000;
    const uncertaintyRatio = uncertaintyCount / Math.max(1, normalizedLength);
    const overconfidenceRatio = overconfidenceCount / Math.max(1, normalizedLength);

    // Score: penalize overconfidence, slightly reward appropriate uncertainty
    let score = 1;
    score -= overconfidenceRatio * 0.3;
    score += Math.min(uncertaintyRatio * 0.1, 0.15);
    score = Math.max(0, Math.min(1, score));

    return {
      name: 'confidence-markers',
      score,
      weight: 0.15,
      details: `Uncertainty markers: ${uncertaintyCount}, Overconfidence markers: ${overconfidenceCount}`,
    };
  }

  private evaluateClaimsDensity(response: string): HallucinationFactor {
    const claims = this.extractClaims(response);
    const sentences = response.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    // High claims density with specific numbers/dates is higher risk
    const claimsDensity = sentences.length > 0 ? claims.length / sentences.length : 0;

    // Check for specific numeric claims (higher hallucination risk)
    const numericClaims = claims.filter((c) => /\d+/.test(c)).length;
    const numericRatio = claims.length > 0 ? numericClaims / claims.length : 0;

    // Very high density of specific claims is suspicious
    let score = 1;
    if (claimsDensity > 0.8) score -= 0.2;
    if (numericRatio > 0.5) score -= 0.15;
    score = Math.max(0.3, score);

    return {
      name: 'claims-density',
      score,
      weight: 0.15,
      details: `Claims per sentence: ${claimsDensity.toFixed(2)}, Numeric claims: ${(numericRatio * 100).toFixed(0)}%`,
    };
  }

  private evaluateSelfContradiction(response: string): HallucinationFactor {
    const sentences = response.split(/[.!?]+/).filter((s) => s.trim().length > 10);

    // Simple contradiction detection
    const contradictionPatterns = [
      { positive: /is true/gi, negative: /is (not|false)/gi },
      { positive: /always/gi, negative: /never/gi },
      { positive: /all/gi, negative: /none/gi },
      { positive: /can/gi, negative: /cannot/gi },
      { positive: /will/gi, negative: /won't/gi },
    ];

    let contradictions = 0;
    for (let i = 0; i < sentences.length; i++) {
      for (let j = i + 1; j < sentences.length; j++) {
        for (const pattern of contradictionPatterns) {
          if (
            pattern.positive.test(sentences[i]) &&
            pattern.negative.test(sentences[j])
          ) {
            // Check if they're about the same subject
            const overlap = this.getWordOverlap(sentences[i], sentences[j]);
            if (overlap > 0.3) {
              contradictions++;
            }
          }
        }
      }
    }

    const score = Math.max(0, 1 - contradictions * 0.25);

    return {
      name: 'self-contradiction',
      score,
      weight: 0.2,
      details: `Potential contradictions detected: ${contradictions}`,
    };
  }

  private evaluateHedgingLanguage(response: string): HallucinationFactor {
    const hedgingPatterns = [
      /perhaps/gi,
      /maybe/gi,
      /might/gi,
      /could be/gi,
      /possibly/gi,
      /seems like/gi,
      /appears to/gi,
      /I think/gi,
      /in my opinion/gi,
      /generally/gi,
      /typically/gi,
      /usually/gi,
    ];

    let hedgeCount = 0;
    for (const pattern of hedgingPatterns) {
      const matches = response.match(pattern);
      if (matches) hedgeCount += matches.length;
    }

    const normalizedLength = response.length / 500;
    const hedgeRatio = hedgeCount / Math.max(1, normalizedLength);

    // Moderate hedging is healthy, too much or too little is suspicious
    let score;
    if (hedgeRatio < 0.1) {
      score = 0.7; // Too confident
    } else if (hedgeRatio > 2) {
      score = 0.6; // Too uncertain
    } else {
      score = 0.9; // Healthy balance
    }

    return {
      name: 'hedging-language',
      score,
      weight: 0.1,
      details: `Hedging expressions: ${hedgeCount}, Ratio: ${hedgeRatio.toFixed(2)}`,
    };
  }

  private evaluateModelAgreement(responses: string[]): HallucinationFactor {
    if (responses.length < 2) {
      return {
        name: 'model-agreement',
        score: 0.5,
        weight: 0.2,
        details: 'Insufficient responses for comparison',
      };
    }

    // Compare each pair of responses for semantic similarity
    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const similarity = this.calculateSemanticSimilarity(responses[i], responses[j]);
        totalSimilarity += similarity;
        comparisons++;
      }
    }

    const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;

    return {
      name: 'model-agreement',
      score: avgSimilarity,
      weight: 0.25,
      details: `Average agreement across ${responses.length} responses: ${(avgSimilarity * 100).toFixed(0)}%`,
    };
  }

  private evaluateCrossConsistency(responses: string[]): HallucinationFactor {
    // Extract claims from each response and check for consistency
    const allClaims = responses.map((r) => this.extractClaims(r));

    let consistentClaims = 0;
    let totalClaims = 0;

    // Check if claims from first response appear in others
    const referenceClaims = allClaims[0];
    for (const claim of referenceClaims) {
      totalClaims++;
      const appearsInOthers = allClaims.slice(1).filter((claims) =>
        claims.some((c) => this.claimsSimilar(claim, c)),
      ).length;

      if (appearsInOthers >= allClaims.length / 2) {
        consistentClaims++;
      }
    }

    const score = totalClaims > 0 ? consistentClaims / totalClaims : 0.5;

    return {
      name: 'cross-consistency',
      score,
      weight: 0.15,
      details: `Consistent claims: ${consistentClaims}/${totalClaims}`,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private extractTopics(text: string): string[] {
    // Simple topic extraction - in production use NLP
    const words = text.toLowerCase().split(/\W+/);
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'could', 'should', 'may', 'might', 'must', 'shall',
      'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
      'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
      'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'under', 'again', 'further', 'then', 'once',
      'here', 'there', 'when', 'where', 'why', 'how', 'all',
      'each', 'few', 'more', 'most', 'other', 'some', 'such',
      'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
      'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because',
      'until', 'while', 'this', 'that', 'these', 'those', 'it',
      'its', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which',
    ]);

    return words.filter(
      (w) => w.length > 3 && !stopWords.has(w),
    ).slice(0, 20);
  }

  private extractClaims(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);

    // Filter to sentences that look like factual claims
    const claimPatterns = [
      /\b(is|are|was|were|has|have|had)\b/i,
      /\b\d+/,
      /\b(always|never|every|all|none)\b/i,
      /\b(according to|research shows|studies indicate)\b/i,
    ];

    return sentences.filter((s) =>
      claimPatterns.some((p) => p.test(s)),
    );
  }

  private getWordOverlap(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\W+/));
    const words2 = new Set(text2.toLowerCase().split(/\W+/));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculateSemanticSimilarity(text1: string, text2: string): number {
    // Simple word overlap - in production use embeddings
    return this.getWordOverlap(text1, text2);
  }

  private claimsSimilar(claim1: string, claim2: string): boolean {
    return this.getWordOverlap(claim1, claim2) > 0.5;
  }

  private calculateOverallScore(
    factors: HallucinationFactor[],
    sources: SourceVerification[],
  ): number {
    // Calculate weighted average of factors
    let totalWeight = 0;
    let weightedSum = 0;

    for (const factor of factors) {
      weightedSum += factor.score * factor.weight;
      totalWeight += factor.weight;
    }

    let factorScore = totalWeight > 0 ? weightedSum / totalWeight : 0.5;

    // Adjust based on source verification
    if (sources.length > 0) {
      const verifiedCount = sources.filter((s) => s.verified).length;
      const sourceScore = verifiedCount / sources.length;
      factorScore = factorScore * 0.7 + sourceScore * 0.3;
    }

    return Math.max(0, Math.min(1, factorScore));
  }

  private calculateConfidence(factors: HallucinationFactor[]): number {
    // Confidence based on factor agreement
    const scores = factors.map((f) => f.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;

    // Lower variance = higher confidence
    return Math.max(0.3, 1 - Math.sqrt(variance));
  }

  private generateRecommendations(
    overall: number,
    factors: HallucinationFactor[],
    sources: SourceVerification[],
  ): string[] {
    const recommendations: string[] = [];

    if (overall < 0.5) {
      recommendations.push('High hallucination risk - verify all claims independently');
    } else if (overall < 0.7) {
      recommendations.push('Moderate hallucination risk - consider cross-referencing key facts');
    }

    for (const factor of factors) {
      if (factor.score < 0.5) {
        switch (factor.name) {
          case 'consistency':
            recommendations.push('Response may not fully address the prompt');
            break;
          case 'self-contradiction':
            recommendations.push('Response contains potential contradictions');
            break;
          case 'confidence-markers':
            recommendations.push('Response shows signs of overconfidence');
            break;
          case 'model-agreement':
            recommendations.push('Models disagree - seek additional verification');
            break;
        }
      }
    }

    const unverifiedSources = sources.filter((s) => !s.verified);
    if (unverifiedSources.length > 0) {
      recommendations.push(`${unverifiedSources.length} claims could not be verified`);
    }

    return recommendations;
  }

  private createPassingScore(): HallucinationScore {
    return {
      overall: 1,
      confidence: 1,
      factors: [],
      sources: [],
      recommendations: [],
    };
  }
}
