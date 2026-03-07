export type MaestroEventType =
  | "intent.evaluate"
  | "claim.register"
  | "memory.update"
  | "identity.delegate"
  | "tool.invoke"
  | "incident.raise"
  | "promotion.request"
  | "override.request";
