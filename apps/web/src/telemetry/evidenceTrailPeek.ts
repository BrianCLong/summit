import { getTelemetryContext } from './metrics';

type EvidenceTrailPeekEvent =
  | 'evidence_trail_peek_opened'
  | 'time_to_first_confident_verdict_ms'
  | 'answer_surface_claim_count'
  | 'verification_error_rate'
  | 'badge_click_through'
  | 'artifact_click_through';

export const recordEvidenceTrailPeekEvent = async (
  event: EvidenceTrailPeekEvent,
  payload: Record<string, unknown>,
) => {
  try {
    const context = getTelemetryContext();
    await fetch('/api/monitoring/telemetry/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': context.sessionId,
      },
      body: JSON.stringify({
        event,
        labels: {
          feature: 'evidence-trail-peek',
        },
        payload,
        context: {
          sessionId: context.sessionId,
          deviceId: context.deviceId,
        },
      }),
    });
  } catch (error) {
    console.warn('Evidence trail telemetry dropped', error);
  }
};
