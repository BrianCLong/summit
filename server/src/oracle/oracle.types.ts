// server/src/oracle/oracle.types.ts

/**
 * Defines the input parameters for a new forecasting simulation run.
 */
export interface SimulationParameters {
  // The central question or event to forecast.
  // e.g., "What is the probability of a naval blockade in the South China Sea?"
  narrativeQuery: string;

  // The time horizon for the forecast, in days from now.
  horizonDays: 30 | 90 | 180;

  // The minimum statistical significance (sigma level) of events to focus on.
  // A higher sigma means searching for rarer, more impactful events.
  eventSigmaThreshold: number; // e.g., 4.0 for a 4-sigma event

  // The number of parallel simulations to run. More simulations increase accuracy but also cost.
  simulationCount: number;
}

/**
 * Represents a single event or state within a simulated timeline.
 */
export interface TimelineFragment {
  fragmentId: string;
  simulationId: string;
  startDate: Date;
  endDate: Date;
  eventDescription: string;
  probability: number; // Probability of this fragment occurring within its simulation
}

/**
 * Represents a high-confidence, verified future event.
 * This is the final output of the Causal Time-Loop Engine.
 */
export interface PropheticTruth {
  truthId: string;
  simulationRunId: string;
  eventDescription: string;
  predictedDate: Date; // The predicted date of the event's occurrence
  confidence: number; // The final, cross-validated confidence score (e.g., 0.89)
  sigmaLevel: number; // The sigma level of the predicted event (e.g., 4.1)
  status: 'pending_validation' | 'validated' | 'falsified';
  groundTruthMatch?: boolean; // Set after the event's predicted date has passed
}

/**
 * Represents a full simulation run.
 */
export interface SimulationRun {
  runId: string;
  params: SimulationParameters;
  status: 'running' | 'back-propagating' | 'complete' | 'failed';
  startTime: Date;
  endTime?: Date;
  validatedTruths: PropheticTruth[];
}
