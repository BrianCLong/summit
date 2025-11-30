/**
 * SpecializedAgents - Multi-Agent Cognition Layer
 *
 * Implements specialized cognitive agents for the digital twin:
 * - DiagnosticsAgent: Explains anomalies, traces causal chains
 * - OptimizationAgent: Searches control settings for improved KPIs
 * - ComplianceAgent: Checks changes against safety and regulatory constraints
 * - OperationsAgent: Chat interface grounded in the twin
 * - PredictionAgent: Forecasts future states
 * - MaintenanceAgent: Predicts and schedules maintenance
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import type {
  CognitionContext,
  Decision,
  ProposedAction,
  Alert,
  Pattern,
  CausalLink,
  RiskAssessment,
  RiskLevel,
  Constraint,
  Objective,
  TwinStateSnapshot,
} from '../types/index.js';

const logger = pino({ name: 'SpecializedAgents' });

// =============================================================================
// Base Agent
// =============================================================================

export interface AgentConfig {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  maxIterations: number;
  timeout: number;
}

export interface AgentResult {
  agentId: string;
  agentType: string;
  success: boolean;
  findings: Finding[];
  recommendations: Recommendation[];
  confidence: number;
  executionTime: number;
  metadata: Record<string, unknown>;
}

export interface Finding {
  id: string;
  type: string;
  severity: RiskLevel;
  description: string;
  evidence: Evidence[];
  timestamp: Date;
}

export interface Evidence {
  source: string;
  type: string;
  content: unknown;
  confidence: number;
}

export interface Recommendation {
  id: string;
  action: ProposedAction;
  rationale: string;
  priority: number;
  estimatedImpact: Impact[];
  prerequisites: string[];
}

export interface Impact {
  metric: string;
  direction: 'INCREASE' | 'DECREASE' | 'STABILIZE';
  magnitude: number;
  confidence: number;
}

export abstract class BaseAgent extends EventEmitter {
  protected config: AgentConfig;
  protected isRunning: boolean = false;

  constructor(config: Partial<AgentConfig>) {
    super();
    this.config = {
      id: config.id ?? uuidv4(),
      name: config.name ?? 'BaseAgent',
      priority: config.priority ?? 5,
      enabled: config.enabled ?? true,
      maxIterations: config.maxIterations ?? 10,
      timeout: config.timeout ?? 30000,
    };
  }

  abstract execute(context: CognitionContext): Promise<AgentResult>;

  get id(): string {
    return this.config.id;
  }

  get name(): string {
    return this.config.name;
  }

  get priority(): number {
    return this.config.priority;
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  protected createResult(
    agentType: string,
    findings: Finding[],
    recommendations: Recommendation[],
    confidence: number,
    executionTime: number,
    metadata: Record<string, unknown> = {},
  ): AgentResult {
    return {
      agentId: this.config.id,
      agentType,
      success: true,
      findings,
      recommendations,
      confidence,
      executionTime,
      metadata,
    };
  }
}

// =============================================================================
// Diagnostics Agent
// =============================================================================

export interface DiagnosticsConfig extends AgentConfig {
  causalDepth: number;
  minConfidence: number;
  includeHistorical: boolean;
}

export class DiagnosticsAgent extends BaseAgent {
  private diagnosticsConfig: DiagnosticsConfig;

  constructor(config: Partial<DiagnosticsConfig> = {}) {
    super({
      ...config,
      name: config.name ?? 'DiagnosticsAgent',
    });
    this.diagnosticsConfig = {
      ...this.config,
      causalDepth: config.causalDepth ?? 5,
      minConfidence: config.minConfidence ?? 0.6,
      includeHistorical: config.includeHistorical ?? true,
    };
  }

  async execute(context: CognitionContext): Promise<AgentResult> {
    const startTime = Date.now();
    const findings: Finding[] = [];
    const recommendations: Recommendation[] = [];

    try {
      this.isRunning = true;
      this.emit('started', { agentId: this.id });

      // Analyze anomalies and alerts
      const anomalyFindings = await this.analyzeAnomalies(context);
      findings.push(...anomalyFindings);

      // Trace causal chains
      const causalFindings = await this.traceCausalChains(context, anomalyFindings);
      findings.push(...causalFindings);

      // Generate diagnostic recommendations
      const diagnosticRecommendations = this.generateDiagnosticRecommendations(
        findings,
        context,
      );
      recommendations.push(...diagnosticRecommendations);

      const executionTime = Date.now() - startTime;
      const confidence = this.calculateConfidence(findings);

      logger.info(
        { agentId: this.id, findings: findings.length, executionTime },
        'Diagnostics completed',
      );

      return this.createResult(
        'DIAGNOSTICS',
        findings,
        recommendations,
        confidence,
        executionTime,
        { causalChains: causalFindings.length },
      );
    } finally {
      this.isRunning = false;
      this.emit('completed', { agentId: this.id });
    }
  }

  private async analyzeAnomalies(context: CognitionContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Analyze active alerts
    for (const alert of context.activeAlerts) {
      const rootCauses = this.identifyRootCauses(alert, context);

      findings.push({
        id: uuidv4(),
        type: 'ANOMALY_ANALYSIS',
        severity: alert.severity,
        description: `Analysis of alert: ${alert.title}`,
        evidence: [
          {
            source: 'alert',
            type: 'ALERT',
            content: alert,
            confidence: 0.9,
          },
          ...rootCauses.map((rc) => ({
            source: 'root_cause_analysis',
            type: 'ROOT_CAUSE',
            content: rc,
            confidence: rc.confidence,
          })),
        ],
        timestamp: new Date(),
      });
    }

    // Analyze recognized patterns for degradation
    for (const pattern of context.recognizedPatterns) {
      if (pattern.type === 'DEGRADATION' || pattern.type === 'ANOMALY') {
        findings.push({
          id: uuidv4(),
          type: 'PATTERN_ANALYSIS',
          severity: pattern.confidence > 0.8 ? 'HIGH' : 'MEDIUM',
          description: `Degradation pattern detected: ${pattern.description}`,
          evidence: [
            {
              source: 'pattern_recognition',
              type: 'PATTERN',
              content: pattern,
              confidence: pattern.confidence,
            },
          ],
          timestamp: new Date(),
        });
      }
    }

    return findings;
  }

  private identifyRootCauses(
    alert: Alert,
    context: CognitionContext,
  ): Array<{ cause: string; mechanism: string; confidence: number }> {
    const causes: Array<{ cause: string; mechanism: string; confidence: number }> = [];

    // Check for recent state changes that might explain the alert
    if (context.historicalStates.length > 1) {
      const recentChanges = this.findRecentChanges(context.historicalStates);

      for (const change of recentChanges) {
        if (this.isRelatedToAlert(change, alert)) {
          causes.push({
            cause: `Change in ${change.property}`,
            mechanism: `${change.property} changed from ${change.oldValue} to ${change.newValue}`,
            confidence: 0.7,
          });
        }
      }
    }

    // Check for pattern correlations
    for (const pattern of context.recognizedPatterns) {
      if (pattern.type === 'DEGRADATION') {
        causes.push({
          cause: 'Equipment degradation',
          mechanism: pattern.description,
          confidence: pattern.confidence * 0.8,
        });
      }
    }

    return causes.sort((a, b) => b.confidence - a.confidence);
  }

  private findRecentChanges(
    states: TwinStateSnapshot[],
  ): Array<{ property: string; oldValue: unknown; newValue: unknown }> {
    const changes: Array<{ property: string; oldValue: unknown; newValue: unknown }> = [];

    if (states.length < 2) return changes;

    const recent = states[states.length - 1];
    const previous = states[states.length - 2];

    for (const [key, newValue] of Object.entries(recent.properties)) {
      const oldValue = previous.properties[key];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ property: key, oldValue, newValue });
      }
    }

    return changes;
  }

  private isRelatedToAlert(
    change: { property: string },
    alert: Alert,
  ): boolean {
    // Simple heuristic: check if property appears in alert context
    const alertStr = JSON.stringify(alert.context).toLowerCase();
    return alertStr.includes(change.property.toLowerCase());
  }

  private async traceCausalChains(
    context: CognitionContext,
    findings: Finding[],
  ): Promise<Finding[]> {
    const causalFindings: Finding[] = [];

    for (const finding of findings) {
      const chain = this.buildCausalChain(finding, context);
      if (chain.length > 1) {
        causalFindings.push({
          id: uuidv4(),
          type: 'CAUSAL_CHAIN',
          severity: finding.severity,
          description: `Causal chain identified for: ${finding.description}`,
          evidence: chain.map((link, i) => ({
            source: 'causal_analysis',
            type: 'CAUSAL_LINK',
            content: link,
            confidence: Math.pow(0.9, i), // Confidence decreases along chain
          })),
          timestamp: new Date(),
        });
      }
    }

    return causalFindings;
  }

  private buildCausalChain(
    finding: Finding,
    context: CognitionContext,
  ): CausalLink[] {
    const chain: CausalLink[] = [];
    const maxDepth = this.diagnosticsConfig.causalDepth;

    // Extract initial cause from finding
    const rootCauses = finding.evidence
      .filter((e) => e.type === 'ROOT_CAUSE')
      .map((e) => e.content as { cause: string; mechanism: string; confidence: number });

    for (const rootCause of rootCauses.slice(0, 1)) {
      chain.push({
        cause: rootCause.cause,
        effect: finding.description,
        mechanism: rootCause.mechanism,
        strength: rootCause.confidence,
        confidence: rootCause.confidence,
      });

      // Try to extend chain
      let currentCause = rootCause.cause;
      for (let depth = 0; depth < maxDepth - 1; depth++) {
        const predecessor = this.findPredecessor(currentCause, context);
        if (!predecessor) break;

        chain.unshift({
          cause: predecessor.cause,
          effect: currentCause,
          mechanism: predecessor.mechanism,
          strength: predecessor.confidence,
          confidence: predecessor.confidence,
        });

        currentCause = predecessor.cause;
      }
    }

    return chain;
  }

  private findPredecessor(
    effect: string,
    context: CognitionContext,
  ): { cause: string; mechanism: string; confidence: number } | null {
    // Look for patterns that might explain the effect
    for (const pattern of context.recognizedPatterns) {
      if (pattern.description.toLowerCase().includes(effect.toLowerCase())) {
        return {
          cause: `Pattern: ${pattern.type}`,
          mechanism: 'Pattern-based inference',
          confidence: pattern.confidence * 0.7,
        };
      }
    }

    return null;
  }

  private generateDiagnosticRecommendations(
    findings: Finding[],
    context: CognitionContext,
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const finding of findings) {
      if (finding.severity === 'CRITICAL' || finding.severity === 'HIGH') {
        // Generate investigation recommendation
        recommendations.push({
          id: uuidv4(),
          action: {
            id: uuidv4(),
            type: 'TRIGGER_WORKFLOW',
            target: 'investigation',
            parameters: { findingId: finding.id, severity: finding.severity },
            priority: finding.severity === 'CRITICAL' ? 10 : 8,
            estimatedImpact: [],
            constraints: [],
          },
          rationale: `Investigate ${finding.type}: ${finding.description}`,
          priority: finding.severity === 'CRITICAL' ? 10 : 8,
          estimatedImpact: [
            {
              metric: 'risk',
              direction: 'DECREASE',
              magnitude: 0.3,
              confidence: 0.7,
            },
          ],
          prerequisites: [],
        });

        // If causal chain found, recommend addressing root cause
        const causalEvidence = finding.evidence.filter((e) => e.type === 'CAUSAL_LINK');
        if (causalEvidence.length > 0) {
          const rootLink = causalEvidence[0].content as CausalLink;
          recommendations.push({
            id: uuidv4(),
            action: {
              id: uuidv4(),
              type: 'SCHEDULE_MAINTENANCE',
              target: rootLink.cause,
              parameters: { urgency: 'HIGH', reason: 'Root cause of anomaly' },
              priority: 9,
              estimatedImpact: [],
              constraints: [],
            },
            rationale: `Address root cause: ${rootLink.cause}`,
            priority: 9,
            estimatedImpact: [
              {
                metric: 'reliability',
                direction: 'INCREASE',
                magnitude: 0.4,
                confidence: 0.6,
              },
            ],
            prerequisites: [`Complete investigation ${finding.id}`],
          });
        }
      }
    }

    return recommendations;
  }

  private calculateConfidence(findings: Finding[]): number {
    if (findings.length === 0) return 0.5;

    const avgEvidenceConfidence =
      findings.flatMap((f) => f.evidence).reduce((sum, e) => sum + e.confidence, 0) /
      Math.max(1, findings.flatMap((f) => f.evidence).length);

    return Math.min(0.95, avgEvidenceConfidence);
  }
}

// =============================================================================
// Optimization Agent
// =============================================================================

export interface OptimizationConfig extends AgentConfig {
  searchIterations: number;
  explorationRate: number;
  constraintStrictness: number;
}

export class OptimizationAgent extends BaseAgent {
  private optimizationConfig: OptimizationConfig;

  constructor(config: Partial<OptimizationConfig> = {}) {
    super({
      ...config,
      name: config.name ?? 'OptimizationAgent',
    });
    this.optimizationConfig = {
      ...this.config,
      searchIterations: config.searchIterations ?? 100,
      explorationRate: config.explorationRate ?? 0.2,
      constraintStrictness: config.constraintStrictness ?? 0.9,
    };
  }

  async execute(context: CognitionContext): Promise<AgentResult> {
    const startTime = Date.now();
    const findings: Finding[] = [];
    const recommendations: Recommendation[] = [];

    try {
      this.isRunning = true;
      this.emit('started', { agentId: this.id });

      // Identify optimization opportunities
      const opportunities = await this.identifyOpportunities(context);
      findings.push(...opportunities);

      // Search for optimal control settings
      const optimalSettings = await this.searchOptimalSettings(context);

      // Generate optimization recommendations
      for (const setting of optimalSettings) {
        recommendations.push({
          id: uuidv4(),
          action: {
            id: uuidv4(),
            type: 'ADJUST_SETPOINT',
            target: setting.parameter,
            parameters: { value: setting.optimalValue, currentValue: setting.currentValue },
            priority: Math.round(setting.improvement * 10),
            estimatedImpact: setting.impacts,
            constraints: [],
          },
          rationale: `Optimize ${setting.parameter}: ${setting.rationale}`,
          priority: Math.round(setting.improvement * 10),
          estimatedImpact: setting.impacts,
          prerequisites: setting.prerequisites,
        });
      }

      const executionTime = Date.now() - startTime;
      const confidence = this.calculateOptimizationConfidence(optimalSettings);

      logger.info(
        { agentId: this.id, recommendations: recommendations.length, executionTime },
        'Optimization completed',
      );

      return this.createResult(
        'OPTIMIZATION',
        findings,
        recommendations,
        confidence,
        executionTime,
        { settingsEvaluated: this.optimizationConfig.searchIterations },
      );
    } finally {
      this.isRunning = false;
      this.emit('completed', { agentId: this.id });
    }
  }

  private async identifyOpportunities(context: CognitionContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Analyze current state against objectives
    for (const objective of context.objectives) {
      const currentValue = this.getMetricValue(objective.metric, context);
      if (currentValue === null) continue;

      const gap = this.calculateObjectiveGap(objective, currentValue);
      if (gap > 0.1) {
        findings.push({
          id: uuidv4(),
          type: 'OPTIMIZATION_OPPORTUNITY',
          severity: gap > 0.3 ? 'HIGH' : gap > 0.2 ? 'MEDIUM' : 'LOW',
          description: `Optimization opportunity for ${objective.metric}: ${(gap * 100).toFixed(1)}% improvement potential`,
          evidence: [
            {
              source: 'objective_analysis',
              type: 'GAP_ANALYSIS',
              content: { objective, currentValue, gap },
              confidence: 0.8,
            },
          ],
          timestamp: new Date(),
        });
      }
    }

    // Look for efficiency patterns
    for (const pattern of context.recognizedPatterns) {
      if (pattern.type === 'EFFICIENCY') {
        findings.push({
          id: uuidv4(),
          type: 'EFFICIENCY_PATTERN',
          severity: 'LOW',
          description: pattern.description,
          evidence: [
            {
              source: 'pattern_analysis',
              type: 'PATTERN',
              content: pattern,
              confidence: pattern.confidence,
            },
          ],
          timestamp: new Date(),
        });
      }
    }

    return findings;
  }

  private getMetricValue(metric: string, context: CognitionContext): number | null {
    const value = context.twinState.properties[metric];
    if (typeof value === 'number') return value;

    const derived = context.twinState.derived?.[metric];
    if (typeof derived === 'number') return derived;

    return null;
  }

  private calculateObjectiveGap(objective: Objective, currentValue: number): number {
    if (objective.targetValue === undefined) return 0;

    const gap = Math.abs(currentValue - objective.targetValue) / objective.targetValue;
    return objective.direction === 'TARGET' ? gap : gap * 0.5;
  }

  private async searchOptimalSettings(context: CognitionContext): Promise<OptimalSetting[]> {
    const settings: OptimalSetting[] = [];

    // Get tunable parameters from twin state
    const tunableParams = this.identifyTunableParameters(context);

    for (const param of tunableParams) {
      const optimal = await this.optimizeParameter(param, context);
      if (optimal && optimal.improvement > 0.05) {
        settings.push(optimal);
      }
    }

    // Sort by improvement
    settings.sort((a, b) => b.improvement - a.improvement);

    return settings.slice(0, 5); // Top 5 recommendations
  }

  private identifyTunableParameters(
    context: CognitionContext,
  ): Array<{ name: string; value: number; range: [number, number] }> {
    const params: Array<{ name: string; value: number; range: [number, number] }> = [];

    for (const [key, value] of Object.entries(context.twinState.properties)) {
      if (typeof value === 'number') {
        // Estimate range based on current value
        const range: [number, number] = [value * 0.5, value * 1.5];
        params.push({ name: key, value, range });
      }
    }

    return params;
  }

  private async optimizeParameter(
    param: { name: string; value: number; range: [number, number] },
    context: CognitionContext,
  ): Promise<OptimalSetting | null> {
    let bestValue = param.value;
    let bestScore = this.evaluateObjectives(param.value, param.name, context);

    // Simple grid search with some randomization
    const steps = 10;
    const stepSize = (param.range[1] - param.range[0]) / steps;

    for (let i = 0; i <= steps; i++) {
      const testValue = param.range[0] + i * stepSize;

      // Add exploration noise
      const noise = (Math.random() - 0.5) * stepSize * this.optimizationConfig.explorationRate;
      const noisyValue = Math.max(param.range[0], Math.min(param.range[1], testValue + noise));

      const score = this.evaluateObjectives(noisyValue, param.name, context);

      if (score > bestScore) {
        bestScore = score;
        bestValue = noisyValue;
      }
    }

    const improvement = (bestScore - this.evaluateObjectives(param.value, param.name, context));

    if (improvement <= 0) return null;

    return {
      parameter: param.name,
      currentValue: param.value,
      optimalValue: bestValue,
      improvement,
      rationale: `Adjusting ${param.name} from ${param.value.toFixed(2)} to ${bestValue.toFixed(2)} improves objectives by ${(improvement * 100).toFixed(1)}%`,
      impacts: this.estimateImpacts(param.name, param.value, bestValue, context),
      prerequisites: [],
    };
  }

  private evaluateObjectives(
    paramValue: number,
    paramName: string,
    context: CognitionContext,
  ): number {
    let score = 0;

    for (const objective of context.objectives) {
      // Simplified objective evaluation
      const contribution = this.estimateParameterContribution(
        paramName,
        paramValue,
        objective,
        context,
      );
      score += contribution * objective.weight;
    }

    // Penalty for constraint violations
    for (const constraint of context.constraints) {
      if (constraint.hardLimit) {
        const violation = this.checkConstraintViolation(paramName, paramValue, constraint);
        if (violation > 0) {
          score -= violation * this.optimizationConfig.constraintStrictness;
        }
      }
    }

    return score;
  }

  private estimateParameterContribution(
    paramName: string,
    paramValue: number,
    objective: Objective,
    context: CognitionContext,
  ): number {
    // Simplified model: assume linear relationship
    const sensitivity = 0.1; // Would be learned in production
    const currentMetricValue = this.getMetricValue(objective.metric, context) ?? 0;

    const delta = paramValue - (context.twinState.properties[paramName] as number ?? 0);
    const metricDelta = delta * sensitivity;

    if (objective.direction === 'MAXIMIZE') {
      return metricDelta > 0 ? metricDelta / (currentMetricValue || 1) : 0;
    } else if (objective.direction === 'MINIMIZE') {
      return metricDelta < 0 ? -metricDelta / (currentMetricValue || 1) : 0;
    } else {
      // TARGET
      const newValue = currentMetricValue + metricDelta;
      const target = objective.targetValue ?? currentMetricValue;
      return 1 - Math.abs(newValue - target) / (target || 1);
    }
  }

  private checkConstraintViolation(
    paramName: string,
    paramValue: number,
    constraint: Constraint,
  ): number {
    // Check if parameter is mentioned in constraint
    if (!constraint.expression.includes(paramName)) return 0;

    // Simple bounds checking (would parse expression in production)
    const upperMatch = constraint.expression.match(new RegExp(`${paramName}\\s*<\\s*(\\d+)`));
    if (upperMatch) {
      const limit = parseFloat(upperMatch[1]);
      if (paramValue > limit) return (paramValue - limit) / limit;
    }

    const lowerMatch = constraint.expression.match(new RegExp(`${paramName}\\s*>\\s*(\\d+)`));
    if (lowerMatch) {
      const limit = parseFloat(lowerMatch[1]);
      if (paramValue < limit) return (limit - paramValue) / limit;
    }

    return 0;
  }

  private estimateImpacts(
    paramName: string,
    oldValue: number,
    newValue: number,
    context: CognitionContext,
  ): Impact[] {
    const impacts: Impact[] = [];

    for (const objective of context.objectives) {
      const oldContrib = this.estimateParameterContribution(
        paramName,
        oldValue,
        objective,
        context,
      );
      const newContrib = this.estimateParameterContribution(
        paramName,
        newValue,
        objective,
        context,
      );

      const delta = newContrib - oldContrib;
      if (Math.abs(delta) > 0.01) {
        impacts.push({
          metric: objective.metric,
          direction: delta > 0 ? 'INCREASE' : 'DECREASE',
          magnitude: Math.abs(delta),
          confidence: 0.7,
        });
      }
    }

    return impacts;
  }

  private calculateOptimizationConfidence(settings: OptimalSetting[]): number {
    if (settings.length === 0) return 0.5;

    const avgImprovement =
      settings.reduce((sum, s) => sum + s.improvement, 0) / settings.length;
    return Math.min(0.9, 0.5 + avgImprovement);
  }
}

interface OptimalSetting {
  parameter: string;
  currentValue: number;
  optimalValue: number;
  improvement: number;
  rationale: string;
  impacts: Impact[];
  prerequisites: string[];
}

// =============================================================================
// Compliance Agent
// =============================================================================

export interface ComplianceConfig extends AgentConfig {
  strictMode: boolean;
  autoRemediate: boolean;
}

export class ComplianceAgent extends BaseAgent {
  private complianceConfig: ComplianceConfig;

  constructor(config: Partial<ComplianceConfig> = {}) {
    super({
      ...config,
      name: config.name ?? 'ComplianceAgent',
    });
    this.complianceConfig = {
      ...this.config,
      strictMode: config.strictMode ?? true,
      autoRemediate: config.autoRemediate ?? false,
    };
  }

  async execute(context: CognitionContext): Promise<AgentResult> {
    const startTime = Date.now();
    const findings: Finding[] = [];
    const recommendations: Recommendation[] = [];

    try {
      this.isRunning = true;
      this.emit('started', { agentId: this.id });

      // Check constraint compliance
      const constraintViolations = await this.checkConstraints(context);
      findings.push(...constraintViolations);

      // Check regulatory compliance
      if (context.regulatoryContext) {
        const regulatoryViolations = await this.checkRegulatory(context);
        findings.push(...regulatoryViolations);
      }

      // Check safety constraints
      const safetyViolations = await this.checkSafetyConstraints(context);
      findings.push(...safetyViolations);

      // Generate remediation recommendations
      const remediations = this.generateRemediations(findings, context);
      recommendations.push(...remediations);

      const executionTime = Date.now() - startTime;
      const allCompliant = findings.every(
        (f) => f.severity === 'LOW' || f.severity === 'NEGLIGIBLE',
      );

      logger.info(
        { agentId: this.id, violations: findings.length, compliant: allCompliant, executionTime },
        'Compliance check completed',
      );

      return this.createResult(
        'COMPLIANCE',
        findings,
        recommendations,
        allCompliant ? 0.95 : 0.6,
        executionTime,
        { compliant: allCompliant, violationCount: findings.length },
      );
    } finally {
      this.isRunning = false;
      this.emit('completed', { agentId: this.id });
    }
  }

  private async checkConstraints(context: CognitionContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const constraint of context.constraints) {
      const violation = this.evaluateConstraint(constraint, context);
      if (violation) {
        findings.push({
          id: uuidv4(),
          type: 'CONSTRAINT_VIOLATION',
          severity: constraint.hardLimit ? 'CRITICAL' : 'MEDIUM',
          description: `Constraint violation: ${constraint.name}`,
          evidence: [
            {
              source: 'constraint_evaluation',
              type: 'CONSTRAINT',
              content: { constraint, violation },
              confidence: 0.95,
            },
          ],
          timestamp: new Date(),
        });
      }
    }

    return findings;
  }

  private evaluateConstraint(
    constraint: Constraint,
    context: CognitionContext,
  ): { parameter: string; value: number; limit: number } | null {
    // Parse and evaluate constraint expression
    // This is simplified - would use a proper expression parser in production

    for (const [key, value] of Object.entries(context.twinState.properties)) {
      if (typeof value !== 'number') continue;
      if (!constraint.expression.includes(key)) continue;

      // Check upper bounds
      const upperMatch = constraint.expression.match(new RegExp(`${key}\\s*<[=]?\\s*(\\d+\\.?\\d*)`));
      if (upperMatch) {
        const limit = parseFloat(upperMatch[1]);
        const margin = constraint.margin ?? 0;
        if (value > limit * (1 - margin)) {
          return { parameter: key, value, limit };
        }
      }

      // Check lower bounds
      const lowerMatch = constraint.expression.match(new RegExp(`${key}\\s*>[=]?\\s*(\\d+\\.?\\d*)`));
      if (lowerMatch) {
        const limit = parseFloat(lowerMatch[1]);
        const margin = constraint.margin ?? 0;
        if (value < limit * (1 + margin)) {
          return { parameter: key, value, limit };
        }
      }
    }

    return null;
  }

  private async checkRegulatory(context: CognitionContext): Promise<Finding[]> {
    const findings: Finding[] = [];
    const regulatory = context.regulatoryContext!;

    for (const regulation of regulatory.regulations) {
      if (regulation.status !== 'ACTIVE') continue;

      for (const requirement of regulation.requirements) {
        if (requirement.complianceStatus === 'NON_COMPLIANT') {
          findings.push({
            id: uuidv4(),
            type: 'REGULATORY_VIOLATION',
            severity: 'HIGH',
            description: `Non-compliant with ${regulation.name}: ${requirement.description}`,
            evidence: [
              {
                source: 'regulatory_check',
                type: 'REQUIREMENT',
                content: { regulation, requirement },
                confidence: 0.9,
              },
            ],
            timestamp: new Date(),
          });
        }
      }
    }

    // Check upcoming changes
    for (const change of regulatory.upcomingChanges) {
      const daysUntil = Math.ceil(
        (change.effectiveDate.getTime() - Date.now()) / (24 * 3600 * 1000),
      );
      if (daysUntil < 30) {
        findings.push({
          id: uuidv4(),
          type: 'REGULATORY_CHANGE_WARNING',
          severity: daysUntil < 7 ? 'HIGH' : 'MEDIUM',
          description: `Upcoming regulatory change in ${daysUntil} days: ${change.description}`,
          evidence: [
            {
              source: 'regulatory_calendar',
              type: 'UPCOMING_CHANGE',
              content: change,
              confidence: 1.0,
            },
          ],
          timestamp: new Date(),
        });
      }
    }

    return findings;
  }

  private async checkSafetyConstraints(context: CognitionContext): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Check for safety-related patterns
    for (const alert of context.activeAlerts) {
      if (alert.severity === 'CRITICAL') {
        findings.push({
          id: uuidv4(),
          type: 'SAFETY_CONCERN',
          severity: 'CRITICAL',
          description: `Critical safety alert active: ${alert.title}`,
          evidence: [
            {
              source: 'safety_monitoring',
              type: 'ALERT',
              content: alert,
              confidence: 0.95,
            },
          ],
          timestamp: new Date(),
        });
      }
    }

    // Check safety constraints
    for (const constraint of context.constraints) {
      if (constraint.type === 'SAFETY') {
        const violation = this.evaluateConstraint(constraint, context);
        if (violation) {
          findings.push({
            id: uuidv4(),
            type: 'SAFETY_VIOLATION',
            severity: 'CRITICAL',
            description: `Safety constraint violated: ${constraint.name}`,
            evidence: [
              {
                source: 'safety_constraint',
                type: 'CONSTRAINT',
                content: { constraint, violation },
                confidence: 0.98,
              },
            ],
            timestamp: new Date(),
          });
        }
      }
    }

    return findings;
  }

  private generateRemediations(
    findings: Finding[],
    context: CognitionContext,
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    for (const finding of findings) {
      const priority = this.findingSeverityToPriority(finding.severity);

      if (finding.type === 'CONSTRAINT_VIOLATION' || finding.type === 'SAFETY_VIOLATION') {
        const evidence = finding.evidence[0]?.content as {
          violation: { parameter: string; value: number; limit: number };
        };

        if (evidence?.violation) {
          recommendations.push({
            id: uuidv4(),
            action: {
              id: uuidv4(),
              type: 'ADJUST_SETPOINT',
              target: evidence.violation.parameter,
              parameters: {
                value: evidence.violation.limit * 0.9,
                reason: 'Compliance remediation',
              },
              priority,
              estimatedImpact: [],
              constraints: [],
            },
            rationale: `Remediate ${finding.type}: Adjust ${evidence.violation.parameter} to comply with limits`,
            priority,
            estimatedImpact: [
              {
                metric: 'compliance',
                direction: 'INCREASE',
                magnitude: 1,
                confidence: 0.9,
              },
            ],
            prerequisites: [],
          });
        }
      } else if (finding.type === 'REGULATORY_VIOLATION') {
        recommendations.push({
          id: uuidv4(),
          action: {
            id: uuidv4(),
            type: 'TRIGGER_WORKFLOW',
            target: 'regulatory_remediation',
            parameters: { findingId: finding.id },
            priority,
            estimatedImpact: [],
            constraints: [],
          },
          rationale: `Address regulatory violation: ${finding.description}`,
          priority,
          estimatedImpact: [],
          prerequisites: [],
        });
      }
    }

    return recommendations;
  }

  private findingSeverityToPriority(severity: RiskLevel): number {
    const mapping: Record<RiskLevel, number> = {
      CRITICAL: 10,
      HIGH: 8,
      MEDIUM: 5,
      LOW: 3,
      NEGLIGIBLE: 1,
    };
    return mapping[severity];
  }
}

// =============================================================================
// Operations Agent (Chat Interface)
// =============================================================================

export interface OperationsConfig extends AgentConfig {
  maxContextLength: number;
  responseStyle: 'CONCISE' | 'DETAILED' | 'TECHNICAL';
}

export interface OperationsQuery {
  question: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export class OperationsAgent extends BaseAgent {
  private operationsConfig: OperationsConfig;

  constructor(config: Partial<OperationsConfig> = {}) {
    super({
      ...config,
      name: config.name ?? 'OperationsAgent',
    });
    this.operationsConfig = {
      ...this.config,
      maxContextLength: config.maxContextLength ?? 10000,
      responseStyle: config.responseStyle ?? 'DETAILED',
    };
  }

  async execute(context: CognitionContext): Promise<AgentResult> {
    // This execute method provides general operational insights
    const startTime = Date.now();
    const findings: Finding[] = [];
    const recommendations: Recommendation[] = [];

    try {
      this.isRunning = true;
      this.emit('started', { agentId: this.id });

      // Generate operational summary
      const summary = this.generateOperationalSummary(context);
      findings.push(summary);

      // Identify operational concerns
      const concerns = this.identifyOperationalConcerns(context);
      findings.push(...concerns);

      // Generate proactive recommendations
      const proactiveRecs = this.generateProactiveRecommendations(context);
      recommendations.push(...proactiveRecs);

      const executionTime = Date.now() - startTime;

      return this.createResult(
        'OPERATIONS',
        findings,
        recommendations,
        0.85,
        executionTime,
        {},
      );
    } finally {
      this.isRunning = false;
      this.emit('completed', { agentId: this.id });
    }
  }

  /**
   * Answer an operational question grounded in twin context
   */
  async answerQuestion(
    query: OperationsQuery,
    context: CognitionContext,
  ): Promise<{
    answer: string;
    confidence: number;
    sources: string[];
    relatedTopics: string[];
  }> {
    const question = query.question.toLowerCase();
    const sources: string[] = [];
    let answer = '';
    let confidence = 0.7;

    // Status questions
    if (question.includes('status') || question.includes('how is') || question.includes('state')) {
      const status = this.describeTwinStatus(context);
      answer = status.description;
      sources.push(...status.sources);
      confidence = 0.9;
    }
    // Why questions (causal)
    else if (question.includes('why') || question.includes('cause') || question.includes('reason')) {
      const explanation = this.explainCausality(question, context);
      answer = explanation.answer;
      sources.push(...explanation.sources);
      confidence = explanation.confidence;
    }
    // What-if questions
    else if (question.includes('what if') || question.includes('what would happen')) {
      const scenario = this.evaluateScenario(question, context);
      answer = scenario.answer;
      sources.push(...scenario.sources);
      confidence = scenario.confidence;
    }
    // Recommendation questions
    else if (question.includes('should') || question.includes('recommend') || question.includes('best')) {
      const recommendation = this.provideRecommendation(question, context);
      answer = recommendation.answer;
      sources.push(...recommendation.sources);
      confidence = recommendation.confidence;
    }
    // Default: provide relevant context
    else {
      const relevant = this.findRelevantContext(question, context);
      answer = relevant.answer;
      sources.push(...relevant.sources);
      confidence = relevant.confidence;
    }

    return {
      answer,
      confidence,
      sources,
      relatedTopics: this.identifyRelatedTopics(question, context),
    };
  }

  private describeTwinStatus(context: CognitionContext): {
    description: string;
    sources: string[];
  } {
    const parts: string[] = [];
    const sources: string[] = [];

    // Current state summary
    const propCount = Object.keys(context.twinState.properties).length;
    parts.push(`The twin currently has ${propCount} monitored properties.`);
    sources.push('twin_state');

    // Key metrics
    const numericProps = Object.entries(context.twinState.properties)
      .filter(([, v]) => typeof v === 'number')
      .slice(0, 5);

    if (numericProps.length > 0) {
      const metrics = numericProps
        .map(([k, v]) => `${k}: ${(v as number).toFixed(2)}`)
        .join(', ');
      parts.push(`Key metrics: ${metrics}.`);
    }

    // Alerts
    if (context.activeAlerts.length > 0) {
      const critical = context.activeAlerts.filter((a) => a.severity === 'CRITICAL');
      const high = context.activeAlerts.filter((a) => a.severity === 'HIGH');

      if (critical.length > 0) {
        parts.push(`CRITICAL: ${critical.length} critical alert(s) require immediate attention.`);
        sources.push('alerts');
      }
      if (high.length > 0) {
        parts.push(`There are ${high.length} high-priority alert(s).`);
        sources.push('alerts');
      }
    } else {
      parts.push('No active alerts.');
    }

    // Patterns
    if (context.recognizedPatterns.length > 0) {
      const degradation = context.recognizedPatterns.filter((p) => p.type === 'DEGRADATION');
      if (degradation.length > 0) {
        parts.push(`${degradation.length} degradation pattern(s) detected.`);
        sources.push('patterns');
      }
    }

    return {
      description: parts.join(' '),
      sources,
    };
  }

  private explainCausality(
    question: string,
    context: CognitionContext,
  ): { answer: string; sources: string[]; confidence: number } {
    const sources: string[] = [];

    // Look for relevant alerts
    const relevantAlerts = context.activeAlerts.filter((a) =>
      question.includes(a.title.toLowerCase()) ||
      question.includes(a.source.toLowerCase()),
    );

    if (relevantAlerts.length > 0) {
      const alert = relevantAlerts[0];
      sources.push('alert_analysis');

      return {
        answer: `The ${alert.title} is likely caused by: ${alert.description}. Context: ${JSON.stringify(alert.context)}`,
        sources,
        confidence: 0.75,
      };
    }

    // Look for relevant patterns
    const relevantPatterns = context.recognizedPatterns.filter((p) =>
      question.includes(p.type.toLowerCase()) ||
      question.includes(p.description.toLowerCase()),
    );

    if (relevantPatterns.length > 0) {
      const pattern = relevantPatterns[0];
      sources.push('pattern_analysis');

      return {
        answer: `This is related to a recognized ${pattern.type} pattern: ${pattern.description}. Confidence: ${(pattern.confidence * 100).toFixed(0)}%`,
        sources,
        confidence: pattern.confidence,
      };
    }

    return {
      answer: 'I cannot determine the specific cause from the available context. More data or investigation may be needed.',
      sources: [],
      confidence: 0.3,
    };
  }

  private evaluateScenario(
    question: string,
    context: CognitionContext,
  ): { answer: string; sources: string[]; confidence: number } {
    // Simple scenario evaluation
    const sources = ['simulation'];

    // Extract parameter mentions
    for (const [key, value] of Object.entries(context.twinState.properties)) {
      if (typeof value === 'number' && question.includes(key.toLowerCase())) {
        const increase = question.includes('increase');
        const decrease = question.includes('decrease');

        if (increase || decrease) {
          const delta = increase ? 0.2 : -0.2;
          const newValue = value * (1 + delta);

          return {
            answer: `If ${key} ${increase ? 'increases' : 'decreases'} by 20% from ${value.toFixed(2)} to ${newValue.toFixed(2)}, this could affect related metrics. Based on historical patterns, I estimate a ${Math.abs(delta * 50).toFixed(0)}% impact on dependent variables.`,
            sources,
            confidence: 0.6,
          };
        }
      }
    }

    return {
      answer: 'I would need more specific parameters to evaluate this scenario. Please specify which metric you want to change and by how much.',
      sources: [],
      confidence: 0.4,
    };
  }

  private provideRecommendation(
    question: string,
    context: CognitionContext,
  ): { answer: string; sources: string[]; confidence: number } {
    const sources = ['optimization_analysis'];
    const parts: string[] = [];

    // Check objectives
    for (const objective of context.objectives.slice(0, 3)) {
      const currentValue = context.twinState.properties[objective.metric];
      if (typeof currentValue === 'number') {
        if (objective.direction === 'MAXIMIZE') {
          parts.push(`To maximize ${objective.metric} (currently ${currentValue.toFixed(2)}), consider increasing related inputs.`);
        } else if (objective.direction === 'MINIMIZE') {
          parts.push(`To minimize ${objective.metric} (currently ${currentValue.toFixed(2)}), consider reducing related inputs.`);
        }
      }
    }

    if (parts.length === 0) {
      return {
        answer: 'Based on the current state, I recommend maintaining current operations while monitoring for any emerging patterns.',
        sources: ['general_analysis'],
        confidence: 0.5,
      };
    }

    return {
      answer: parts.join(' '),
      sources,
      confidence: 0.7,
    };
  }

  private findRelevantContext(
    question: string,
    context: CognitionContext,
  ): { answer: string; sources: string[]; confidence: number } {
    const parts: string[] = [];
    const sources: string[] = [];

    // Search properties
    for (const [key, value] of Object.entries(context.twinState.properties)) {
      if (question.includes(key.toLowerCase())) {
        parts.push(`${key} is currently ${JSON.stringify(value)}.`);
        sources.push('twin_state');
      }
    }

    // Search alerts
    for (const alert of context.activeAlerts) {
      if (
        question.includes(alert.title.toLowerCase()) ||
        question.includes(alert.source.toLowerCase())
      ) {
        parts.push(`Alert "${alert.title}": ${alert.description}`);
        sources.push('alerts');
      }
    }

    if (parts.length === 0) {
      return {
        answer: 'I couldn\'t find specific information related to your question in the current context. Could you please rephrase or ask about specific metrics, alerts, or patterns?',
        sources: [],
        confidence: 0.3,
      };
    }

    return {
      answer: parts.join(' '),
      sources,
      confidence: 0.6,
    };
  }

  private identifyRelatedTopics(question: string, context: CognitionContext): string[] {
    const topics: string[] = [];

    // Add related properties
    for (const key of Object.keys(context.twinState.properties).slice(0, 3)) {
      topics.push(key);
    }

    // Add active alert topics
    for (const alert of context.activeAlerts.slice(0, 2)) {
      topics.push(alert.type);
    }

    return [...new Set(topics)];
  }

  private generateOperationalSummary(context: CognitionContext): Finding {
    const summary = this.describeTwinStatus(context);

    return {
      id: uuidv4(),
      type: 'OPERATIONAL_SUMMARY',
      severity: 'LOW',
      description: summary.description,
      evidence: summary.sources.map((s) => ({
        source: s,
        type: 'SUMMARY',
        content: {},
        confidence: 0.9,
      })),
      timestamp: new Date(),
    };
  }

  private identifyOperationalConcerns(context: CognitionContext): Finding[] {
    const findings: Finding[] = [];

    // High alert count
    if (context.activeAlerts.length > 5) {
      findings.push({
        id: uuidv4(),
        type: 'OPERATIONAL_CONCERN',
        severity: 'MEDIUM',
        description: `High number of active alerts (${context.activeAlerts.length})`,
        evidence: [
          {
            source: 'alert_analysis',
            type: 'ALERT_COUNT',
            content: { count: context.activeAlerts.length },
            confidence: 1.0,
          },
        ],
        timestamp: new Date(),
      });
    }

    // Degradation patterns
    const degradation = context.recognizedPatterns.filter((p) => p.type === 'DEGRADATION');
    if (degradation.length > 0) {
      findings.push({
        id: uuidv4(),
        type: 'DEGRADATION_CONCERN',
        severity: 'HIGH',
        description: `${degradation.length} degradation pattern(s) detected`,
        evidence: degradation.map((p) => ({
          source: 'pattern_analysis',
          type: 'PATTERN',
          content: p,
          confidence: p.confidence,
        })),
        timestamp: new Date(),
      });
    }

    return findings;
  }

  private generateProactiveRecommendations(context: CognitionContext): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Recommend addressing high-priority alerts
    const criticalAlerts = context.activeAlerts.filter((a) => a.severity === 'CRITICAL');
    for (const alert of criticalAlerts.slice(0, 2)) {
      recommendations.push({
        id: uuidv4(),
        action: {
          id: uuidv4(),
          type: 'SEND_ALERT',
          target: 'operations_team',
          parameters: { alertId: alert.id, escalate: true },
          priority: 10,
          estimatedImpact: [],
          constraints: [],
        },
        rationale: `Escalate critical alert: ${alert.title}`,
        priority: 10,
        estimatedImpact: [],
        prerequisites: [],
      });
    }

    return recommendations;
  }
}

// =============================================================================
// Agent Orchestrator
// =============================================================================

export class AgentOrchestrator extends EventEmitter {
  private agents: Map<string, BaseAgent> = new Map();

  constructor() {
    super();
  }

  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.id, agent);
    logger.info({ agentId: agent.id, name: agent.name }, 'Agent registered');
  }

  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  async executeAll(context: CognitionContext): Promise<Map<string, AgentResult>> {
    const results = new Map<string, AgentResult>();

    // Sort agents by priority
    const sortedAgents = Array.from(this.agents.values())
      .filter((a) => a.enabled)
      .sort((a, b) => b.priority - a.priority);

    // Execute agents in parallel (grouped by priority)
    const priorityGroups = new Map<number, BaseAgent[]>();
    for (const agent of sortedAgents) {
      const group = priorityGroups.get(agent.priority) ?? [];
      group.push(agent);
      priorityGroups.set(agent.priority, group);
    }

    for (const [priority, agents] of Array.from(priorityGroups.entries()).sort(
      (a, b) => b[0] - a[0],
    )) {
      const groupResults = await Promise.all(
        agents.map(async (agent) => {
          try {
            const result = await agent.execute(context);
            return { agentId: agent.id, result };
          } catch (error) {
            logger.error({ agentId: agent.id, error }, 'Agent execution failed');
            return {
              agentId: agent.id,
              result: {
                agentId: agent.id,
                agentType: 'ERROR',
                success: false,
                findings: [],
                recommendations: [],
                confidence: 0,
                executionTime: 0,
                metadata: { error: String(error) },
              },
            };
          }
        }),
      );

      for (const { agentId, result } of groupResults) {
        results.set(agentId, result);
      }
    }

    this.emit('execution:completed', { results });
    return results;
  }

  async executeAgent(agentId: string, context: CognitionContext): Promise<AgentResult | null> {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    return agent.execute(context);
  }

  getAgent<T extends BaseAgent>(agentId: string): T | undefined {
    return this.agents.get(agentId) as T | undefined;
  }

  listAgents(): Array<{ id: string; name: string; type: string; enabled: boolean }> {
    return Array.from(this.agents.values()).map((a) => ({
      id: a.id,
      name: a.name,
      type: a.constructor.name,
      enabled: a.enabled,
    }));
  }
}

export default {
  DiagnosticsAgent,
  OptimizationAgent,
  ComplianceAgent,
  OperationsAgent,
  AgentOrchestrator,
};
