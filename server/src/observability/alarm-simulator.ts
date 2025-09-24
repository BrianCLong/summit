export type AlarmSeverity = 'ok' | 'warning' | 'critical';

export interface BurnRateThresholds {
  warning: number;
  critical: number;
}

export interface BurnRateEvaluation {
  severity: AlarmSeverity;
  triggered: boolean;
  message: string;
}

export const defaultBurnRateThresholds: BurnRateThresholds = {
  warning: 2.0,
  critical: 5.0,
};

export function evaluateBurnRate(
  burnRate: number,
  thresholds: BurnRateThresholds = defaultBurnRateThresholds,
): BurnRateEvaluation {
  if (!Number.isFinite(burnRate)) {
    return {
      severity: 'warning',
      triggered: true,
      message: 'Invalid burn rate input',
    };
  }

  if (burnRate >= thresholds.critical) {
    return {
      severity: 'critical',
      triggered: true,
      message: `Burn rate ${burnRate.toFixed(2)} exceeds critical threshold ${thresholds.critical.toFixed(2)}`,
    };
  }

  if (burnRate >= thresholds.warning) {
    return {
      severity: 'warning',
      triggered: true,
      message: `Burn rate ${burnRate.toFixed(2)} exceeds warning threshold ${thresholds.warning.toFixed(2)}`,
    };
  }

  return {
    severity: 'ok',
    triggered: false,
    message: `Burn rate ${burnRate.toFixed(2)} within normal range`,
  };
}

export interface TelemetryThresholds {
  poisonEventWarning: number;
  poisonEventCritical: number;
  anomalyScoreWarning: number;
  anomalyScoreCritical: number;
}

export interface TelemetryAnomalyInput {
  poisonEvents: number;
  anomalyScore: number;
}

export interface TelemetryAnomalyEvaluation {
  triggered: boolean;
  severity: AlarmSeverity;
  reason: string;
}

export const defaultTelemetryThresholds: TelemetryThresholds = {
  poisonEventWarning: 1,
  poisonEventCritical: 5,
  anomalyScoreWarning: 0.6,
  anomalyScoreCritical: 0.85,
};

export function detectTelemetryAnomaly(
  input: TelemetryAnomalyInput,
  thresholds: TelemetryThresholds = defaultTelemetryThresholds,
): TelemetryAnomalyEvaluation {
  const { poisonEvents, anomalyScore } = input;

  const poisonCritical = poisonEvents >= thresholds.poisonEventCritical;
  const poisonWarning = poisonEvents >= thresholds.poisonEventWarning;
  const scoreCritical = anomalyScore >= thresholds.anomalyScoreCritical;
  const scoreWarning = anomalyScore >= thresholds.anomalyScoreWarning;

  if (poisonCritical || scoreCritical) {
    return {
      triggered: true,
      severity: 'critical',
      reason: `Poison events=${poisonEvents}, anomaly=${anomalyScore.toFixed(2)} breached critical thresholds`,
    };
  }

  if (poisonWarning || scoreWarning) {
    return {
      triggered: true,
      severity: 'warning',
      reason: `Poison events=${poisonEvents}, anomaly=${anomalyScore.toFixed(2)} exceeded warning thresholds`,
    };
  }

  return {
    triggered: false,
    severity: 'ok',
    reason: 'Telemetry channels healthy',
  };
}

export interface AlarmDrillResult {
  burnRate: BurnRateEvaluation;
  telemetry: TelemetryAnomalyEvaluation;
}

export function runAlarmDrill(
  burnRateSample: number,
  telemetrySample: TelemetryAnomalyInput,
  burnRateThresholds: BurnRateThresholds = defaultBurnRateThresholds,
  telemetryThresholds: TelemetryThresholds = defaultTelemetryThresholds,
): AlarmDrillResult {
  return {
    burnRate: evaluateBurnRate(burnRateSample, burnRateThresholds),
    telemetry: detectTelemetryAnomaly(telemetrySample, telemetryThresholds),
  };
}
