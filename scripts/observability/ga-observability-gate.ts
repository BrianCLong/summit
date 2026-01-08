// @ts-nocheck
import fs from "node:fs";
import path from "node:path";

export type SloMetrics = {
  availability?: string;
  latency?: string;
  errors?: string;
  throughput?: string;
};

export type SloObjectives = {
  availability: number;
  latency_p95_ms: number;
  error_rate_percent: number;
};

export type SloService = {
  name: string;
  tier: "critical" | "standard";
  owner?: string;
  metrics: SloMetrics;
  objectives: SloObjectives;
  dashboards?: string[];
};

export type ErrorBudgetPolicy = {
  window_days: number;
  fast_burn_rate: number;
  slow_burn_rate: number;
  actions: string[];
};

export type SloConfig = {
  version: number;
  services: SloService[];
  error_budget_policy: ErrorBudgetPolicy;
};

export const REQUIRED_SERVICES = [
  "api-gateway",
  "intelgraph-api",
  "llm-orchestrator",
  "ingestion-pipeline",
] as const;

export type ObservabilityValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  missingServices: string[];
};

const REQUIRED_METRIC_KEYS: (keyof SloMetrics)[] = ["availability", "latency", "errors"];

export function loadSloConfig(configPath?: string): SloConfig {
  const resolvedPath = configPath || path.resolve(process.cwd(), "config", "slo.yaml");

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Missing SLO config at ${resolvedPath}`);
  }

  const raw = fs.readFileSync(resolvedPath, "utf8");
  let parsed: SloConfig;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Unable to parse SLO config as JSON/YAML-safe content: ${(error as Error).message}`
    );
  }

  if (!parsed.services?.length) {
    throw new Error("SLO config must include at least one service entry");
  }

  if (!parsed.error_budget_policy) {
    throw new Error("SLO config missing error_budget_policy definition");
  }

  return parsed;
}

export function validateSloCoverage(
  config: SloConfig,
  observedServices: string[] = [...REQUIRED_SERVICES]
): ObservabilityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const serviceMap = new Map(config.services.map((svc) => [svc.name, svc]));

  const missingServices = observedServices.filter((svc) => !serviceMap.has(svc));
  if (missingServices.length) {
    errors.push(`Missing SLO definitions for services: ${missingServices.join(", ")}`);
  }

  for (const service of config.services) {
    const missingMetrics = REQUIRED_METRIC_KEYS.filter((key) => !service.metrics?.[key]);
    if (missingMetrics.length) {
      errors.push(`${service.name}: missing required metrics (${missingMetrics.join(", ")})`);
    }

    if (service.tier === "critical" && !service.objectives?.availability) {
      errors.push(`${service.name}: critical service missing availability SLO`);
    }

    if (!service.objectives?.latency_p95_ms) {
      errors.push(`${service.name}: missing latency_p95_ms objective`);
    }

    if (service.objectives?.error_rate_percent === undefined) {
      errors.push(`${service.name}: missing error_rate_percent objective`);
    }
  }

  if (!config.error_budget_policy?.actions?.length) {
    warnings.push("error_budget_policy.actions is empty");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    missingServices,
  };
}

export function evaluateObservabilityGate(
  configPath?: string,
  observedServices: string[] = [...REQUIRED_SERVICES]
): ObservabilityValidationResult {
  const config = loadSloConfig(configPath);
  return validateSloCoverage(config, observedServices);
}
