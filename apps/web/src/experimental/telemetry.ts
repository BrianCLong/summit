export type ExperimentEvent = {
  experiment: string
  event:
    | 'activation'
    | 'error'
    | 'performance'
    | 'confusion'
    | 'dismissal'
  metadata?: Record<string, string | number | boolean>
  timestamp?: string
}

export function trackExperimentEvent(event: ExperimentEvent) {
  const payload = {
    ...event,
    timestamp: event.timestamp ?? new Date().toISOString(),
  }

  console.info('[experiment]', payload)
}

export function trackExperimentError(
  experiment: string,
  error: Error,
  metadata?: Record<string, string | number | boolean>
) {
  trackExperimentEvent({
    experiment,
    event: 'error',
    metadata: {
      message: error.message,
      stack: error.stack ?? 'no-stack',
      ...metadata,
    },
  })
}
