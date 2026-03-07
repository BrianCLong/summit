import { Request, Response } from "express";
import { realtimeManager } from "../realtimeManager";

export const eventsSseHandler = async (req: Request, res: Response) => {
  const tenant = req.query.tenant as string;
  const types = req.query.types ? (req.query.types as string).split(",") : [];
  const entityIds = req.query.entityIds ? (req.query.entityIds as string).split(",") : [];

  // Basic AuthZ: In a real app, `req.user` would be populated by middleware.
  // We should check if `req.user.tenant` matches requested `tenant`.
  // For MVP/Skeleton, we assume the middleware stack handles auth before this handler
  // and we just check matching tenant if user is present.
  const user = (req as any).user;
  if (user && user.tenant && user.tenant !== tenant) {
    res.status(403).send("Forbidden: Tenant mismatch");
    return;
  }

  if (!tenant) {
    res.status(400).send("Tenant is required");
    return;
  }

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const onEvent = (event: any) => {
    // Filtering
    if (event.tenant !== tenant) return;
    if (types.length > 0 && !types.includes(event.type)) return;
    if (entityIds.length > 0 && !entityIds.includes(event.entity.id)) return;

    res.write(`id: ${event.event_id}\n`);
    res.write(`event: message\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  realtimeManager.on("event", onEvent);

  // Keep-alive
  const interval = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 15000);

  req.on("close", () => {
    clearInterval(interval);
    realtimeManager.off("event", onEvent);
  });
};
