import { ZodError } from 'zod';
import { RegistryRootSchema } from './schema.js';
import { RegistryRoot, ValidationResult, ValidationError } from './types.js';
import { RegistrySource, mergeRegistrySources } from './loader.js';

export function validateRegistrySources(sources: RegistrySource[]): ValidationResult {
  const errors: ValidationError[] = [];
  let totalTools = 0;
  let totalServers = 0;

  // 1. Individual source schema validation
  for (const source of sources) {
    try {
      RegistryRootSchema.parse(source.data);
    } catch (err) {
      if (err instanceof ZodError) {
        for (const issue of err.issues) {
          const path = issue.path.join('.');
          errors.push({
            file: source.file,
            path,
            message: issue.message,
            hint: getHint(path, issue.code),
          });
        }
      }
    }
  }

  // 2. Merged validation
  const { registry, conflicts, itemOrigins } = mergeRegistrySources(sources);
  totalTools = registry.tools.length;
  totalServers = registry.servers.length;

  // Check for duplicates
  for (const [key, files] of conflicts.entries()) {
    if (files.length > 1) {
      const [type, id] = key.split(':');
      errors.push({
        path: `${type}s`,
        message: `Duplicate ${type} ID: ${id}`,
        hint: `Found in multiple files: ${files.join(', ')}. IDs must be unique across the entire registry.`,
      });
    }
  }

  // 3. Consistency validation (references)
  const serverIds = new Set(registry.servers.map((s: any) => s.server_id));
  for (let i = 0; i < registry.tools.length; i++) {
    const tool = registry.tools[i];
    if (tool.server_id && !serverIds.has(tool.server_id)) {
      const origin = itemOrigins.get(`tool:${tool.tool_id}`);
      errors.push({
        file: origin,
        path: `tools[${i}].server_id`,
        message: `Referenced server_id not found: ${tool.server_id}`,
        hint: `Make sure a server with server_id "${tool.server_id}" is defined in the registry.`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    stats: {
      tools: totalTools,
      servers: totalServers,
    }
  };
}

function getHint(path: string, code: string): string | undefined {
  if (path.includes('tool_id')) return "Ensure each tool has a unique 'tool_id' string.";
  if (path.includes('server_id')) return "Ensure each server has a unique 'server_id' string.";
  if (path.includes('endpoint')) return "endpoint must be a full URL (e.g. http://localhost:8080).";
  if (path.includes('capability')) return "Capabilities should be an array of strings describing what the tool/server can do.";
  if (path.includes('version')) return "Registry version should follow semantic versioning (x.y.z).";
  return undefined;
}
