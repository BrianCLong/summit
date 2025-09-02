import React from 'react';
import ReactDOM from 'react-dom/client';
import MaestroApp from './App';
import '../index.css';

// OpenTelemetry Setup
import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

const provider = new WebTracerProvider();

// Configure the OTLP exporter to send traces to your gateway
const exporter = new OTLPTraceExporter({
  url: '/api/maestro/v1/telemetry/spans', // Gateway endpoint for OTLP traces
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));

provider.register();

registerInstrumentations({
  instrumentations: [
    new FetchInstrumentation({
      propagateTraceHeaderCorsUrls: /.*/, // Propagate trace headers to all URLs
      ignoreUrls: [/localhost:3000\/sockjs-node/], // Ignore webpack-dev-server HMR
    }),
  ],
});

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <MaestroApp />
  </React.StrictMode>,
);
