import { createRuntime, LiquidNanoRuntime } from '../runtime/core.js';
import type { NanoEvent, NanoPlugin, RuntimeContext } from '../runtime/types.js';

export interface EdgeIngestionOptions {
  readonly transform?: (event: NanoEvent) => NanoEvent;
  readonly onPersist?: (payload: Record<string, unknown>) => Promise<void> | void;
  readonly logger?: RuntimeContext['logger'];
}

export interface EdgeIngestionApp {
  readonly runtime: LiquidNanoRuntime;
  ingest(event: NanoEvent): Promise<void>;
}

class PersistencePlugin implements NanoPlugin {
  readonly name = 'persistence';
  readonly version = '0.1.0';

  constructor(private readonly onPersist: EdgeIngestionOptions['onPersist']) {}

  supportsEvent(event: NanoEvent): boolean {
    return event.type === 'sensor.ingested';
  }

  async onEvent(event: NanoEvent, context: RuntimeContext): Promise<void> {
    context.logger.info('persisting sensor payload', {
      correlationId: event.metadata?.correlationId
    });
    await this.onPersist?.(event.payload as Record<string, unknown>);
  }
}

class TelemetryPlugin implements NanoPlugin {
  readonly name = 'telemetry';
  readonly version = '0.1.0';

  supportsEvent(event: NanoEvent): boolean {
    return event.type.startsWith('sensor.');
  }

  onEvent(event: NanoEvent, context: RuntimeContext): void {
    const payloadSize = JSON.stringify(event.payload).length;
    context.metrics.recordGauge('payload.size.bytes', payloadSize);
    context.metrics.recordCounter('payload.events');
    if (payloadSize > 2048) {
      context.logger.warn('payload exceeds expected size', {
        payloadSize,
        correlationId: event.metadata?.correlationId
      });
    }
  }
}

export function createEdgeIngestionApp(options: EdgeIngestionOptions = {}): EdgeIngestionApp {
  const runtime = options.logger ? createRuntime({ logger: options.logger }) : createRuntime();
  const transform = options.transform ?? ((event: NanoEvent) => event);
  runtime.registerPlugin(new TelemetryPlugin());
  runtime.registerPlugin(new PersistencePlugin(options.onPersist));
  return {
    runtime,
    async ingest(event: NanoEvent) {
      const transformed = transform(event);
      if (transformed !== event) {
        runtime.context.logger.info('event transformed', {
          fromType: event.type,
          toType: transformed.type
        });
      }
      runtime.context.metrics.recordCounter('transform.executed');
      await runtime.emit(transformed);
    }
  };
}
