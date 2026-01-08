import { recordAudit } from './audit'
import { getTelemetryContext } from './metrics'

type ExportEvent = 'export_started' | 'export_completed' | 'export_failed'

export async function recordTelemetryEvent(
  event: ExportEvent,
  jobId: string,
  startedAt?: string
) {
  const context = getTelemetryContext()
  const durationMs = startedAt
    ? Date.now() - new Date(startedAt).getTime()
    : undefined
  const payload = {
    event,
    labels: { jobId },
    payload: durationMs ? { durationMs } : undefined,
    context,
  }

  try {
    recordAudit(event, { jobId, durationMs })
    await fetch('/api/monitoring/telemetry/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': context.sessionId,
      },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.warn('Failed to record telemetry', err)
  }
}
