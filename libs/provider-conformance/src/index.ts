import fs from 'node:fs/promises';
import path from 'node:path';
import { createAnthropicAdapter } from './adapters/anthropic.js';
import { createOpenAIAdapter } from './adapters/openai.js';
import { createAzureOpenAIAdapter } from './adapters/azure_openai.js';
import { createBedrockAdapter } from './adapters/bedrock.js';
import { createVertexAdapter } from './adapters/vertex.js';
import { defaultContracts } from './contracts/index.js';
import type {
  Capabilities,
  ConformanceReport,
  ContractContext,
  ContractResult,
  ProviderAdapter,
  ProviderConfig,
  ProviderId,
  ProviderReport,
} from './types.js';
import { hashPrompt, redactApiKey } from './utils.js';
import { writeJsonReport } from './reporters/json.js';
import { writeMarkdownReport } from './reporters/md.js';

const defaultCapabilities: Capabilities = {
  toolCalls: false,
  jsonMode: false,
  streaming: false,
};

const providerAdapters = (configs: ProviderConfig[]): Record<ProviderId, ProviderAdapter> => {
  const configMap = new Map(configs.map((config) => [config.id, config]));

  return {
    anthropic: createAnthropicAdapter(configMap.get('anthropic')?.apiKey),
    openai: createOpenAIAdapter(configMap.get('openai')?.apiKey),
    azure_openai: createAzureOpenAIAdapter(),
    bedrock: createBedrockAdapter(),
    vertex: createVertexAdapter(),
  };
};

const ensureDir = async (dir: string): Promise<void> => {
  await fs.mkdir(dir, { recursive: true });
};

const writeRawLog = async (
  rawLogDir: string,
  providerId: ProviderId,
  contractId: string,
  result: ContractResult,
  adapter: ProviderAdapter,
): Promise<void> => {
  const filePath = path.join(rawLogDir, `${providerId}.jsonl`);
  const entry = {
    provider: providerId,
    contract: contractId,
    timestamp: new Date().toISOString(),
    result: {
      passed: result.passed,
      details: result.details,
      capabilities: result.capabilities,
      metadata: result.metadata,
    },
    adapterDefaults: adapter.supports ?? {},
  };
  await fs.appendFile(filePath, `${JSON.stringify(entry)}\n`);
};

const runContracts = async (
  adapter: ProviderAdapter,
  context: ContractContext,
): Promise<ContractResult[]> => {
  const results: ContractResult[] = [];

  for (const contract of defaultContracts) {
    const result = await contract.run(adapter, context);
    results.push(result);
    await writeRawLog(context.rawLogDir, adapter.id, contract.id, result, adapter);
  }

  return results;
};

const mergeCapabilities = (
  base: Capabilities,
  adapter: ProviderAdapter,
  contracts: ContractResult[],
): Capabilities => {
  const merged: Capabilities = {
    ...base,
    ...adapter.supports,
  };

  for (const result of contracts) {
    if (result.capabilities) {
      Object.assign(merged, result.capabilities);
    }
  }

  return merged;
};

const providerConfigured = (providerId: ProviderId, config?: ProviderConfig): boolean => {
  if (!config) {
    return false;
  }

  switch (providerId) {
    case 'anthropic':
    case 'openai':
      return Boolean(config.apiKey);
    case 'azure_openai':
      return Boolean(config.apiKey && config.endpoint && config.deployment);
    case 'bedrock':
      return Boolean(config.apiKey && config.region);
    case 'vertex':
      return Boolean(config.apiKey && config.projectId);
    default:
      return false;
  }
};

export const runConformance = async (
  providers: ProviderId[],
  configs: ProviderConfig[],
  outputRoot: string,
): Promise<ConformanceReport> => {
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(outputRoot, runId);
  const rawLogDir = path.join(outputDir, 'raw');
  const context: ContractContext = {
    runId,
    outputDir,
    rawLogDir,
    promptHash: hashPrompt,
  };

  await ensureDir(outputDir);
  await ensureDir(rawLogDir);

  const adapters = providerAdapters(configs);
  const providerReports: ProviderReport[] = [];

  for (const providerId of providers) {
    const adapter = adapters[providerId];
    const config = configs.find((item) => item.id === providerId);

    if (!adapter) {
      providerReports.push({
        id: providerId,
        configured: false,
        skippedReason: 'No adapter available.',
        capabilities: { ...defaultCapabilities },
        contracts: [],
      });
      continue;
    }

    if (!providerConfigured(providerId, config)) {
      providerReports.push({
        id: providerId,
        configured: false,
        skippedReason: 'Missing provider configuration.',
        capabilities: { ...defaultCapabilities },
        contracts: [],
      });
      continue;
    }

    const results = await runContracts(adapter, context);
    const capabilities = mergeCapabilities(defaultCapabilities, adapter, results);

    providerReports.push({
      id: providerId,
      configured: true,
      capabilities,
      contracts: results,
    });
  }

  const report: ConformanceReport = {
    runId,
    timestamp: new Date().toISOString(),
    providers: providerReports,
  };

  await writeJsonReport(report, outputDir);
  await writeMarkdownReport(report, outputDir);

  return report;
};

export const loadProviderConfigs = (): ProviderConfig[] => {
  return [
    {
      id: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL,
      endpoint: process.env.ANTHROPIC_BASE_URL,
    },
    {
      id: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL,
      endpoint: process.env.OPENAI_BASE_URL,
    },
    {
      id: 'azure_openai',
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      endpoint: process.env.AZURE_OPENAI_ENDPOINT,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    },
    {
      id: 'bedrock',
      apiKey: process.env.AWS_ACCESS_KEY_ID,
      region: process.env.AWS_REGION,
    },
    {
      id: 'vertex',
      apiKey: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      projectId: process.env.GCP_PROJECT_ID,
    },
  ];
};

export const describeProviderConfigs = (
  configs: ProviderConfig[],
): Record<ProviderId, Record<string, string | undefined>> => {
  const mapped: Record<ProviderId, Record<string, string | undefined>> = {
    anthropic: {},
    openai: {},
    azure_openai: {},
    bedrock: {},
    vertex: {},
  };

  for (const config of configs) {
    mapped[config.id] = {
      apiKey: redactApiKey(config.apiKey),
      endpoint: config.endpoint,
      deployment: config.deployment,
      model: config.model,
      region: config.region,
      projectId: config.projectId,
    };
  }

  return mapped;
};

export * from './types.js';
export * from './errors.js';
