"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otelMiddleware = otelMiddleware;
const api_1 = require("@opentelemetry/api");
const HEADER_RELEASE = "x-release-sha";
const HEADER_PR = "x-pr-number";
const HEADER_CANARY = "x-canary-weight";
function otelMiddleware(req, res, next) {
    const tracer = api_1.trace.getTracer("gateway-middleware");
    const parentContext = api_1.propagation.extract(api_1.context.active(), req.headers);
    return api_1.context.with(parentContext, () => {
        const span = tracer.startSpan(`gateway:${req.method} ${req.path}`.trim(), {
            kind: api_1.SpanKind.SERVER,
            attributes: {
                "service.name": process.env.SERVICE_NAME || "gateway",
                "route.name": req.route?.path || req.path,
                "journey.id": req.headers["x-journey-id"] || "",
                "journey.step": req.headers["x-journey-step"] || "",
                "tenant.id": req.headers["x-tenant"] || "",
                "canary.weight": Number(req.headers[HEADER_CANARY] || process.env.CANARY_WEIGHT || 0),
                "feature.flags": req.headers["x-feature-flags"] || process.env.FEATURE_FLAGS || "",
                "release.sha": req.headers[HEADER_RELEASE] || process.env.GIT_SHA || "",
                pr_number: req.headers[HEADER_PR] || process.env.PR_NUMBER || "",
            },
        });
        res.on("finish", () => {
            span.setAttribute("http.status_code", res.statusCode);
            span.end();
        });
        api_1.propagation.inject(api_1.context.active(), res);
        next();
    });
}
