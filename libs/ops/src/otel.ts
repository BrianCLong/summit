// Lightweight OTEL tracer setup (no exporter wired in CI)
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

export function startTracing() {
  /* hook real SDK in env-specific code */
}
