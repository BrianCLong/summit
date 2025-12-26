import { metrics, ValueType } from '@opentelemetry/api';

const meter = metrics.getMeter('summit-outcome-metrics');

/**
 * Registry of outcome-focused metric names to ensure consistency with `docs/OUTCOME_METRICS.md`.
 */
export const MetricNames = {
  // JTBD 1: Influence Defense
  DEFENSE_TIME_TO_DETECTION: 'defense.time_to_detection_ms',
  DEFENSE_MITIGATION_CONFIDENCE: 'defense.mitigation_confidence_score',

  // JTBD 2: Compliance
  COMPLIANCE_AUTOMATION_RATIO: 'compliance.evidence_collection_automation_ratio',
  COMPLIANCE_BUNDLE_VERIFICATION: 'compliance.bundle_verification_success_rate',

  // JTBD 3: Maestro
  MAESTRO_RELIABILITY: 'maestro.workflow_reliability_rate',
  MAESTRO_RECOVERY: 'maestro.recovery_rate',

  // JTBD 4: Intelligence
  INTEL_TIME_TO_INSIGHT: 'intel.time_to_insight_ms',
  INTEL_CITATION_COVERAGE: 'intel.citation_coverage',

  // JTBD 5: Governance
  GOVERNANCE_POLICY_BLOCK: 'governance.policy_block_rate',
  GOVERNANCE_LEAKAGE_INCIDENTS: 'governance.data_leakage_incidents',
};

// Histograms for duration metrics
const timeToDetectionHistogram = meter.createHistogram(MetricNames.DEFENSE_TIME_TO_DETECTION, {
  description: 'Time from signal ingestion to alert generation',
  unit: 'ms',
  valueType: ValueType.INT,
});

const timeToInsightHistogram = meter.createHistogram(MetricNames.INTEL_TIME_TO_INSIGHT, {
  description: 'Time from search initiation to report generation',
  unit: 'ms',
  valueType: ValueType.INT,
});

// Counters/Gauges for rates and counts
const leakageCounter = meter.createCounter(MetricNames.GOVERNANCE_LEAKAGE_INCIDENTS, {
  description: 'Count of detected PII entities in egress traffic',
});

const workflowSuccessCounter = meter.createCounter('maestro.workflow.success', {
  description: 'Count of successful Maestro workflows',
});

const workflowFailureCounter = meter.createCounter('maestro.workflow.failure', {
  description: 'Count of failed Maestro workflows',
});

/**
 * OutcomeMetrics Helper
 * provides semantic methods to record customer outcomes.
 */
export class OutcomeMetrics {

  static recordDefenseDetection(durationMs: number, threatType: string) {
    timeToDetectionHistogram.record(durationMs, { threat_type: threatType });
  }

  static recordIntelTime(durationMs: number, queryType: string) {
    timeToInsightHistogram.record(durationMs, { query_type: queryType });
  }

  static recordGovernanceLeakage(entityType: string, model: string) {
    leakageCounter.add(1, { entity_type: entityType, model });
  }

  static recordWorkflowOutcome(pipelineId: string, success: boolean, failureReason?: string) {
    if (success) {
      workflowSuccessCounter.add(1, { pipeline_id: pipelineId });
    } else {
      workflowFailureCounter.add(1, { pipeline_id: pipelineId, reason: failureReason || 'unknown' });
    }
  }

  // Cache for dynamic outcome counters
  private static outcomeCounters = new Map<string, ReturnType<typeof meter.createCounter>>();

  // Helper for generic outcome success tracking which can be used to derive rates
  static recordOutcome(jobName: string, success: boolean, tags: Record<string, string> = {}) {
     let counter = this.outcomeCounters.get(jobName);
     if (!counter) {
       counter = meter.createCounter(`outcome.${jobName}.total`);
       this.outcomeCounters.set(jobName, counter);
     }
     counter.add(1, { ...tags, status: success ? 'success' : 'failure' });
  }
}
