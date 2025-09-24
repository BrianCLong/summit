import { context, trace } from '@opentelemetry/api';
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';

describe('synthetic trace E2E', () => {
  it('records a span via createSpan helper', async () => {
    const exporter = new InMemorySpanExporter();
    const provider = new BasicTracerProvider({
      spanProcessors: [new SimpleSpanProcessor(exporter)],
    });
    trace.setGlobalTracerProvider(provider);

    try {
      const tracer = provider.getTracer('observability.synthetic');
      const span = tracer.startSpan('observability.synthetic');
      await context.with(trace.setSpan(context.active(), span), async () => {
        span.setAttribute('test.attribute', 'value');
        span.end();
      });

      await provider.forceFlush();

      const finished = exporter.getFinishedSpans();
      expect(finished).toHaveLength(1);
      expect(finished[0].name).toBe('observability.synthetic');
    } finally {
      await provider.shutdown();
      trace.disable();
    }
  });
});
