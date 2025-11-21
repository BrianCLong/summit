/**
 * Detection Engine Core
 *
 * Executes detection rules against telemetry events.
 */

import type { DetectionResult, SeverityLevel } from '../schemas/base.js';
import { v4 as uuidv4 } from 'uuid';

/** Detection rule definition */
export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  severity: SeverityLevel;
  enabled: boolean;
  /** Event types this rule applies to */
  eventTypes: string[];
  /** MITRE ATT&CK mapping */
  mitreTactics?: string[];
  mitreTechniques?: string[];
  /** Tags for categorization */
  tags?: string[];
  /** Rule logic - returns confidence score 0-1, or null if no match */
  evaluate: (event: unknown) => number | null;
}

/** Detection engine configuration */
export interface EngineConfig {
  /** Minimum confidence to report */
  minConfidence: number;
  /** Maximum detections per event */
  maxDetectionsPerEvent: number;
  /** Enable all rules by default */
  enableAll: boolean;
}

const defaultConfig: EngineConfig = {
  minConfidence: 0.5,
  maxDetectionsPerEvent: 10,
  enableAll: true,
};

/** Detection engine */
export class DetectionEngine {
  private rules: Map<string, DetectionRule> = new Map();
  private config: EngineConfig;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /** Register a detection rule */
  registerRule(rule: DetectionRule): void {
    this.rules.set(rule.id, rule);
  }

  /** Register multiple rules */
  registerRules(rules: DetectionRule[]): void {
    for (const rule of rules) {
      this.registerRule(rule);
    }
  }

  /** Enable a rule by ID */
  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
    }
  }

  /** Disable a rule by ID */
  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
    }
  }

  /** Get all registered rules */
  getRules(): DetectionRule[] {
    return Array.from(this.rules.values());
  }

  /** Get enabled rules */
  getEnabledRules(): DetectionRule[] {
    return this.getRules().filter((r) => r.enabled);
  }

  /** Evaluate a single event against all enabled rules */
  evaluate(event: unknown): DetectionResult[] {
    const results: DetectionResult[] = [];
    const eventType = (event as { eventType?: string })?.eventType;

    if (!eventType) {
      return results;
    }

    for (const rule of this.getEnabledRules()) {
      // Skip if rule doesn't apply to this event type
      if (!rule.eventTypes.includes(eventType) && !rule.eventTypes.includes('*')) {
        continue;
      }

      try {
        const confidence = rule.evaluate(event);

        if (confidence !== null && confidence >= this.config.minConfidence) {
          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            confidence,
            matchedFields: [], // Could be enhanced to track matched fields
            description: rule.description,
            mitreTactics: rule.mitreTactics,
            mitreTechniques: rule.mitreTechniques,
          });

          if (results.length >= this.config.maxDetectionsPerEvent) {
            break;
          }
        }
      } catch (error) {
        // Log but don't fail on rule errors
        console.warn(`Rule ${rule.id} evaluation failed:`, error);
      }
    }

    return results;
  }

  /** Evaluate multiple events */
  evaluateBatch(events: unknown[]): Map<string, DetectionResult[]> {
    const results = new Map<string, DetectionResult[]>();

    for (const event of events) {
      const eventId = (event as { id?: string })?.id ?? uuidv4();
      const detections = this.evaluate(event);

      if (detections.length > 0) {
        results.set(eventId, detections);
      }
    }

    return results;
  }

  /** Get detection statistics */
  getStats(results: Map<string, DetectionResult[]>): {
    totalEvents: number;
    eventsWithDetections: number;
    totalDetections: number;
    bySeverity: Record<SeverityLevel, number>;
    byRule: Record<string, number>;
  } {
    const stats = {
      totalEvents: 0,
      eventsWithDetections: results.size,
      totalDetections: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 } as Record<SeverityLevel, number>,
      byRule: {} as Record<string, number>,
    };

    for (const detections of results.values()) {
      stats.totalDetections += detections.length;

      for (const detection of detections) {
        stats.bySeverity[detection.severity]++;
        stats.byRule[detection.ruleId] = (stats.byRule[detection.ruleId] ?? 0) + 1;
      }
    }

    return stats;
  }
}

/** Create a new detection engine with default rules */
export function createDetectionEngine(config?: Partial<EngineConfig>): DetectionEngine {
  return new DetectionEngine(config);
}
