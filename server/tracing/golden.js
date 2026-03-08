"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.goldenSearch = goldenSearch;
const api_1 = require("@opentelemetry/api");
async function goldenSearch(req, res, next) {
    const tracer = api_1.trace.getTracer('web');
    const span = tracer.startSpan('golden.search', {
        kind: api_1.SpanKind.SERVER,
        attributes: {
            'app.tenant': req.headers['x-tenant-id'] || 'unknown',
            'app.user': req.user?.id || 'anon',
        },
    });
    return await api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), async () => {
        res.on('finish', () => span.end());
        next();
    });
}
