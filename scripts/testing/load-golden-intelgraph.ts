import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  OrchestrationKnowledgeGraph,
  type CostSignalRecord,
  type EnvironmentRecord,
  type IncidentRecord,
  type PipelineRecord,
  type PolicyConnector,
  type ServiceRecord,
} from "../../ga-graphai/packages/knowledge-graph/src/index.js";
import type { PolicyRule } from "@ga-graphai/common-types";

interface GoldenGraphScenario {
  description: string;
  services: ServiceRecord[];
  environments: EnvironmentRecord[];
  pipelines: PipelineRecord[];
  incidents: IncidentRecord[];
  policies: PolicyRule[];
  costSignals: CostSignalRecord[];
  runs: Array<{
    id: string;
    serviceId: string;
    pipelineId: string;
    environmentId: string;
    status: string;
    startedAt: string;
    endedAt: string;
    tags?: string[];
  }>;
}

interface GoldenGraphDataset {
  metadata: Record<string, unknown>;
  tags: string[];
  tenants: Array<{ id: string; name: string; tier: string; tags?: string[] }>;
  users: Array<{ id: string; email: string; tenantId: string; roles: string[]; tags?: string[] }>;
  scenarios: Record<string, GoldenGraphScenario>;
}

interface LoadOptions {
  scenario?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(__dirname, "../../testdata/intelgraph/golden-graph.json");

let cachedDataset: GoldenGraphDataset | undefined;

function readDataset(): GoldenGraphDataset {
  if (!cachedDataset) {
    const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
    cachedDataset = JSON.parse(raw) as GoldenGraphDataset;
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

export function listGoldenGraphScenarios(): string[] {
  const dataset = readDataset();
  return Object.keys(dataset.scenarios);
}

export async function loadGoldenIntelGraph(
  options: LoadOptions = {}
): Promise<{ graph: OrchestrationKnowledgeGraph; scenario: GoldenGraphScenario }> {
  assertTestEnv();
  const dataset = readDataset();
  const key = options.scenario ?? "realistic-medium";
  const scenario = dataset.scenarios[key];
  if (!scenario) {
    throw new Error(`Unknown IntelGraph scenario: ${key}`);
  }

  const graph = new OrchestrationKnowledgeGraph();

  const pipelineConnector = {
    async loadPipelines(): Promise<PipelineRecord[]> {
      return scenario.pipelines.map((pipeline) => ({ ...pipeline }));
    },
  };
  const serviceConnector = {
    async loadServices(): Promise<ServiceRecord[]> {
      return scenario.services.map((service) => ({ ...service }));
    },
  };
  const environmentConnector = {
    async loadEnvironments(): Promise<EnvironmentRecord[]> {
      return scenario.environments.map((environment) => ({ ...environment }));
    },
  };
  const incidentConnector = {
    async loadIncidents(): Promise<IncidentRecord[]> {
      return scenario.incidents.map((incident) => ({ ...incident }));
    },
  };
  const policyConnector: PolicyConnector = {
    async loadPolicies(): Promise<PolicyRule[]> {
      return scenario.policies.map((policy) => ({ ...policy }));
    },
  };
  const costSignalConnector = {
    async loadCostSignals(): Promise<CostSignalRecord[]> {
      return scenario.costSignals.map((signal) => ({ ...signal }));
    },
  };

  graph.registerPipelineConnector(pipelineConnector);
  graph.registerServiceConnector(serviceConnector);
  graph.registerEnvironmentConnector(environmentConnector);
  graph.registerIncidentConnector(incidentConnector);
  graph.registerPolicyConnector(policyConnector);
  graph.registerCostSignalConnector(costSignalConnector);

  await graph.refresh();

  return { graph, scenario };
}

export type { GoldenGraphScenario, GoldenGraphDataset };
