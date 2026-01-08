import { z } from "zod";
import { canonicalModules, type CanonicalModule } from "./domain.js";

export type ApiStyle = "rest" | "grpc" | "graphql";

export const apiContractSchema = z.object({
  module: z.enum(canonicalModules),
  name: z.string().min(3),
  version: z.string().regex(/^v\d+$/),
  style: z.union([z.literal("rest"), z.literal("grpc"), z.literal("graphql")]),
  path: z.string().min(1),
  idempotent: z.boolean(),
  deprecated: z.boolean().optional(),
  owner: z.string().min(1),
  resources: z.array(z.string()).min(1),
  requestSchema: z.unknown().optional(),
  responseSchema: z.unknown().optional(),
  deprecationWindowDays: z.number().int().positive().default(90),
  sla: z.object({
    latencyMsP99: z.number().int().positive(),
    availabilityPercent: z.number().min(0).max(100),
    errorBudgetPercent: z.number().min(0).max(100),
  }),
});

export type ApiContract = z.infer<typeof apiContractSchema>;

export const cloudEventSchema = z.object({
  id: z.string(),
  source: z.string(),
  type: z.string(),
  specversion: z.literal("1.0"),
  datacontenttype: z.string().optional(),
  data: z.record(z.unknown()),
  time: z.string().optional(),
  subject: z.string().optional(),
  tracing: z.object({ traceId: z.string(), spanId: z.string() }).optional(),
  tenant_id: z.string(),
  resource_id: z.string(),
  provenance: z.object({ emitter: z.string(), version: z.string(), domain: z.string() }),
});

export type CloudEventContract = z.infer<typeof cloudEventSchema>;

export interface CompatibilityReport {
  compatible: boolean;
  reasons: string[];
}

export function validateApiContract(contract: unknown): ApiContract {
  return apiContractSchema.parse(contract);
}

export function validateEventContract(event: unknown): CloudEventContract {
  return cloudEventSchema.parse(event);
}

export function isApiContractCompatible(
  previous: ApiContract,
  next: ApiContract
): CompatibilityReport {
  const reasons: string[] = [];

  if (previous.name !== next.name || previous.module !== next.module) {
    reasons.push("module or name mismatch");
  }

  if (previous.style !== next.style) {
    reasons.push("API style cannot change between versions");
  }

  const prevResources = new Set(previous.resources);
  const missingResources = Array.from(prevResources).filter((res) => !next.resources.includes(res));
  if (missingResources.length) {
    reasons.push(`missing resources in next version: ${missingResources.join(", ")}`);
  }

  if (next.deprecationWindowDays < previous.deprecationWindowDays) {
    reasons.push("deprecation window shortened");
  }

  if (next.sla.latencyMsP99 > previous.sla.latencyMsP99) {
    reasons.push("latency regression");
  }

  if (next.sla.availabilityPercent < previous.sla.availabilityPercent) {
    reasons.push("availability regression");
  }

  if (next.sla.errorBudgetPercent > previous.sla.errorBudgetPercent) {
    reasons.push("error budget enlarged");
  }

  return { compatible: reasons.length === 0, reasons };
}

export function ensureIdempotentWrite(contract: ApiContract): void {
  if (!contract.idempotent) {
    throw new Error(`Contract ${contract.name} must be idempotent for writes.`);
  }
}

export interface EventCompatibilityResult {
  compatible: boolean;
  issues: string[];
}

export function compareCloudEvents(
  previous: CloudEventContract,
  next: CloudEventContract
): EventCompatibilityResult {
  const issues: string[] = [];
  const requiredKeys: (keyof CloudEventContract)[] = ["tenant_id", "resource_id", "provenance"];

  requiredKeys.forEach((key) => {
    if (!(key in next)) {
      issues.push(`missing required field: ${String(key)}`);
    }
  });

  const prevDataKeys = Object.keys(previous.data ?? {});
  const missingDataKeys = prevDataKeys.filter((key) => !(key in next.data));
  if (missingDataKeys.length) {
    issues.push(`missing data fields: ${missingDataKeys.join(", ")}`);
  }

  return { compatible: issues.length === 0, issues };
}

export interface ContractRegistryEntry {
  api: ApiContract;
  events: CloudEventContract[];
}

export class ContractRegistry {
  private readonly contracts = new Map<string, ContractRegistryEntry>();

  register(contract: ContractRegistryEntry): ContractRegistryEntry {
    const parsedApi = validateApiContract(contract.api);
    contract.events.forEach(validateEventContract);
    const key = `${parsedApi.module}:${parsedApi.name}:${parsedApi.version}`;
    if (this.contracts.has(key)) {
      throw new Error(`Contract already registered for ${key}`);
    }
    this.contracts.set(key, { api: parsedApi, events: contract.events });
    return contract;
  }

  get(module: CanonicalModule, name: string, version: string): ContractRegistryEntry | undefined {
    return this.contracts.get(`${module}:${name}:${version}`);
  }

  list(): ContractRegistryEntry[] {
    return Array.from(this.contracts.values());
  }
}

export function requireCanonicalModule(value: string): CanonicalModule {
  const module = canonicalModules.find((m) => m === value);
  if (!module) {
    throw new Error(`Unknown canonical module: ${value}`);
  }
  return module;
}
