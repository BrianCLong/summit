import { recordAudit } from './audit';

export type GoldenPathStep =
  | 'investigation_created'
  | 'entities_viewed'
  | 'relationships_explored'
  | 'copilot_query'
  | 'results_viewed';

/**
 * Tracks a step in the Golden Path user journey.
 * Sends a telemetry event to the backend.
 */
export const trackGoldenPathStep = async (
  step: GoldenPathStep,
  status: 'success' | 'failure' = 'success'
) => {
  try {
    // Log locally for debug/audit
    recordAudit('golden_path_step', { step, status });

    // Send to backend telemetry endpoint
    await fetch('/api/monitoring/telemetry/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'golden_path_step',
        labels: { step, status },
      }),
    });
  } catch (error) {
    console.error('Failed to track golden path step:', error);
  }
};
