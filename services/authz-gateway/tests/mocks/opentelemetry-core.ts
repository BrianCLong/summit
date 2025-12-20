import type { Context, TextMapGetter, TextMapSetter } from '@opentelemetry/api';

class BasePropagator {
  inject(context: Context, carrier: unknown, setter: TextMapSetter) {
    void context;
    void carrier;
    void setter;
  }
  extract(context: Context, carrier: unknown, getter: TextMapGetter): Context {
    void carrier;
    void getter;
    return context;
  }
  fields(): string[] {
    return [];
  }
}

export class W3CTraceContextPropagator extends BasePropagator {}
export class W3CBaggagePropagator extends BasePropagator {}

export class CompositePropagator {
  constructor(private readonly options: { propagators: BasePropagator[] }) {}

  inject(context: Context, carrier: unknown, setter: TextMapSetter) {
    this.options.propagators.forEach((propagator) => {
      propagator.inject(context, carrier, setter);
    });
  }

  extract(context: Context, carrier: unknown, getter: TextMapGetter): Context {
    return this.options.propagators.reduce((ctx, propagator) => {
      return propagator.extract(ctx, carrier, getter);
    }, context);
  }

  fields(): string[] {
    return this.options.propagators.flatMap((propagator) =>
      propagator.fields(),
    );
  }
}
