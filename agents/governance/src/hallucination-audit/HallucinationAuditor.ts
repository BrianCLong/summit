/**
 * Hallucination Audit Framework
 *
 * Provides detection, tracking, and remediation of AI hallucinations
 * with comprehensive audit trails for compliance.
 */

import crypto from 'node:crypto';
import {
  HallucinationDetection,
  HallucinationType,
  HallucinationSeverity,
  HallucinationEvidence,
  HallucinationRemediation,
  HallucinationAuditConfig,
  HallucinationAuditReport,
  HallucinationPattern,
  GovernanceEvent,
  AgentId,
  SessionId,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: HallucinationAuditConfig = {
  enabled: true,
  detectionMethods: ['factual_check', 'consistency_check', 'source_verification'],
  samplingRate: 1.0, // Check all outputs
  severityThreshold: 'misleading',
  autoRemediate: true,
  escalationThreshold: 5, // Escalate after 5 detections
  retentionDays: 90,
};

// ============================================================================
// Detection Methods
// ============================================================================

export interface DetectionMethod {
  id: string;
  name: string;
  detect(input: string, output: string, context: DetectionContext): Promise<DetectionResult>;
}

export interface DetectionContext {
  agentId: AgentId;
  sessionId: SessionId;
  groundTruth?: Record<string, unknown>;
  previousOutputs?: string[];
  sources?: string[];
}

export interface DetectionResult {
  detected: boolean;
  type?: HallucinationType;
  confidence: number;
  evidence: Partial<HallucinationEvidence>;
  hallucinatedContent?: string;
}

// ============================================================================
// Hallucination Auditor
// ============================================================================

export class HallucinationAuditor {
  private config: HallucinationAuditConfig;
  private detections: Map<string, HallucinationDetection>;
  private detectionMethods: Map<string, DetectionMethod>;
  private eventListeners: Array<(event: GovernanceEvent) => void>;
  private agentDetectionCounts: Map<AgentId, number>;

  constructor(config: Partial<HallucinationAuditConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.detections = new Map();
    this.detectionMethods = new Map();
    this.eventListeners = [];
    this.agentDetectionCounts = new Map();

    // Register default detection methods
    this.registerDefaultMethods();
  }

  /**
   * Audit an LLM output for hallucinations
   */
  async audit(params: {
    agentId: AgentId;
    sessionId: SessionId;
    input: string;
    output: string;
    groundTruth?: Record<string, unknown>;
    previousOutputs?: string[];
    sources?: string[];
  }): Promise<HallucinationDetection | null> {
    if (!this.config.enabled) return null;

    // Apply sampling
    if (Math.random() > this.config.samplingRate) return null;

    const context: DetectionContext = {
      agentId: params.agentId,
      sessionId: params.sessionId,
      groundTruth: params.groundTruth,
      previousOutputs: params.previousOutputs,
      sources: params.sources,
    };

    // Run all configured detection methods
    const results: DetectionResult[] = [];

    for (const methodId of this.config.detectionMethods) {
      const method = this.detectionMethods.get(methodId);
      if (!method) continue;

      try {
        const result = await method.detect(params.input, params.output, context);
        results.push(result);
      } catch (error) {
        console.error(`Detection method ${methodId} failed:`, error);
      }
    }

    // Combine results
    const positiveDetections = results.filter((r) => r.detected);
    if (positiveDetections.length === 0) return null;

    // Create detection record
    const detection = this.createDetection(params, positiveDetections);

    // Check severity threshold
    if (!this.meetsSeverityThreshold(detection.severity)) {
      return detection; // Log but don't escalate
    }

    // Store and process
    this.detections.set(detection.id, detection);
    this.incrementAgentCount(params.agentId);

    // Auto-remediate if enabled
    if (this.config.autoRemediate) {
      detection.remediation = await this.remediate(detection);
    }

    // Check escalation threshold
    const agentCount = this.agentDetectionCounts.get(params.agentId) || 0;
    if (agentCount >= this.config.escalationThreshold) {
      await this.escalate(params.agentId, detection);
    }

    // Emit event
    this.emitEvent({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: 'hallucination_detected',
      source: 'HallucinationAuditor',
      agentId: params.agentId,
      sessionId: params.sessionId,
      actor: 'system',
      action: 'detect_hallucination',
      resource: detection.id,
      outcome: 'success',
      classification: 'UNCLASSIFIED',
      details: {
        type: detection.type,
        severity: detection.severity,
        confidence: detection.confidence,
      },
    });

    return detection;
  }

  /**
   * Register a detection method
   */
  registerMethod(method: DetectionMethod): void {
    this.detectionMethods.set(method.id, method);
  }

  /**
   * Register default detection methods
   */
  private registerDefaultMethods(): void {
    // Factual consistency check
    this.registerMethod({
      id: 'factual_check',
      name: 'Factual Consistency Check',
      async detect(input, output, context) {
        // Check for common hallucination patterns
        const patterns = [
          /according to .* (19\d{2}|20[0-1]\d) study/i, // Fabricated studies
          /\b[A-Z][a-z]+ et al\./i, // Fabricated citations
          /statistics show that \d+%/i, // Fabricated statistics
          /was founded in \d{4}/i, // Potentially false founding dates
        ];

        for (const pattern of patterns) {
          if (pattern.test(output)) {
            // Would verify against knowledge base in production
            return {
              detected: true,
              type: 'citation_fabrication' as HallucinationType,
              confidence: 0.7,
              evidence: {
                type: 'factual_check',
                method: 'pattern_matching',
                result: 'uncertain',
              },
              hallucinatedContent: output.match(pattern)?.[0],
            };
          }
        }

        return { detected: false, confidence: 0 };
      },
    });

    // Self-contradiction check
    this.registerMethod({
      id: 'consistency_check',
      name: 'Self-Consistency Check',
      async detect(input, output, context) {
        if (!context.previousOutputs || context.previousOutputs.length === 0) {
          return { detected: false, confidence: 0 };
        }

        // Simple keyword extraction and comparison
        const extractKeyFacts = (text: string) => {
          const numbers = text.match(/\d+(\.\d+)?/g) || [];
          const dates = text.match(/\b\d{4}\b/g) || [];
          return { numbers, dates };
        };

        const currentFacts = extractKeyFacts(output);
        const previousFacts = context.previousOutputs.map(extractKeyFacts);

        // Check for contradicting numbers in same context
        for (const prev of previousFacts) {
          const contradictingNumbers = currentFacts.numbers.filter(
            (n) => prev.numbers.includes(n) === false && prev.numbers.length > 0,
          );

          if (contradictingNumbers.length > 0 && prev.numbers.length > 0) {
            return {
              detected: true,
              type: 'self_contradiction' as HallucinationType,
              confidence: 0.6,
              evidence: {
                type: 'consistency_check',
                method: 'numerical_comparison',
                result: 'uncertain',
                details: { contradictingNumbers },
              },
            };
          }
        }

        return { detected: false, confidence: 0 };
      },
    });

    // Source verification check
    this.registerMethod({
      id: 'source_verification',
      name: 'Source Verification Check',
      async detect(input, output, context) {
        if (!context.sources || context.sources.length === 0) {
          return { detected: false, confidence: 0 };
        }

        // Check if output makes claims not supported by sources
        // This is a simplified version - production would use semantic similarity
        const outputLower = output.toLowerCase();
        const sourcesLower = context.sources.join(' ').toLowerCase();

        // Extract quoted or emphasized claims
        const claims = output.match(/"[^"]+"/g) || [];

        for (const claim of claims) {
          const cleanClaim = claim.replace(/"/g, '').toLowerCase();
          if (!sourcesLower.includes(cleanClaim.substring(0, 20))) {
            return {
              detected: true,
              type: 'unsupported_claim' as HallucinationType,
              confidence: 0.65,
              evidence: {
                type: 'source_verification',
                method: 'claim_extraction',
                result: 'refuted',
                details: { claim },
              },
              hallucinatedContent: claim,
            };
          }
        }

        return { detected: false, confidence: 0 };
      },
    });

    // Temporal confusion check
    this.registerMethod({
      id: 'temporal_check',
      name: 'Temporal Confusion Check',
      async detect(input, output, context) {
        const currentYear = new Date().getFullYear();

        // Check for future dates presented as past
        const futurePattern = new RegExp(`in (${currentYear + 1}|${currentYear + 2}|\\d{4}).*happened`, 'i');
        if (futurePattern.test(output)) {
          return {
            detected: true,
            type: 'temporal_confusion' as HallucinationType,
            confidence: 0.8,
            evidence: {
              type: 'factual_check',
              method: 'temporal_analysis',
              result: 'confirmed',
            },
          };
        }

        return { detected: false, confidence: 0 };
      },
    });
  }

  /**
   * Create detection record from results
   */
  private createDetection(
    params: {
      agentId: AgentId;
      sessionId: SessionId;
      input: string;
      output: string;
    },
    results: DetectionResult[],
  ): HallucinationDetection {
    // Take the highest confidence detection
    const primary = results.reduce((a, b) => (a.confidence > b.confidence ? a : b));

    return {
      id: `HAL-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`,
      sessionId: params.sessionId,
      agentId: params.agentId,
      timestamp: new Date(),
      type: primary.type || 'factual_error',
      severity: this.calculateSeverity(primary),
      confidence: primary.confidence,
      inputContext: params.input.substring(0, 500),
      generatedOutput: params.output.substring(0, 1000),
      hallucinatedContent: primary.hallucinatedContent || '',
      evidence: results.map((r) => ({
        type: r.evidence.type || 'factual_check',
        method: r.evidence.method || 'unknown',
        result: r.evidence.result || 'uncertain',
        confidence: r.confidence,
        details: r.evidence.details || {},
      })) as HallucinationEvidence[],
    };
  }

  /**
   * Calculate severity from detection result
   */
  private calculateSeverity(result: DetectionResult): HallucinationSeverity {
    if (result.confidence > 0.9) {
      if (result.type === 'factual_error' || result.type === 'citation_fabrication') {
        return 'harmful';
      }
      return 'misleading';
    }

    if (result.confidence > 0.7) {
      return 'misleading';
    }

    return 'benign';
  }

  /**
   * Check if severity meets threshold
   */
  private meetsSeverityThreshold(severity: HallucinationSeverity): boolean {
    const levels: HallucinationSeverity[] = ['benign', 'misleading', 'harmful', 'dangerous'];
    return levels.indexOf(severity) >= levels.indexOf(this.config.severityThreshold);
  }

  /**
   * Remediate a detected hallucination
   */
  private async remediate(detection: HallucinationDetection): Promise<HallucinationRemediation> {
    // Determine remediation action based on severity
    let action: 'correct' | 'redact' | 'flag' | 'reject';

    switch (detection.severity) {
      case 'dangerous':
        action = 'reject';
        break;
      case 'harmful':
        action = 'redact';
        break;
      case 'misleading':
        action = 'flag';
        break;
      default:
        action = 'flag';
    }

    const remediation: HallucinationRemediation = {
      action,
      explanation: `Detected ${detection.type} with ${Math.round(detection.confidence * 100)}% confidence`,
    };

    if (action === 'redact') {
      remediation.correctedOutput = this.redactHallucination(
        detection.generatedOutput,
        detection.hallucinatedContent,
      );
    }

    // Emit remediation event
    this.emitEvent({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: 'hallucination_remediated',
      source: 'HallucinationAuditor',
      agentId: detection.agentId,
      sessionId: detection.sessionId,
      actor: 'system',
      action: `remediate_${action}`,
      resource: detection.id,
      outcome: 'success',
      classification: 'UNCLASSIFIED',
      details: { action, severity: detection.severity },
    });

    return remediation;
  }

  /**
   * Redact hallucinated content from output
   */
  private redactHallucination(output: string, hallucinatedContent: string): string {
    if (!hallucinatedContent) return output;
    return output.replace(hallucinatedContent, '[REDACTED - Unverified Content]');
  }

  /**
   * Escalate after threshold exceeded
   */
  private async escalate(agentId: AgentId, detection: HallucinationDetection): Promise<void> {
    console.warn(
      `[Hallucination] Escalation threshold exceeded for agent ${agentId}. ` +
        `Total detections: ${this.agentDetectionCounts.get(agentId)}`,
    );
    // Would integrate with IncidentResponseManager
  }

  /**
   * Increment detection count for agent
   */
  private incrementAgentCount(agentId: AgentId): void {
    const current = this.agentDetectionCounts.get(agentId) || 0;
    this.agentDetectionCounts.set(agentId, current + 1);
  }

  /**
   * Generate audit report
   */
  generateReport(period: { start: Date; end: Date }): HallucinationAuditReport {
    const detectionsInPeriod = Array.from(this.detections.values()).filter(
      (d) => d.timestamp >= period.start && d.timestamp <= period.end,
    );

    const byType: Record<HallucinationType, number> = {
      factual_error: 0,
      citation_fabrication: 0,
      entity_confusion: 0,
      temporal_confusion: 0,
      logical_inconsistency: 0,
      self_contradiction: 0,
      unsupported_claim: 0,
      context_drift: 0,
    };

    const bySeverity: Record<HallucinationSeverity, number> = {
      benign: 0,
      misleading: 0,
      harmful: 0,
      dangerous: 0,
    };

    const byAgent: Record<AgentId, number> = {};

    for (const detection of detectionsInPeriod) {
      byType[detection.type]++;
      bySeverity[detection.severity]++;
      byAgent[detection.agentId] = (byAgent[detection.agentId] || 0) + 1;
    }

    // Identify patterns
    const patterns = this.identifyPatterns(detectionsInPeriod);

    return {
      period,
      totalGenerations: 0, // Would track from orchestrator
      totalDetections: detectionsInPeriod.length,
      detectionRate: 0, // Would calculate from total generations
      byType,
      bySeverity,
      byAgent,
      topPatterns: patterns,
      recommendations: this.generateRecommendations(patterns, byAgent),
    };
  }

  /**
   * Identify hallucination patterns
   */
  private identifyPatterns(detections: HallucinationDetection[]): HallucinationPattern[] {
    const patterns: Map<string, HallucinationPattern> = new Map();

    for (const detection of detections) {
      const key = `${detection.type}:${detection.hallucinatedContent?.substring(0, 20)}`;

      if (!patterns.has(key)) {
        patterns.set(key, {
          pattern: detection.hallucinatedContent?.substring(0, 50) || detection.type,
          frequency: 0,
          types: [],
          affectedAgents: [],
          suggestedMitigation: this.suggestMitigation(detection.type),
        });
      }

      const pattern = patterns.get(key)!;
      pattern.frequency++;
      if (!pattern.types.includes(detection.type)) {
        pattern.types.push(detection.type);
      }
      if (!pattern.affectedAgents.includes(detection.agentId)) {
        pattern.affectedAgents.push(detection.agentId);
      }
    }

    return Array.from(patterns.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  /**
   * Suggest mitigation for hallucination type
   */
  private suggestMitigation(type: HallucinationType): string {
    const mitigations: Record<HallucinationType, string> = {
      factual_error: 'Enhance factual grounding with knowledge base retrieval',
      citation_fabrication: 'Require explicit source attribution with verification',
      entity_confusion: 'Implement entity disambiguation in preprocessing',
      temporal_confusion: 'Add temporal context validation',
      logical_inconsistency: 'Enable chain-of-thought verification',
      self_contradiction: 'Implement output consistency checking across sessions',
      unsupported_claim: 'Strengthen source citation requirements',
      context_drift: 'Reduce context window or add context anchoring',
    };

    return mitigations[type] || 'Review and enhance detection methodology';
  }

  /**
   * Generate recommendations from analysis
   */
  private generateRecommendations(
    patterns: HallucinationPattern[],
    byAgent: Record<AgentId, number>,
  ): string[] {
    const recommendations: string[] = [];

    // Pattern-based recommendations
    for (const pattern of patterns.slice(0, 3)) {
      recommendations.push(
        `Address "${pattern.types[0]}" pattern (${pattern.frequency} occurrences): ${pattern.suggestedMitigation}`,
      );
    }

    // Agent-based recommendations
    const highRateAgents = Object.entries(byAgent)
      .filter(([_, count]) => count > 5)
      .map(([agent]) => agent);

    if (highRateAgents.length > 0) {
      recommendations.push(
        `Review configuration for high-rate agents: ${highRateAgents.join(', ')}`,
      );
    }

    return recommendations;
  }

  /**
   * Get detection by ID
   */
  getDetection(id: string): HallucinationDetection | null {
    return this.detections.get(id) || null;
  }

  /**
   * Get detections for agent
   */
  getAgentDetections(agentId: AgentId): HallucinationDetection[] {
    return Array.from(this.detections.values()).filter((d) => d.agentId === agentId);
  }

  /**
   * Add event listener
   */
  onEvent(listener: (event: GovernanceEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Emit event
   */
  private emitEvent(event: GovernanceEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const hallucinationAuditor = new HallucinationAuditor();
