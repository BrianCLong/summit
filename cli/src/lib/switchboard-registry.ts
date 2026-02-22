/**
 * Switchboard Registry Loader + Validator
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';

const ToolSchema = z.object({
  id: z.string().min(1),
  capability: z.string().min(1),
  description: z.string().optional(),
});

const ServerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tools: z.array(ToolSchema),
});

const RegistrySchema = z.object({
  version: z.string().min(1),
  servers: z.array(ServerSchema),
});

export type SwitchboardRegistry = z.infer<typeof RegistrySchema>;
export type SwitchboardRegistryServer = z.infer<typeof ServerSchema>;
export type SwitchboardRegistryTool = z.infer<typeof ToolSchema>;

export interface SwitchboardRegistryStats {
  servers: number;
  tools: number;
  capabilities: number;
}

export interface SwitchboardRegistryToolRef {
  server: SwitchboardRegistryServer;
  tool: SwitchboardRegistryTool;
}

function parseRegistryJson(contents: string, registryPath: string): SwitchboardRegistry {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new Error(
      `Registry JSON parse failed for ${registryPath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  const result = RegistrySchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Registry validation failed for ${registryPath}:\n${issues.join('\n')}`);
  }

  return result.data;
}

export function loadSwitchboardRegistry(registryPath: string): SwitchboardRegistry {
  const absolutePath = path.resolve(registryPath);
  const contents = fs.readFileSync(absolutePath, 'utf8');
  return parseRegistryJson(contents, absolutePath);
}

export function getSwitchboardRegistryStats(registry: SwitchboardRegistry): SwitchboardRegistryStats {
  const toolCount = registry.servers.reduce((count, server) => count + server.tools.length, 0);
  const capabilities = new Set<string>();
  for (const server of registry.servers) {
    for (const tool of server.tools) {
      capabilities.add(tool.capability);
    }
  }

  return {
    servers: registry.servers.length,
    tools: toolCount,
    capabilities: capabilities.size,
  };
}

export function findSwitchboardTool(
  registry: SwitchboardRegistry,
  toolId: string
): SwitchboardRegistryToolRef | null {
  for (const server of registry.servers) {
    const tool = server.tools.find((candidate) => candidate.id === toolId);
    if (tool) {
      return { server, tool };
    }
  }
  return null;
}
