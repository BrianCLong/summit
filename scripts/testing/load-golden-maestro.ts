import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MaestroConductor } from "../../ga-graphai/packages/maestro-conductor/src/maestro-conductor.js";
import type {
  AssetDescriptor,
  DiscoveryProvider,
  HealthSignal,
  JobSpec,
  PolicyHook,
  ResponseStrategy,
  SelfHealingAction,
  SelfHealingContext,
} from "../../ga-graphai/packages/maestro-conductor/src/types.js";

interface PolicyRuleDefinition {
  id: string;
  description?: string;
  rules: Array<{
    type: "require-tag";
    metadataKey: string;
    requiredTag: string;
  }>;
}

interface ResponseActionDefinition {
  type: string;
  impact: "low" | "medium" | "high";
  payload?: Record<string, unknown>;
  runbook?: string;
}

interface ResponseStrategyDefinition {
  id: string;
  description: string;
  supports: { metadataKey?: string };
  cooldownMs?: number;
  actions: ResponseActionDefinition[];
}

interface GoldenRun {
  id: string;
  assetId: string;
  type: string;
  priority: JobSpec["priority"];
  requiredCapabilities: string[];
  requirements?: JobSpec["requirements"];
  metadata?: Record<string, unknown>;
  result: string;
  startedAt: string;
  endedAt: string;
}

interface GoldenMaestroScenario {
  description: string;
  assets: AssetDescriptor[];
  policyHooks: PolicyRuleDefinition[];
  responseStrategies: ResponseStrategyDefinition[];
  healthSignals: Array<Omit<HealthSignal, "timestamp"> & { timestamp: string }>;
  runs: GoldenRun[];
}

interface GoldenMaestroDataset {
  metadata: Record<string, unknown>;
  tenants: Array<{ id: string; name: string }>;
  users: Array<{ id: string; email: string; tenantId: string; roles: string[] }>;
  scenarios: Record<string, GoldenMaestroScenario>;
}

interface LoadOptions {
  scenario?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(__dirname, "../../testdata/maestro/golden-runs.json");

let cachedDataset: GoldenMaestroDataset | undefined;

function readDataset(): GoldenMaestroDataset {
  if (!cachedDataset) {
    const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
    cachedDataset = JSON.parse(raw) as GoldenMaestroDataset;
  }
  return cachedDataset;
}

function assertTestEnv(): void {
  const env = process.env.NODE_ENV ?? "";
  const allow = process.env.ALLOW_GOLDEN_FIXTURES === "true";
  if (env.toLowerCase() === "production" && !allow) {
    throw new Error("Golden fixtures must not be loaded in production");
  }
}

function buildPolicyHook(definition: PolicyRuleDefinition): PolicyHook {
  return {
    id: definition.id,
    description: definition.description,
    evaluate: ({ asset, job }) => {
      for (const rule of definition.rules) {
        if (rule.type === "require-tag") {
          const isSensitive = Boolean(job?.metadata?.[rule.metadataKey]);
          if (isSensitive) {
            const compliance = asset.labels?.compliance ?? "";
            if (!compliance.includes(rule.requiredTag)) {
              return { allowed: false, reason: `${rule.requiredTag} required` };
            }
          }
        }
      }
      return { allowed: true, reason: "policy:approved" };
    },
  };
}

function buildResponseStrategy(
  definition: ResponseStrategyDefinition,
  executionLog: string[]
): ResponseStrategy {
  return {
    id: definition.id,
    description: definition.description,
    supports: (asset: AssetDescriptor) => {
      const metadataKey = definition.supports.metadataKey;
      return metadataKey ? Boolean(asset.metadata?.[metadataKey]) : true;
    },
    shouldTrigger: (context: SelfHealingContext) => context.anomaly.severity !== "low",
    async execute(context: SelfHealingContext) {
      const metadataKey = definition.supports.metadataKey;
      const target = metadataKey
        ? (context.asset.metadata?.[metadataKey] as string | undefined)
        : undefined;
      const actions: SelfHealingAction[] = definition.actions.map((action) => ({
        type: action.type,
        targetAssetId: target,
        payload: action.payload,
        estimatedImpact: action.impact,
        runbook: action.runbook,
      }));
      executionLog.push(`${context.asset.id}->${target ?? "none"}:${definition.id}`);
      return {
        strategyId: definition.id,
        executed: true,
        actions,
        notes: definition.description,
      };
    },
    cooldownMs: definition.cooldownMs,
  };
}

function toJobSpec(run: GoldenRun): JobSpec {
  return {
    id: run.id,
    type: run.type,
    priority: run.priority,
    requiredCapabilities: run.requiredCapabilities,
    requirements: run.requirements,
    metadata: run.metadata,
  };
}

export function listGoldenMaestroScenarios(): string[] {
  return Object.keys(readDataset().scenarios);
}

export async function loadGoldenMaestro(
  options: LoadOptions = {}
): Promise<{
  conductor: MaestroConductor;
  scenario: GoldenMaestroScenario;
  executionLog: string[];
  jobs: JobSpec[];
}> {
  assertTestEnv();
  const dataset = readDataset();
  const key = options.scenario ?? "control-loop";
  const scenario = dataset.scenarios[key];
  if (!scenario) {
    throw new Error(`Unknown Maestro scenario: ${key}`);
  }

  const conductor = new MaestroConductor({
    anomaly: { windowSize: 6, minSamples: 4, zThreshold: 1.2 },
    selfHealing: { defaultCooldownMs: 1 },
    optimizer: {
      windowSize: 12,
      latencyThresholdMs: 200,
      errorRateThreshold: 0.08,
      saturationThreshold: 0.7,
    },
    jobRouter: { latencyWeight: 0.4 },
  });

  const executionLog: string[] = [];

  const provider: DiscoveryProvider = {
    id: `${key}-fixture-provider`,
    description: scenario.description,
    async scan(): Promise<AssetDescriptor[]> {
      return scenario.assets.map((asset) => ({
        ...asset,
        lastSeen: new Date(scenario.healthSignals[0]?.timestamp ?? Date.now()),
      }));
    },
  };

  conductor.registerDiscoveryProvider(provider);
  scenario.policyHooks.forEach((definition) =>
    conductor.registerPolicyHook(buildPolicyHook(definition))
  );
  scenario.responseStrategies.forEach((definition) =>
    conductor.registerResponseStrategy(buildResponseStrategy(definition, executionLog))
  );

  await conductor.scanAssets();

  for (const signal of scenario.healthSignals) {
    await conductor.ingestHealthSignal({ ...signal, timestamp: new Date(signal.timestamp) });
  }

  const jobs = scenario.runs.map(toJobSpec);

  return { conductor, scenario, executionLog, jobs };
}

export type { GoldenMaestroDataset, GoldenMaestroScenario };
