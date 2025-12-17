/**
 * ExplainabilityEngine - Native Decision Explainability
 *
 * Implements comprehensive explainability:
 * - "Because" chains: inputs, events, and models that led to decisions
 * - Counterfactual analysis: alternative outcomes
 * - Causal modeling: explicit cause-effect relationships
 * - Feature importance and attribution
 * - Natural language explanations
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import type {
  Decision,
  CognitionSession,
  ReasoningStep,
  CausalLink,
  Evidence,
  ProposedAction,
  TwinStateSnapshot,
} from '../types/index.js';

const logger = pino({ name: 'ExplainabilityEngine' });

export interface ExplanationConfig {
  maxChainDepth: number;
  includeCounterfactuals: boolean;
  naturalLanguageStyle: 'TECHNICAL' | 'SIMPLE' | 'EXECUTIVE';
  includeVisualization: boolean;
}

export interface Explanation {
  id: string;
  decisionId: string;
  timestamp: Date;
  summary: string;
  becauseChain: BecauseChain;
  counterfactuals: Counterfactual[];
  featureAttribution: FeatureAttribution[];
  causalGraph: CausalGraph;
  confidence: number;
  naturalLanguage: NaturalLanguageExplanation;
}

export interface BecauseChain {
  steps: BecauseStep[];
  rootCauses: string[];
  confidence: number;
}

export interface BecauseStep {
  order: number;
  type: 'INPUT' | 'EVENT' | 'MODEL' | 'RULE' | 'INFERENCE';
  description: string;
  source: string;
  contribution: number;
  evidence: Evidence[];
  timestamp?: Date;
}

export interface Counterfactual {
  id: string;
  question: string;
  alternativeScenario: Record<string, unknown>;
  predictedOutcome: Record<string, unknown>;
  difference: string;
  confidence: number;
}

export interface FeatureAttribution {
  feature: string;
  value: unknown;
  importance: number;
  direction: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  explanation: string;
}

export interface CausalGraph {
  nodes: CausalNode[];
  edges: CausalEdge[];
  rootNodes: string[];
  leafNodes: string[];
}

export interface CausalNode {
  id: string;
  label: string;
  type: 'CAUSE' | 'EFFECT' | 'MEDIATOR' | 'CONFOUNDER';
  value?: unknown;
  confidence: number;
}

export interface CausalEdge {
  source: string;
  target: string;
  strength: number;
  mechanism: string;
  delay?: number;
}

export interface NaturalLanguageExplanation {
  summary: string;
  detailedExplanation: string;
  keyFactors: string[];
  recommendations: string[];
  caveats: string[];
}

export class ExplainabilityEngine extends EventEmitter {
  private config: ExplanationConfig;
  private explanationCache: Map<string, Explanation> = new Map();

  constructor(config: Partial<ExplanationConfig> = {}) {
    super();
    this.config = {
      maxChainDepth: config.maxChainDepth ?? 10,
      includeCounterfactuals: config.includeCounterfactuals ?? true,
      naturalLanguageStyle: config.naturalLanguageStyle ?? 'TECHNICAL',
      includeVisualization: config.includeVisualization ?? false,
    };
  }

  /**
   * Generate comprehensive explanation for a decision
   */
  async explain(
    decision: Decision,
    session: CognitionSession,
  ): Promise<Explanation> {
    const startTime = Date.now();

    // Check cache
    const cached = this.explanationCache.get(decision.id);
    if (cached) return cached;

    // Build because chain
    const becauseChain = this.buildBecauseChain(decision, session);

    // Generate counterfactuals
    const counterfactuals = this.config.includeCounterfactuals
      ? await this.generateCounterfactuals(decision, session)
      : [];

    // Calculate feature attribution
    const featureAttribution = this.calculateFeatureAttribution(decision, session);

    // Build causal graph
    const causalGraph = this.buildCausalGraph(decision, session);

    // Generate natural language explanation
    const naturalLanguage = this.generateNaturalLanguage(
      decision,
      becauseChain,
      featureAttribution,
      counterfactuals,
    );

    const explanation: Explanation = {
      id: uuidv4(),
      decisionId: decision.id,
      timestamp: new Date(),
      summary: naturalLanguage.summary,
      becauseChain,
      counterfactuals,
      featureAttribution,
      causalGraph,
      confidence: this.calculateExplanationConfidence(
        becauseChain,
        featureAttribution,
      ),
      naturalLanguage,
    };

    // Cache the explanation
    this.explanationCache.set(decision.id, explanation);

    const duration = Date.now() - startTime;
    logger.debug(
      { decisionId: decision.id, duration },
      'Explanation generated',
    );

    this.emit('explanation:generated', { explanation });
    return explanation;
  }

  /**
   * Build the "because" chain showing why the decision was made
   */
  private buildBecauseChain(
    decision: Decision,
    session: CognitionSession,
  ): BecauseChain {
    const steps: BecauseStep[] = [];
    const rootCauses: string[] = [];

    let order = 1;

    // Add input data steps
    const inputStep = this.createInputStep(session, order++);
    if (inputStep) steps.push(inputStep);

    // Add reasoning steps from session
    for (const reasoningStep of session.reasoningTrace) {
      steps.push({
        order: order++,
        type: 'INFERENCE',
        description: `${reasoningStep.paradigm} reasoning: ${reasoningStep.reasoning}`,
        source: reasoningStep.paradigm,
        contribution: reasoningStep.confidence,
        evidence: reasoningStep.evidenceChain,
        timestamp: reasoningStep.timestamp,
      });
    }

    // Add causal chain steps
    for (const link of decision.causalChain) {
      steps.push({
        order: order++,
        type: 'MODEL',
        description: `${link.cause} → ${link.effect}: ${link.mechanism}`,
        source: 'causal_model',
        contribution: link.strength,
        evidence: [],
      });

      // Track root causes
      if (!decision.causalChain.some((l) => l.effect === link.cause)) {
        rootCauses.push(link.cause);
      }
    }

    // Add final decision step
    steps.push({
      order: order++,
      type: 'RULE',
      description: `Decision made: ${decision.type} - ${decision.description}`,
      source: 'decision_engine',
      contribution: decision.confidence,
      evidence: [],
      timestamp: decision.createdAt,
    });

    const confidence = steps.length > 0
      ? steps.reduce((sum, s) => sum + s.contribution, 0) / steps.length
      : 0;

    return {
      steps,
      rootCauses: [...new Set(rootCauses)],
      confidence,
    };
  }

  private createInputStep(
    session: CognitionSession,
    order: number,
  ): BecauseStep | null {
    const inputs: string[] = [];
    const evidence: Evidence[] = [];

    // Document sensor inputs
    if (session.context.sensorData.length > 0) {
      inputs.push(`${session.context.sensorData.length} sensor readings`);
      evidence.push({
        id: uuidv4(),
        type: 'SENSOR',
        source: 'sensor_data',
        content: { count: session.context.sensorData.length },
        weight: 0.8,
        timestamp: new Date(),
      });
    }

    // Document text inputs
    if (session.context.textInputs.length > 0) {
      inputs.push(`${session.context.textInputs.length} text inputs`);
      evidence.push({
        id: uuidv4(),
        type: 'EXTERNAL',
        source: 'text_input',
        content: { count: session.context.textInputs.length },
        weight: 0.6,
        timestamp: new Date(),
      });
    }

    // Document alerts
    if (session.context.activeAlerts.length > 0) {
      inputs.push(`${session.context.activeAlerts.length} active alerts`);
      evidence.push({
        id: uuidv4(),
        type: 'HISTORICAL',
        source: 'alerts',
        content: { count: session.context.activeAlerts.length },
        weight: 0.9,
        timestamp: new Date(),
      });
    }

    if (inputs.length === 0) return null;

    return {
      order,
      type: 'INPUT',
      description: `Processed inputs: ${inputs.join(', ')}`,
      source: 'perception',
      contribution: 0.9,
      evidence,
    };
  }

  /**
   * Generate counterfactual explanations
   */
  private async generateCounterfactuals(
    decision: Decision,
    session: CognitionSession,
  ): Promise<Counterfactual[]> {
    const counterfactuals: Counterfactual[] = [];

    // Counterfactual 1: What if key metric was different?
    const keyMetrics = Object.entries(session.context.twinState.properties)
      .filter(([, v]) => typeof v === 'number')
      .slice(0, 3);

    for (const [metric, value] of keyMetrics) {
      if (typeof value !== 'number') continue;

      // Higher value scenario
      const higherValue = value * 1.2;
      counterfactuals.push({
        id: uuidv4(),
        question: `What if ${metric} was 20% higher (${higherValue.toFixed(2)})?`,
        alternativeScenario: { [metric]: higherValue },
        predictedOutcome: this.predictCounterfactualOutcome(
          decision,
          metric,
          higherValue,
          value,
        ),
        difference: this.describeCounterfactualDifference(
          decision,
          metric,
          'higher',
        ),
        confidence: 0.7,
      });

      // Lower value scenario
      const lowerValue = value * 0.8;
      counterfactuals.push({
        id: uuidv4(),
        question: `What if ${metric} was 20% lower (${lowerValue.toFixed(2)})?`,
        alternativeScenario: { [metric]: lowerValue },
        predictedOutcome: this.predictCounterfactualOutcome(
          decision,
          metric,
          lowerValue,
          value,
        ),
        difference: this.describeCounterfactualDifference(
          decision,
          metric,
          'lower',
        ),
        confidence: 0.7,
      });
    }

    // Counterfactual 2: What if no alerts were active?
    if (session.context.activeAlerts.length > 0) {
      counterfactuals.push({
        id: uuidv4(),
        question: 'What if there were no active alerts?',
        alternativeScenario: { activeAlerts: 0 },
        predictedOutcome: {
          decisionType: 'NONE',
          confidence: decision.confidence * 0.5,
          reasoning: 'Without alerts, the urgency for action would be reduced',
        },
        difference:
          'The decision might have been delayed or different without active alerts',
        confidence: 0.6,
      });
    }

    // Counterfactual 3: What if we had chosen the alternative?
    if (decision.alternatives.length > 0) {
      const alternative = decision.alternatives[0];
      counterfactuals.push({
        id: uuidv4(),
        question: `What if we chose "${alternative.type}" instead?`,
        alternativeScenario: { action: alternative },
        predictedOutcome: {
          action: alternative.type,
          expectedImpact: alternative.estimatedImpact,
          tradeoff: 'Different risk/reward profile',
        },
        difference: `Alternative would target ${alternative.target} with different parameters`,
        confidence: 0.65,
      });
    }

    return counterfactuals;
  }

  private predictCounterfactualOutcome(
    decision: Decision,
    metric: string,
    newValue: number,
    oldValue: number,
  ): Record<string, unknown> {
    const delta = (newValue - oldValue) / oldValue;

    // Simple prediction model
    if (delta > 0) {
      return {
        confidenceChange: decision.confidence * (1 - delta * 0.2),
        actionPriority: Math.max(
          1,
          decision.action.priority + Math.round(delta * 2),
        ),
        potentialRisk: 'Increased monitoring recommended',
      };
    } else {
      return {
        confidenceChange: decision.confidence * (1 + Math.abs(delta) * 0.1),
        actionPriority: Math.max(
          1,
          decision.action.priority - Math.round(Math.abs(delta) * 2),
        ),
        potentialBenefit: 'Reduced urgency for action',
      };
    }
  }

  private describeCounterfactualDifference(
    decision: Decision,
    metric: string,
    direction: 'higher' | 'lower',
  ): string {
    if (direction === 'higher') {
      return `With higher ${metric}, the decision confidence might decrease and action priority might increase due to greater deviation from optimal.`;
    } else {
      return `With lower ${metric}, the decision might be delayed as the situation would be less urgent.`;
    }
  }

  /**
   * Calculate feature importance and attribution
   */
  private calculateFeatureAttribution(
    decision: Decision,
    session: CognitionSession,
  ): FeatureAttribution[] {
    const attributions: FeatureAttribution[] = [];

    // Attribute importance to state properties
    for (const [feature, value] of Object.entries(
      session.context.twinState.properties,
    )) {
      if (typeof value !== 'number') continue;

      // Calculate importance based on mention in reasoning
      const mentionCount = session.reasoningTrace.filter((r) =>
        JSON.stringify(r.result).includes(feature),
      ).length;

      const importance = Math.min(1, mentionCount * 0.2 + 0.1);

      if (importance > 0.1) {
        attributions.push({
          feature,
          value,
          importance,
          direction: this.determineAttributionDirection(feature, decision),
          explanation: this.generateFeatureExplanation(feature, value, importance),
        });
      }
    }

    // Attribute importance to alerts
    if (session.context.activeAlerts.length > 0) {
      const alertImportance = Math.min(
        1,
        session.context.activeAlerts.length * 0.15 + 0.3,
      );
      attributions.push({
        feature: 'active_alerts',
        value: session.context.activeAlerts.length,
        importance: alertImportance,
        direction: 'POSITIVE',
        explanation: `${session.context.activeAlerts.length} active alert(s) contributed to the urgency of this decision`,
      });
    }

    // Attribute importance to patterns
    for (const pattern of session.context.recognizedPatterns) {
      attributions.push({
        feature: `pattern_${pattern.type}`,
        value: pattern.confidence,
        importance: pattern.confidence * 0.5,
        direction:
          pattern.type === 'DEGRADATION' ? 'POSITIVE' : 'NEUTRAL',
        explanation: `${pattern.type} pattern: ${pattern.description}`,
      });
    }

    // Sort by importance
    attributions.sort((a, b) => b.importance - a.importance);

    return attributions;
  }

  private determineAttributionDirection(
    feature: string,
    decision: Decision,
  ): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
    // Check if feature is mentioned in action parameters
    const inAction = JSON.stringify(decision.action.parameters).includes(feature);
    if (inAction) return 'POSITIVE';

    // Check causal chain
    const inCausal = decision.causalChain.some(
      (l) => l.cause.includes(feature) || l.effect.includes(feature),
    );
    if (inCausal) return 'POSITIVE';

    return 'NEUTRAL';
  }

  private generateFeatureExplanation(
    feature: string,
    value: unknown,
    importance: number,
  ): string {
    const impLevel =
      importance > 0.7 ? 'critical' : importance > 0.4 ? 'significant' : 'minor';
    return `${feature} (value: ${JSON.stringify(value)}) had a ${impLevel} influence on this decision`;
  }

  /**
   * Build causal graph from decision and reasoning
   */
  private buildCausalGraph(
    decision: Decision,
    session: CognitionSession,
  ): CausalGraph {
    const nodes: CausalNode[] = [];
    const edges: CausalEdge[] = [];
    const nodeIds = new Set<string>();

    // Add nodes from causal chain
    for (const link of decision.causalChain) {
      if (!nodeIds.has(link.cause)) {
        nodes.push({
          id: link.cause,
          label: link.cause,
          type: 'CAUSE',
          confidence: link.confidence,
        });
        nodeIds.add(link.cause);
      }

      if (!nodeIds.has(link.effect)) {
        nodes.push({
          id: link.effect,
          label: link.effect,
          type: 'EFFECT',
          confidence: link.confidence,
        });
        nodeIds.add(link.effect);
      }

      edges.push({
        source: link.cause,
        target: link.effect,
        strength: link.strength,
        mechanism: link.mechanism,
        delay: link.delay,
      });
    }

    // Add decision node
    const decisionNodeId = `decision_${decision.id.slice(0, 8)}`;
    nodes.push({
      id: decisionNodeId,
      label: `Decision: ${decision.type}`,
      type: 'EFFECT',
      confidence: decision.confidence,
    });

    // Connect leaf effects to decision
    const sources = new Set(edges.map((e) => e.source));
    const targets = new Set(edges.map((e) => e.target));
    const leafEffects = [...targets].filter((t) => !sources.has(t));

    for (const leaf of leafEffects) {
      if (leaf !== decisionNodeId) {
        edges.push({
          source: leaf,
          target: decisionNodeId,
          strength: 0.8,
          mechanism: 'Contributes to decision',
        });
      }
    }

    // Identify root and leaf nodes
    const allTargets = new Set(edges.map((e) => e.target));
    const allSources = new Set(edges.map((e) => e.source));
    const rootNodes = nodes
      .filter((n) => !allTargets.has(n.id))
      .map((n) => n.id);
    const leafNodes = nodes
      .filter((n) => !allSources.has(n.id))
      .map((n) => n.id);

    return {
      nodes,
      edges,
      rootNodes,
      leafNodes,
    };
  }

  /**
   * Generate natural language explanation
   */
  private generateNaturalLanguage(
    decision: Decision,
    becauseChain: BecauseChain,
    featureAttribution: FeatureAttribution[],
    counterfactuals: Counterfactual[],
  ): NaturalLanguageExplanation {
    const style = this.config.naturalLanguageStyle;

    // Generate summary
    const summary = this.generateSummary(decision, becauseChain, style);

    // Generate detailed explanation
    const detailedExplanation = this.generateDetailedExplanation(
      decision,
      becauseChain,
      featureAttribution,
      style,
    );

    // Extract key factors
    const keyFactors = featureAttribution
      .slice(0, 5)
      .map((fa) => fa.explanation);

    // Generate recommendations based on counterfactuals
    const recommendations = this.generateRecommendations(
      decision,
      counterfactuals,
      style,
    );

    // Generate caveats
    const caveats = this.generateCaveats(decision, becauseChain, style);

    return {
      summary,
      detailedExplanation,
      keyFactors,
      recommendations,
      caveats,
    };
  }

  private generateSummary(
    decision: Decision,
    becauseChain: BecauseChain,
    style: string,
  ): string {
    const rootCauses =
      becauseChain.rootCauses.length > 0
        ? becauseChain.rootCauses.slice(0, 3).join(', ')
        : 'observed conditions';

    switch (style) {
      case 'SIMPLE':
        return `This decision recommends ${decision.action.type} for ${decision.action.target} because of ${rootCauses}. Confidence: ${(decision.confidence * 100).toFixed(0)}%.`;

      case 'EXECUTIVE':
        return `Recommendation: ${decision.type}. Root cause: ${rootCauses}. Expected impact: ${decision.expectedOutcome.confidence > 0.7 ? 'High' : 'Moderate'} confidence improvement. Risk: ${decision.riskAssessment.overallRisk}.`;

      default: // TECHNICAL
        return `${decision.type} decision for twin via ${decision.action.type} targeting ${decision.action.target}. Confidence: ${(decision.confidence * 100).toFixed(1)}%. Primary factors: ${rootCauses}. Risk assessment: ${decision.riskAssessment.overallRisk}. Reasoning chain depth: ${becauseChain.steps.length} steps.`;
    }
  }

  private generateDetailedExplanation(
    decision: Decision,
    becauseChain: BecauseChain,
    featureAttribution: FeatureAttribution[],
    style: string,
  ): string {
    const parts: string[] = [];

    // Describe the decision
    parts.push(`**Decision:** ${decision.description}`);
    parts.push('');

    // Describe the reasoning chain
    parts.push('**Reasoning Process:**');
    for (const step of becauseChain.steps.slice(0, 5)) {
      parts.push(`${step.order}. [${step.type}] ${step.description}`);
    }
    parts.push('');

    // Describe key factors
    parts.push('**Key Contributing Factors:**');
    for (const attr of featureAttribution.slice(0, 5)) {
      const direction =
        attr.direction === 'POSITIVE'
          ? '+'
          : attr.direction === 'NEGATIVE'
            ? '-'
            : '~';
      parts.push(
        `- ${attr.feature}: ${direction} (importance: ${(attr.importance * 100).toFixed(0)}%)`,
      );
    }
    parts.push('');

    // Describe expected outcome
    parts.push('**Expected Outcome:**');
    for (const metric of decision.expectedOutcome.metrics) {
      parts.push(
        `- ${metric.metric}: ${metric.improvement > 0 ? 'Improve' : 'Adjust'} by ${(Math.abs(metric.improvement) * 100).toFixed(1)}%`,
      );
    }

    return parts.join('\n');
  }

  private generateRecommendations(
    decision: Decision,
    counterfactuals: Counterfactual[],
    style: string,
  ): string[] {
    const recommendations: string[] = [];

    // Based on decision
    recommendations.push(
      `Proceed with ${decision.action.type} if conditions remain stable`,
    );

    // Based on risk
    if (
      decision.riskAssessment.overallRisk === 'HIGH' ||
      decision.riskAssessment.overallRisk === 'CRITICAL'
    ) {
      recommendations.push('Consider additional monitoring during implementation');
      recommendations.push('Have rollback plan ready before execution');
    }

    // Based on counterfactuals
    if (counterfactuals.length > 0) {
      const sensitivity = counterfactuals.filter(
        (c) => c.confidence > 0.6,
      ).length;
      if (sensitivity > 2) {
        recommendations.push(
          'Decision is sensitive to multiple factors - maintain close observation',
        );
      }
    }

    // Based on alternatives
    if (decision.alternatives.length > 0) {
      recommendations.push(
        `Alternative approaches available: ${decision.alternatives.map((a) => a.type).join(', ')}`,
      );
    }

    return recommendations;
  }

  private generateCaveats(
    decision: Decision,
    becauseChain: BecauseChain,
    style: string,
  ): string[] {
    const caveats: string[] = [];

    // Confidence caveat
    if (decision.confidence < 0.7) {
      caveats.push(
        `Confidence level (${(decision.confidence * 100).toFixed(0)}%) is below optimal - additional validation recommended`,
      );
    }

    // Reasoning chain caveat
    if (becauseChain.steps.length < 3) {
      caveats.push('Limited reasoning depth - decision may require expert review');
    }

    // Risk caveat
    if (decision.riskAssessment.factors.length > 0) {
      caveats.push(
        `Risk factors identified: ${decision.riskAssessment.factors.map((f) => f.category).join(', ')}`,
      );
    }

    // Data freshness caveat
    caveats.push('Explanation based on data available at decision time');

    return caveats;
  }

  private calculateExplanationConfidence(
    becauseChain: BecauseChain,
    featureAttribution: FeatureAttribution[],
  ): number {
    let confidence = 0.5;

    // Increase based on chain completeness
    if (becauseChain.steps.length >= 3) confidence += 0.1;
    if (becauseChain.steps.length >= 5) confidence += 0.1;

    // Increase based on root causes
    if (becauseChain.rootCauses.length > 0) confidence += 0.1;

    // Increase based on feature attribution
    if (featureAttribution.length >= 3) confidence += 0.1;

    // Factor in chain confidence
    confidence = (confidence + becauseChain.confidence) / 2;

    return Math.min(0.95, confidence);
  }

  /**
   * Compare two decisions and explain differences
   */
  async compareDecisions(
    decisionA: Decision,
    sessionA: CognitionSession,
    decisionB: Decision,
    sessionB: CognitionSession,
  ): Promise<{
    similarities: string[];
    differences: string[];
    recommendation: string;
  }> {
    const similarities: string[] = [];
    const differences: string[] = [];

    // Compare types
    if (decisionA.type === decisionB.type) {
      similarities.push(`Both decisions are of type ${decisionA.type}`);
    } else {
      differences.push(
        `Decision A is ${decisionA.type}, Decision B is ${decisionB.type}`,
      );
    }

    // Compare confidence
    const confDiff = Math.abs(decisionA.confidence - decisionB.confidence);
    if (confDiff < 0.1) {
      similarities.push(
        `Similar confidence levels (~${((decisionA.confidence + decisionB.confidence) / 2 * 100).toFixed(0)}%)`,
      );
    } else {
      differences.push(
        `Decision A has ${(decisionA.confidence * 100).toFixed(0)}% confidence vs Decision B with ${(decisionB.confidence * 100).toFixed(0)}%`,
      );
    }

    // Compare risk levels
    if (decisionA.riskAssessment.overallRisk === decisionB.riskAssessment.overallRisk) {
      similarities.push(`Same risk level: ${decisionA.riskAssessment.overallRisk}`);
    } else {
      differences.push(
        `Decision A risk: ${decisionA.riskAssessment.overallRisk}, Decision B risk: ${decisionB.riskAssessment.overallRisk}`,
      );
    }

    // Compare actions
    if (decisionA.action.type === decisionB.action.type) {
      similarities.push(`Both recommend ${decisionA.action.type}`);
    } else {
      differences.push(
        `Decision A recommends ${decisionA.action.type}, Decision B recommends ${decisionB.action.type}`,
      );
    }

    // Generate recommendation
    let recommendation: string;
    if (differences.length === 0) {
      recommendation = 'Decisions are essentially equivalent - choose based on timing';
    } else if (decisionA.confidence > decisionB.confidence) {
      recommendation = `Decision A has higher confidence (${(decisionA.confidence * 100).toFixed(0)}%) and may be preferred`;
    } else if (decisionB.confidence > decisionA.confidence) {
      recommendation = `Decision B has higher confidence (${(decisionB.confidence * 100).toFixed(0)}%) and may be preferred`;
    } else {
      recommendation = 'Decisions differ significantly - review both before proceeding';
    }

    return { similarities, differences, recommendation };
  }

  /**
   * Get explanation for past decision
   */
  getExplanation(decisionId: string): Explanation | undefined {
    return this.explanationCache.get(decisionId);
  }

  /**
   * Clear explanation cache
   */
  clearCache(): void {
    this.explanationCache.clear();
  }
}

export default ExplainabilityEngine;
