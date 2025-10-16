import { trace, context } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
const p = new NodeTracerProvider();
p.addSpanProcessor(
  new SimpleSpanProcessor(
    new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }),
  ),
);
p.register();
const tr = trace.getTracer('ci');
(async () => {
  const s = tr.startSpan(process.env.CI_STAGE || 'build');
  await new Promise((r) => setTimeout(r, 10));
  s.end();
})();
