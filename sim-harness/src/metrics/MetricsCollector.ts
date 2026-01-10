/**
 * Metrics Collector
 * Collects and aggregates performance and quality metrics
 */

import {
  SessionMetrics,
  AggregatedMetrics,
  ScenarioType,
} from '../types/index.js';

interface StepMetric {
  type: string;
  duration: number;
  success: boolean;
  timestamp: string;
  error?: any;
}

interface SessionData {
  sessionId: string;
  scenarioType: ScenarioType;
  startTime: number;
  endTime?: number;
  steps: StepMetric[];
  metrics: Partial<SessionMetrics>;
  groundTruthDetectedAt?: number;
}

export class MetricsCollector {
  private sessions: Map<string, SessionData> = new Map();
  private completedSessions: SessionMetrics[] = [];

  /**
   * Start tracking a new session
   */
  startSession(sessionId: string, scenarioType: ScenarioType = 'custom'): void {
    const sessionData: SessionData = {
      sessionId,
      scenarioType,
      startTime: Date.now(),
      steps: [],
      metrics: {
        sessionId,
        scenarioType,
        startTime: new Date().toISOString(),
        investigationCompleted: false,
        tasksCompleted: 0,
        tasksFailed: 0,
        totalQueries: 0,
        averageQueryTime: 0,
        entitiesExplored: 0,
        entitiesTotal: 0,
        relationshipsExplored: 0,
        relationshipsTotal: 0,
        keyEntitiesFound: 0,
        keyEntitiesExpected: 0,
        groundTruthFound: 0,
        groundTruthTotal: 0,
        groundTruthCoverage: 0,
        copilotQueriesCount: 0,
        copilotSuccessRate: 0,
        copilotAverageResponseTime: 0,
        citationCorrectnessRate: 1,
        falseLinkRate: 0,
        p95StepLatency: 0,
        leakageIncidents: 0,
        errors: [],
      },
    };

    this.sessions.set(sessionId, sessionData);
  }

  /**
   * Record step completion
   */
  recordStepCompletion(
    sessionId: string,
    stepType: string,
    duration: number
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.steps.push({
      type: stepType,
      duration,
      success: true,
      timestamp: new Date().toISOString(),
    });

    session.metrics.tasksCompleted = (session.metrics.tasksCompleted || 0) + 1;
    session.metrics.totalQueries = (session.metrics.totalQueries || 0) + 1;

    // Update average query time
    const totalQueries = session.metrics.totalQueries || 1;
    const currentAvg = session.metrics.averageQueryTime || 0;
    session.metrics.averageQueryTime =
      (currentAvg * (totalQueries - 1) + duration) / totalQueries;
  }

  /**
   * Record step failure
   */
  recordStepFailure(
    sessionId: string,
    stepType: string,
    duration: number,
    error: any
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.steps.push({
      type: stepType,
      duration,
      success: false,
      timestamp: new Date().toISOString(),
      error,
    });

    session.metrics.tasksFailed = (session.metrics.tasksFailed || 0) + 1;
    session.metrics.errors = session.metrics.errors || [];
    session.metrics.errors.push({
      timestamp: new Date().toISOString(),
      type: stepType,
      message: error.message || String(error),
    });
  }

  updateSessionMetrics(
    sessionId: string,
    updates: Partial<SessionMetrics>
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.metrics = { ...session.metrics, ...updates };

    if (
      updates.timeToGroundTruth !== undefined &&
      session.groundTruthDetectedAt === undefined
    ) {
      session.groundTruthDetectedAt = session.startTime + updates.timeToGroundTruth;
    }
  }

  /**
   * End session and calculate final metrics
   */
  endSession(sessionId: string): SessionMetrics {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.endTime = Date.now();
    const duration = session.endTime - session.startTime;

    const latencies = session.steps.map((step) => step.duration).sort((a, b) => a - b);
    const p95StepLatency = this.calculatePercentile(latencies, 95);

    // Calculate coverage rates
    const entitiesExplored = session.metrics.entitiesExplored || 0;
    const entitiesTotal = session.metrics.entitiesTotal || 1;
    const relationshipsExplored = session.metrics.relationshipsExplored || 0;
    const relationshipsTotal = session.metrics.relationshipsTotal || 1;

    // Calculate success rate
    const tasksCompleted = session.metrics.tasksCompleted || 0;
    const tasksFailed = session.metrics.tasksFailed || 0;
    const totalTasks = tasksCompleted + tasksFailed;

    // Calculate quality metrics
    const keyEntitiesFound = session.metrics.keyEntitiesFound || 0;
    const keyEntitiesExpected = session.metrics.keyEntitiesExpected || 1;

    const groundTruthFound = session.metrics.groundTruthFound || 0;
    const groundTruthTotal = session.metrics.groundTruthTotal || 0;
    const groundTruthCoverage =
      groundTruthTotal > 0 ? groundTruthFound / groundTruthTotal : 0;

    const investigationCompleted = (session.metrics.tasksFailed || 0) === 0;

    const timeToGroundTruth =
      session.metrics.timeToGroundTruth ||
      (session.groundTruthDetectedAt
        ? session.groundTruthDetectedAt - session.startTime
        : undefined);

    const precision =
      keyEntitiesFound > 0 && entitiesExplored > 0
        ? keyEntitiesFound / entitiesExplored
        : 0;
    const recall =
      keyEntitiesFound > 0 && keyEntitiesExpected > 0
        ? keyEntitiesFound / keyEntitiesExpected
        : 0;
    const f1Score =
      precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    // Find time to key milestones
    const copilotStep = session.steps.find((s) => s.type === 'RUN_COPILOT');
    const timeToFirstInsight = copilotStep
      ? new Date(copilotStep.timestamp).getTime() - session.startTime
      : undefined;

    const finalMetrics: SessionMetrics = {
      sessionId: session.sessionId,
      scenarioType: session.scenarioType,
      startTime: new Date(session.startTime).toISOString(),
      endTime: new Date(session.endTime).toISOString(),
      duration,
      tasksCompleted,
      tasksFailed,
      successRate: totalTasks > 0 ? tasksCompleted / totalTasks : 0,
      investigationCompleted,
      timeToFirstInsight,
      timeToKeyFindings: duration,
      timeToGroundTruth,
      totalQueries: session.metrics.totalQueries || 0,
      averageQueryTime: session.metrics.averageQueryTime || 0,
      p95StepLatency,
      entitiesExplored,
      entitiesTotal,
      coverageRate: entitiesTotal > 0 ? entitiesExplored / entitiesTotal : 0,
      relationshipsExplored,
      relationshipsTotal,
      falseLinkRate: session.metrics.falseLinkRate || 0,
      keyEntitiesFound,
      keyEntitiesExpected,
      groundTruthFound,
      groundTruthTotal,
      groundTruthCoverage,
      citationCorrectnessRate: session.metrics.citationCorrectnessRate || 0,
      precision,
      recall,
      f1Score,
      copilotQueriesCount: session.metrics.copilotQueriesCount || 0,
      copilotSuccessRate: session.metrics.copilotSuccessRate || 0,
      copilotAverageResponseTime:
        session.metrics.copilotAverageResponseTime || 0,
      leakageIncidents: session.metrics.leakageIncidents || 0,
      errors: session.metrics.errors || [],
    };

    this.completedSessions.push(finalMetrics);
    this.sessions.delete(sessionId);

    return finalMetrics;
  }

  /**
   * Get all completed session metrics
   */
  getAllMetrics(): SessionMetrics[] {
    return [...this.completedSessions];
  }

  /**
   * Get metrics for a specific scenario type
   */
  getMetricsByScenario(scenarioType: ScenarioType): SessionMetrics[] {
    return this.completedSessions.filter(
      (m) => m.scenarioType === scenarioType
    );
  }

  /**
   * Calculate aggregated metrics across all sessions
   */
  getAggregatedMetrics(): AggregatedMetrics {
    return this.aggregateMetrics(this.completedSessions);
  }

  /**
   * Calculate aggregated metrics for specific sessions
   */
  aggregateMetrics(sessions: SessionMetrics[]): AggregatedMetrics {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        averageSuccessRate: 0,
        averageDuration: 0,
        averageCoverageRate: 0,
        averagePrecision: 0,
        averageRecall: 0,
        averageF1Score: 0,
        averageQueriesPerSession: 0,
        errorRate: 0,
      };
    }

    const sum = (arr: number[]) =>
      arr.reduce((a, b) => a + b, 0) / arr.length;

    const successRates = sessions.map((s) => s.successRate);
    const durations = sessions.map((s) => s.duration || 0);
    const coverageRates = sessions.map((s) => s.coverageRate);
    const precisions = sessions.map((s) => s.precision || 0);
    const recalls = sessions.map((s) => s.recall || 0);
    const f1Scores = sessions.map((s) => s.f1Score || 0);
    const queries = sessions.map((s) => s.totalQueries);
    const errors = sessions.reduce(
      (total, s) => total + s.errors.length,
      0
    );
    const timeToGroundTruth = sessions
      .map((s) => s.timeToGroundTruth)
      .filter((val): val is number => typeof val === 'number');
    const p95Latencies = sessions.map((s) => s.p95StepLatency || 0);
    const citationCorrectness = sessions.map(
      (s) => s.citationCorrectnessRate || 0
    );
    const falseLinkRates = sessions.map((s) => s.falseLinkRate || 0);
    const leakageIncidents = sessions.map((s) => s.leakageIncidents || 0);
    const totalTasks = sessions.reduce(
      (total, s) => total + s.tasksCompleted + s.tasksFailed,
      0
    );

    return {
      totalSessions: sessions.length,
      averageSuccessRate: sum(successRates),
      averageDuration: sum(durations),
      averageTimeToGroundTruth:
        timeToGroundTruth.length > 0 ? sum(timeToGroundTruth) : 0,
      averageCoverageRate: sum(coverageRates),
      averagePrecision: sum(precisions),
      averageRecall: sum(recalls),
      averageF1Score: sum(f1Scores),
      averageQueriesPerSession: sum(queries),
      errorRate: totalTasks > 0 ? errors / totalTasks : 0,
      p95Latency: sum(p95Latencies),
      averageCitationCorrectness: sum(citationCorrectness),
      averageFalseLinkRate: sum(falseLinkRates),
      averageLeakageIncidents: sum(leakageIncidents),
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) {
      return 0;
    }

    if (percentile <= 0) return values[0];
    if (percentile >= 100) return values[values.length - 1];

    const rank = (percentile / 100) * values.length;
    const index = Math.min(values.length - 1, Math.ceil(rank) - 1);
    return values[index];
  }

  /**
   * Clear all collected metrics
   */
  clear(): void {
    this.sessions.clear();
    this.completedSessions = [];
  }

  /**
   * Export metrics to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(
      {
        completedSessions: this.completedSessions,
        aggregated: this.getAggregatedMetrics(),
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  /**
   * Export metrics to CSV
   */
  exportToCSV(): string {
    if (this.completedSessions.length === 0) {
      return 'No sessions to export';
    }

    const headers = [
      'sessionId',
      'scenarioType',
      'startTime',
      'endTime',
      'duration',
      'tasksCompleted',
      'tasksFailed',
      'successRate',
      'investigationCompleted',
      'timeToFirstInsight',
      'timeToGroundTruth',
      'totalQueries',
      'averageQueryTime',
      'p95StepLatency',
      'entitiesExplored',
      'entitiesTotal',
      'coverageRate',
      'relationshipsExplored',
      'relationshipsTotal',
      'falseLinkRate',
      'keyEntitiesFound',
      'keyEntitiesExpected',
      'groundTruthFound',
      'groundTruthTotal',
      'groundTruthCoverage',
      'citationCorrectnessRate',
      'precision',
      'recall',
      'f1Score',
      'copilotQueriesCount',
      'copilotSuccessRate',
      'copilotAverageResponseTime',
      'leakageIncidents',
      'errorCount',
    ];

    const rows = this.completedSessions.map((session) => [
      session.sessionId,
      session.scenarioType,
      session.startTime,
      session.endTime || '',
      session.duration || 0,
      session.tasksCompleted,
      session.tasksFailed,
      session.successRate.toFixed(4),
      session.investigationCompleted ?? false,
      session.timeToFirstInsight || '',
      session.timeToGroundTruth || '',
      session.totalQueries,
      session.averageQueryTime.toFixed(2),
      session.p95StepLatency?.toFixed(2) || 0,
      session.entitiesExplored,
      session.entitiesTotal,
      session.coverageRate.toFixed(4),
      session.relationshipsExplored,
      session.relationshipsTotal,
      (session.falseLinkRate || 0).toFixed(4),
      session.keyEntitiesFound,
      session.keyEntitiesExpected,
      session.groundTruthFound || 0,
      session.groundTruthTotal || 0,
      (session.groundTruthCoverage || 0).toFixed(4),
      (session.citationCorrectnessRate || 0).toFixed(4),
      (session.precision || 0).toFixed(4),
      (session.recall || 0).toFixed(4),
      (session.f1Score || 0).toFixed(4),
      session.copilotQueriesCount,
      session.copilotSuccessRate.toFixed(4),
      session.copilotAverageResponseTime.toFixed(2),
      session.leakageIncidents || 0,
      session.errors.length,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
