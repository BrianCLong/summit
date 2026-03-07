// TODO: Full implementation after verification.

export interface WidgetTelemetryEvent {
  evidenceId: string;
  surfaceSlug: string;
  widgetId: string;
  eventType: 'viewed' | 'interacted' | 'zero_result_filter' | 'error' | 'abandonment';
  metadata: Record<string, any>;
  // Omit timestamp for deterministic test generation or handle specifically in ingestion
}

export function logWidgetEvent(event: WidgetTelemetryEvent): void {
  // TODO: send to sink.
  console.log('Telemetry Event:', JSON.stringify(event));
}
