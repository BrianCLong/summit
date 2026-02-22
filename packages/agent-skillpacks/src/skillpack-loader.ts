import fs from 'node:fs/promises';
import path from 'node:path';
import { minimatch } from 'minimatch';
import {
  DistilledToolSchema,
  McpServerConfig,
  SkillpackManifest,
  SkillpackMcpConfig,
  SkillpackPolicy,
  ShardRoutingContext,
  ToolInjectionRecord,
  ToolLoadingReport,
  ToolSchema,
  TriggerContext,
} from './types.js';
import { distillToolSchema, estimateTokenFootprint } from './schema-distiller.js';
import { evaluateToolAccess, mergePolicies } from './policy-gate.js';
import { loadMcpConfig, loadPolicyConfig, loadSkillpackManifest } from './skillpack-discovery.js';
import { selectShard } from './shard-router.js';

const DEFAULT_CACHE_DIR = path.join('.summit', 'mcp-cache');

const sortStrings = (values: string[]): string[] => [...values].sort();

const mergeMcpConfigs = (
  localConfig: SkillpackMcpConfig | null,
  globalConfig?: SkillpackMcpConfig
): SkillpackMcpConfig | null => {
  if (!localConfig && !globalConfig) {
    return null;
  }
  if (!globalConfig) {
    return localConfig;
  }
  if (!localConfig) {
    return globalConfig;
  }
  return {
    servers: {
      ...localConfig.servers,
      ...globalConfig.servers,
    },
  };
};

const resolveToolPatterns = (
  availableTools: string[],
  patterns: string[]
): string[] => {
  const resolved = new Set<string>();
  patterns.forEach((pattern) => {
    if (pattern.includes('*')) {
      availableTools
        .filter((tool) => minimatch(tool, pattern, { matchBase: true }))
        .forEach((tool) => resolved.add(tool));
    } else {
      resolved.add(pattern);
    }
  });
  return sortStrings([...resolved]);
};

const readFullSchema = async (
  cacheDir: string,
  serverName: string,
  toolName: string
): Promise<ToolSchema | null> => {
  const schemaPath = path.join(cacheDir, serverName, `${toolName}.json`);
  try {
    const content = await fs.readFile(schemaPath, 'utf-8');
    return JSON.parse(content) as ToolSchema;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const mapToolPatterns = (
  serverConfig: McpServerConfig,
  shard: string
): string[] => {
  if (serverConfig.shards?.[shard]?.length) {
    return serverConfig.shards[shard];
  }
  if (serverConfig.shards?.default?.length) {
    return serverConfig.shards.default;
  }
  if (serverConfig.includeTools?.length) {
    return serverConfig.includeTools;
  }
  throw new Error(`Server config missing tool selection for shard: ${shard}`);
};

const gatherShardNames = (config: SkillpackMcpConfig): Record<string, string[]> => {
  const shardNames = new Set<string>();
  Object.values(config.servers).forEach((server) => {
    if (server.shards) {
      Object.keys(server.shards).forEach((name) => shardNames.add(name));
    } else {
      shardNames.add('default');
    }
  });
  return Object.fromEntries([...shardNames].map((name) => [name, [] as string[]]));
};

export const expandToolSchema = async (options: {
  cacheDir?: string;
  serverName: string;
  toolName: string;
}): Promise<ToolSchema> => {
  const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
  const schema = await readFullSchema(cacheDir, options.serverName, options.toolName);
  if (!schema) {
    throw new Error(`Full schema not found for ${options.serverName}:${options.toolName}`);
  }
  return schema;
};

export const injectSkillpackTools = async (options: {
  skillpackDir: string;
  shardContext: ShardRoutingContext;
  triggerContext?: TriggerContext;
  environment?: string;
  globalMcpConfig?: SkillpackMcpConfig;
  policy?: SkillpackPolicy;
  availableTools?: Record<string, string[]>;
  cacheDir?: string;
}): Promise<{
  manifest: SkillpackManifest;
  distilledTools: DistilledToolSchema[];
  report: ToolLoadingReport;
}> => {
  const manifest = await loadSkillpackManifest(options.skillpackDir);
  const localMcpConfig = await loadMcpConfig(options.skillpackDir);
  const mergedMcpConfig = mergeMcpConfigs(localMcpConfig, options.globalMcpConfig);
  if (!mergedMcpConfig) {
    throw new Error('Skillpack missing mcp.json and no global MCP config provided.');
  }

  const localPolicy = await loadPolicyConfig(options.skillpackDir);
  const effectivePolicy = mergePolicies(options.policy ?? { defaultBehavior: 'deny' }, localPolicy ?? undefined);

  const shardSelection = selectShard(gatherShardNames(mergedMcpConfig), options.shardContext);

  const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
  const environment = options.environment ?? 'dev';
  const toolsInjected: DistilledToolSchema[] = [];
  const injectionRecords: ToolInjectionRecord[] = [];

  const sortedServers = sortStrings(Object.keys(mergedMcpConfig.servers));
  for (const serverName of sortedServers) {
    const serverConfig = mergedMcpConfig.servers[serverName];
    const available = options.availableTools?.[serverName] ?? [];
    const patterns = mapToolPatterns(serverConfig, shardSelection.shard);
    if (patterns.length === 0) {
      throw new Error(`Tool selection empty for ${serverName}:${shardSelection.shard}`);
    }
    if (patterns.some((pattern) => pattern.includes('*')) && available.length === 0) {
      throw new Error(`Available tools missing for glob resolution on ${serverName}.`);
    }
    const selectedTools = resolveToolPatterns(available, patterns);

    for (const toolName of selectedTools) {
      const decision = evaluateToolAccess({
        toolName,
        policy: effectivePolicy,
        environment,
      });
      const fullSchema = await readFullSchema(cacheDir, serverName, toolName);
      const safetyNotes = [
        `Policy: ${decision.reason}`,
        `Environment: ${environment}`,
      ];
      const distilled = distillToolSchema(
        fullSchema ?? { name: toolName, description: 'Schema cached pending.' },
        safetyNotes,
        fullSchema ? 'cache' : 'placeholder'
      );

      const justification = {
        expectedUtility: `Requested by shard ${shardSelection.shard}.`,
        tokenCost: distilled.tokenEstimate,
        alternatives: ['Built-in toolset', 'Deferred schema expansion'],
        planStepRef: `skillpack:${manifest.name}:${shardSelection.shard}`,
      };

      injectionRecords.push({
        toolName,
        serverName,
        mode: decision.allowed ? 'distilled' : 'distilled',
        tokenEstimate: distilled.tokenEstimate,
        decision,
        justification,
      });

      if (decision.allowed) {
        toolsInjected.push(distilled);
      }
    }
  }

  const totalTokens = injectionRecords.reduce((sum, record) => sum + record.tokenEstimate, 0);
  const report: ToolLoadingReport = {
    skillpack: {
      name: manifest.name,
      path: options.skillpackDir,
    },
    shard: shardSelection,
    context: {
      ...options.shardContext,
      triggerContext: options.triggerContext,
    },
    tools: injectionRecords,
    totals: {
      toolsConsidered: injectionRecords.length,
      toolsInjected: toolsInjected.length,
      estimatedTokens: totalTokens,
    },
    policy: {
      environment,
      breakGlassUsed: injectionRecords.some((record) => Boolean(record.decision.waiverId)),
    },
    generatedAt: new Date().toISOString(),
  };

  return { manifest, distilledTools: toolsInjected, report };
};

export const cacheToolSchema = async (options: {
  cacheDir?: string;
  serverName: string;
  toolName: string;
  schema: ToolSchema;
}): Promise<void> => {
  const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR;
  const serverDir = path.join(cacheDir, options.serverName);
  await fs.mkdir(serverDir, { recursive: true });
  const schemaPath = path.join(serverDir, `${options.toolName}.json`);
  await fs.writeFile(schemaPath, JSON.stringify(options.schema, null, 2));
};

export const summarizeInjectedTools = (tools: DistilledToolSchema[]): string[] =>
  tools.map((tool) => `${tool.name} (${tool.tokenEstimate} tokens)`);

export const estimateDistilledTokens = (tools: DistilledToolSchema[]): number =>
  estimateTokenFootprint(tools.map((tool) => tool.tokenEstimate));
