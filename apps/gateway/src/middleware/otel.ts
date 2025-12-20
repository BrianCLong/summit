import { Request, Response, NextFunction } from "express";
import { context, propagation, trace, SpanKind } from "@opentelemetry/api";

const HEADER_RELEASE = "x-release-sha";
const HEADER_PR = "x-pr-number";
const HEADER_CANARY = "x-canary-weight";

export function otelMiddleware(req: Request, res: Response, next: NextFunction) {
  const tracer = trace.getTracer("gateway-middleware");
  const parentContext = propagation.extract(context.active(), req.headers);
  return context.with(parentContext, () => {
    const span = tracer.startSpan(`gateway:${req.method} ${req.path}`.trim(), {
      kind: SpanKind.SERVER,
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

    propagation.inject(context.active(), res as unknown as Record<string, string>);
    next();
  });
}
