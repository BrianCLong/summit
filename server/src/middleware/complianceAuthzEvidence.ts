import type { NextFunction, Request, Response } from "express";
import { request as undiciRequest } from "undici";

type AuthzDecision = "allow" | "deny";

export type ComplianceAuthzOptions = {
  evaluatorUrl: string;
  controlId?: string;
  getActorId: (req: Request) => string | undefined;
  getResource: (req: Request) => { id: string; type?: string } | undefined;
  getDecision: (req: Request, res: Response) => AuthzDecision | undefined;
  shouldEmit?: (req: Request) => boolean;
};

export function complianceAuthzEvidence(opts: ComplianceAuthzOptions) {
  const control_id = opts.controlId ?? "sec-AUTHZ-001";

  return function middleware(req: Request, res: Response, next: NextFunction) {
    const shouldEmit = opts.shouldEmit?.(req) ?? true;
    if (!shouldEmit) return next();

    res.on("finish", async () => {
      try {
        const decision = opts.getDecision(req, res);
        const actorId = opts.getActorId(req);
        const resource = opts.getResource(req);

        if (!decision || !actorId || !resource?.id) return;

        const trace_id =
          (req.headers["x-trace-id"] as string | undefined) ??
          (req.headers["traceparent"] as string | undefined);

        const request_id =
          (req.headers["x-request-id"] as string | undefined) ?? undefined;

        const evidence = {
          spec: "summit.evidence.authz.v1",
          control_id,
          event_type: "authz.decision",
          occurred_at: new Date().toISOString(),
          trace_id,
          request_id,
          decision,
          actor: {
            id: actorId,
            ip: req.ip,
            user_agent: req.headers["user-agent"]
          },
          resource: {
            id: resource.id,
            type: resource.type ?? "http",
            path: req.path,
            method: req.method
          }
        };

        await undiciRequest(`${opts.evaluatorUrl}/v1/evidence`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(evidence)
        });
      } catch {
        return;
      }
    });

    return next();
  };
}
