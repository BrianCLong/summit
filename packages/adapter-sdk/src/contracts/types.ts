// @ts-nocheck
import { z } from "zod";

export type AdapterCapability = "ingest" | "export" | "notary" | "identity" | "webhook";

export const AdapterLifecycle = {
  Install: "install",
  Enable: "enable",
  Configure: "configure",
  Run: "run",
  Disable: "disable",
  Uninstall: "uninstall",
} as const;

export type AdapterLifecycleStage = (typeof AdapterLifecycle)[keyof typeof AdapterLifecycle];

export interface AdapterContext {
  tenantId: string;
  adapterId: string;
  runId: string;
  correlationId?: string;
  requestedAt: Date;
  config: Record<string, unknown>;
  secrets?: Record<string, string>;
}

export interface AdapterRequest<TPayload = unknown> {
  payload: TPayload;
  context: AdapterContext;
  capabilities: AdapterCapability[];
}

export interface AdapterResponse<TResult = unknown> {
  result: TResult;
  durationMs: number;
  retries: number;
  receiptId?: string;
}

export interface AdapterHandler<TPayload = unknown, TResult = unknown> {
  (request: AdapterRequest<TPayload>): Promise<AdapterResponse<TResult>>;
}

export interface AdapterDefinition {
  name: string;
  version: string;
  capabilities: AdapterCapability[];
  requiredPermissions: string[];
  claims?: string[];
  lifecycle?: Partial<Record<AdapterLifecycleStage, AdapterHandler>>;
}

export const manifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().min(1),
  entrypoint: z.string().min(1),
  capabilities: z.array(z.string()).min(1),
  requiredPermissions: z.array(z.string()).min(1),
  claims: z.array(z.string()).optional(),
  compatibility: z.object({
    companyOs: z.string().min(1),
  }),
  configSchema: z.record(z.unknown()).optional(),
  signature: z.string().optional(),
});

export type AdapterManifest = z.infer<typeof manifestSchema>;
