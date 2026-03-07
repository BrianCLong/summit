/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import {
  ConsoleSpanExporter,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-base'
import { Resource } from '@opentelemetry/resources'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import { ZoneContextManager } from '@opentelemetry/context-zone'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { W3CTraceContextPropagator, propagation } from '@opentelemetry/core'

type OtelClientConfig = {
  serviceName?: string
  environment?: string
  otlpEndpoint?: string
  featureFlagset?: string
}

export function initOtel(config: OtelClientConfig = {}) {
  const resource = new Resource({
    'service.name': config.serviceName || 'web-client',
    'deployment.environment':
      config.environment || process.env.NEXT_PUBLIC_ENV || 'local',
  })

  const provider = new WebTracerProvider({ resource })
  provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()))
  if (config.otlpEndpoint) {
    provider.addSpanProcessor(new BatchSpanProcessor(new ConsoleSpanExporter()))
  }

  provider.register({
    contextManager: new ZoneContextManager(),
    propagator: new W3CTraceContextPropagator(),
  })

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        propagateTraceHeaderCorsUrls: [/.*/],
        clearTimingResources: true,
        applyCustomAttributesOnSpan: (span, request) => {
          span.setAttribute(
            'journey.id',
            (request as Request).headers.get('x-journey-id') || ''
          )
          span.setAttribute(
            'journey.step',
            (request as Request).headers.get('x-journey-step') || ''
          )
          span.setAttribute('feature.flags', config.featureFlagset || '')
        },
      }),
    ],
  })

  propagation.setGlobalPropagator(new W3CTraceContextPropagator())
}
