"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositePropagator = exports.W3CBaggagePropagator = exports.W3CTraceContextPropagator = void 0;
class BasePropagator {
    inject(context, carrier, setter) {
        void context;
        void carrier;
        void setter;
    }
    extract(context, carrier, getter) {
        void carrier;
        void getter;
        return context;
    }
    fields() {
        return [];
    }
}
class W3CTraceContextPropagator extends BasePropagator {
}
exports.W3CTraceContextPropagator = W3CTraceContextPropagator;
class W3CBaggagePropagator extends BasePropagator {
}
exports.W3CBaggagePropagator = W3CBaggagePropagator;
class CompositePropagator {
    options;
    constructor(options) {
        this.options = options;
    }
    inject(context, carrier, setter) {
        this.options.propagators.forEach((propagator) => {
            propagator.inject(context, carrier, setter);
        });
    }
    extract(context, carrier, getter) {
        return this.options.propagators.reduce((ctx, propagator) => {
            return propagator.extract(ctx, carrier, getter);
        }, context);
    }
    fields() {
        return this.options.propagators.flatMap((propagator) => propagator.fields());
    }
}
exports.CompositePropagator = CompositePropagator;
