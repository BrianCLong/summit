import express from "express";
import { EventEmitter } from "events";

export type OpsEvent =
  | { type: "route.plan"; detail: any }
  | { type: "route.execute"; detail: any }
  | { type: "budget.update"; model: string; fraction: number }
  | { type: "policy.update"; policy_hash: string; at: number }
  | { type: "rag.index.freshness"; corpus: string; staleness_s: number }
  | { type: "rate.limit"; route: string; ip: string }
  | { type: "error"; route: string; code: number; msg?: string };

export const opsBus = new EventEmitter();
export const eventsRouter = express.Router();

eventsRouter.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const onEvt = (evt: OpsEvent) => {
    res.write(`event:${evt.type}\n`);
    res.write(`data:${JSON.stringify(evt)}\n\n`);
  };
  opsBus.on("event", onEvt);
  const emit = (e: OpsEvent) => opsBus.emit("event", e);

  // Send a hello
  emit({ type: "policy.update", policy_hash: "init", at: Date.now() });

  req.on("close", () => {
    opsBus.off("event", onEvt);
    res.end();
  });
});

export function emit(evt: OpsEvent) {
  opsBus.emit("event", evt);
}
