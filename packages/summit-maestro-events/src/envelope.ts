import { MaestroEventType } from "./eventTypes";

export interface MaestroActor {
  kind: "agent" | "human" | "system";
  id: string;
  role?: string;
}

export interface RiskContext {
  teleology_id?: string;
  axiology_ids?: string[];
  sensitivity?: "low" | "medium" | "high";
}

export interface MaestroEvent<TPayload = unknown> {
  event_id: string;
  event_type: MaestroEventType;
  timestamp: string;
  tenant_id: string;
  actor: MaestroActor;
  correlation_id?: string;
  risk_context?: RiskContext;
  payload: TPayload;
}
