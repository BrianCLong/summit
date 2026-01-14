import fs from 'fs/promises';
import path from 'path';
import { minimatch } from 'minimatch';
import {
  type DistilledToolSchema,
  type McpConfig,
  type McpServerConfig,
  type PolicyConfig,
  type SkillpackDefinition,
  type TaskContext,
  type ToolInjectionResult,
  type ToolLoadingReport,
  type ToolSchema,
  type ToolSelectionInputs,
} from './types';
import { distillToolSchema, estimateTokensFromSchema } from './schema-distiller';
import { evaluatePolicy } from './policy-gate';
import { SchemaCache } from './schema-cache';
import { selectShard } from './shard-router';
import { writeEvidence } from './evidence-writer';

export interface LoaderOptions {
  skillpack: SkillpackDefinition;
  taskContext: TaskContext;
  selection: ToolSelectionInputs;
  skillpackMcpConfig?: McpConfig;
  globalMcpConfig?: McpConfig;
  policy?: PolicyConfig;
  schemaCacheDir: string;
  toolSchemasByName?: Map<string, ToolSchema>;
  injectDistilled: (tools: DistilledToolSchema[]) => Promise<void> | void;
  injectFull?: (tool: ToolSchema) => Promise<void> | void;
  evidenceDir: string;
}

export interface LoaderResult {
  report: ToolLoadingReport;
  evidencePaths: { jsonPath: string; markdownPath: string };
}

export async function invokeSkillpack(options: LoaderOptions): Promise<LoaderResult> {
  assertPlanSelection(options.selection);

  const mcpConfig = mergeMcpConfigs(
    options.skillpackMcpConfig,
    options.globalMcpConfig,
  );

  const shardSelection = selectShard(options.skillpack, options.taskContext);
  const toolNames = selectToolsForShard(mcpConfig, shardSelection.shard);
  if (toolNames.length === 0) {
    throw new Error('Skillpack requested without any tool selections.');
  }

  const schemaCache = new SchemaCache(options.schemaCacheDir);
  const toolResults: ToolInjectionResult[] = [];
  const distilledSchemas: DistilledToolSchema[] = [];
  const governedExceptions: string[] = [];

  for (const toolName of toolNames) {
    const decision = evaluatePolicy(
      toolName,
      options.policy,
      options.taskContext.governanceMode,
    );
    if (!decision.allowed) {
      toolResults.push({
        toolName,
        mode: 'denied',
        tokenEstimate: 0,
        policyReason: decision.reason,
      });
      continue;
    }

    if (decision.governedException) {
      governedExceptions.push(decision.governedException);
    }

    const toolSchema = await resolveToolSchema(toolName, options.toolSchemasByName, schemaCache);
    if (toolSchema) {
      await schemaCache.write(toolSchema);
    }
    const distilled = distillToolSchema(
      toolSchema ?? {
        name: toolName,
        description: 'Deferred pending schema source.',
      },
    );
    distilledSchemas.push(distilled);
    toolResults.push({
      toolName,
      mode: 'distilled',
      tokenEstimate: estimateTokensFromSchema(distilled),
      policyReason: decision.reason,
    });
  }

  await options.injectDistilled(distilledSchemas);

  const report = buildReport(
    options,
    shardSelection,
    toolResults,
    governedExceptions,
  );

  const evidencePaths = await writeEvidence(report, options.evidenceDir);

  return { report, evidencePaths };
}

export async function expandToolSchema(
  toolName: string,
  schemaCacheDir: string,
  policy: PolicyConfig | undefined,
  taskContext: TaskContext,
  injectFull: (tool: ToolSchema) => Promise<void> | void,
): Promise<ToolInjectionResult> {
  const decision = evaluatePolicy(toolName, policy, taskContext.governanceMode);
  if (!decision.allowed) {
    return {
      toolName,
      mode: 'denied',
      tokenEstimate: 0,
      policyReason: decision.reason,
    };
  }

  const cache = new SchemaCache(schemaCacheDir);
  const toolSchema = await cache.read(toolName);
  if (!toolSchema) {
    return {
      toolName,
      mode: 'denied',
      tokenEstimate: 0,
      policyReason: 'Full schema unavailable in cache. Deferred pending source.',
    };
  }

  await injectFull(toolSchema);
  return {
    toolName,
    mode: 'full',
    tokenEstimate: estimateTokensFromSchema(toolSchema),
    policyReason: decision.reason,
  };
}

function assertPlanSelection(selection: ToolSelectionInputs): void {
  if (!selection.planStepId || !selection.planStepSummary) {
    throw new Error('Plan step reference required before tool injection.');
  }
  if (!selection.expectedUtility) {
    throw new Error('Expected utility required for tool injection.');
  }
}

function mergeMcpConfigs(
  skillpackConfig?: McpConfig,
  globalConfig?: McpConfig,
): McpConfig {
  const servers = new Map<string, McpServerConfig>();
  for (const server of skillpackConfig?.servers ?? []) {
    servers.set(server.name, server);
  }
  for (const server of globalConfig?.servers ?? []) {
    servers.set(server.name, server);
  }
  return { servers: Array.from(servers.values()) };
}

function selectToolsForShard(mcpConfig: McpConfig, shard: string): string[] {
  const tools = new Set<string>();
  for (const server of mcpConfig.servers ?? []) {
    const shardConfig = server.shards?.[shard];
    const includeTools = shardConfig?.includeTools ?? server.includeTools ?? [];
    const toolGlobs = shardConfig?.toolGlobs ?? server.toolGlobs ?? [];

    if (includeTools.length === 0 && toolGlobs.length === 0) {
      continue;
    }

    includeTools.forEach((tool) => tools.add(tool));

    if (includeTools.length === 0 && toolGlobs.length > 0) {
      toolGlobs.forEach((tool) => tools.add(tool));
      continue;
    }

    toolGlobs.forEach((pattern) => {
      for (const tool of includeTools) {
        if (minimatch(tool, pattern)) {
          tools.add(tool);
        }
      }
    });
  }
  return Array.from(tools.values());
}

async function resolveToolSchema(
  toolName: string,
  toolSchemasByName: Map<string, ToolSchema> | undefined,
  cache: SchemaCache,
): Promise<ToolSchema | undefined> {
  if (toolSchemasByName?.has(toolName)) {
    return toolSchemasByName.get(toolName);
  }
  const cached = await cache.read(toolName);
  return cached;
}

function buildReport(
  options: LoaderOptions,
  shardSelection: { shard: string; reasoning: string[] },
  toolResults: ToolInjectionResult[],
  governedExceptions: string[],
): ToolLoadingReport {
  const toolsInjected = toolResults.filter((tool) => tool.mode !== 'denied');
  const tokensEstimated = toolsInjected.reduce(
    (total, tool) => total + tool.tokenEstimate,
    0,
  );
  return {
    generatedAt: new Date().toISOString(),
    skillpack: options.skillpack.name,
    shard: shardSelection.shard,
    planStepId: options.selection.planStepId,
    planStepSummary: options.selection.planStepSummary,
    expectedUtility: options.selection.expectedUtility,
    alternativesConsidered: options.selection.alternativesConsidered,
    taskContext: options.taskContext,
    shardReasoning: shardSelection.reasoning,
    tools: toolResults,
    totals: {
      toolsConsidered: toolResults.length,
      toolsInjected: toolsInjected.length,
      toolsDenied: toolResults.length - toolsInjected.length,
      tokensEstimated,
    },
    autoPruneSuggestions: buildAutoPruneSuggestions(toolResults),
    governedExceptions,
  };
}

function buildAutoPruneSuggestions(toolResults: ToolInjectionResult[]): string[] {
  const denied = toolResults.filter((tool) => tool.mode === 'denied');
  if (denied.length === 0) {
    return [];
  }
  return denied.map(
    (tool) =>
      `Remove ${tool.toolName} from shard unless a waiver is planned.`,
  );
}

export async function loadMcpConfig(configPath: string): Promise<McpConfig> {
  const contents = await fs.readFile(configPath, 'utf-8');
  const data = JSON.parse(contents) as McpConfig;
  return data;
}

export async function loadPolicyConfig(
  policyPath?: string,
): Promise<PolicyConfig | undefined> {
  if (!policyPath) {
    return undefined;
  }
  const contents = await fs.readFile(policyPath, 'utf-8');
  return JSON.parse(contents) as PolicyConfig;
}

export async function loadSkillpackMcpConfig(
  skillpack: SkillpackDefinition,
): Promise<McpConfig | undefined> {
  if (!skillpack.mcpConfigPath) {
    return undefined;
  }
  return loadMcpConfig(skillpack.mcpConfigPath);
}

export function resolveSkillpackRoot(rootDir?: string): string {
  return rootDir ?? path.join(process.cwd(), '.summit', 'skillpacks');
}
