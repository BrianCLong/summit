import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { RegistryRoot, ToolEntry, ServerEntry } from './types.js';

export interface RegistrySource {
  file: string;
  data: any;
}

export async function loadRegistrySources(inputPath: string): Promise<RegistrySource[]> {
  const stats = await stat(inputPath);
  let files: string[] = [];

  if (stats.isDirectory()) {
    const entries = await readdir(inputPath);
    files = entries
      .filter(e => e.endsWith('.json') || e.endsWith('.yaml') || e.endsWith('.yml'))
      .sort()
      .map(e => path.join(inputPath, e));
  } else {
    files = [inputPath];
  }

  const sources: RegistrySource[] = [];
  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const data = file.endsWith('.json') ? JSON.parse(content) : parse(content);
    sources.push({ file, data });
  }

  return sources;
}

export function mergeRegistrySources(sources: RegistrySource[]): {
  registry: RegistryRoot;
  conflicts: Map<string, string[]>;
  itemOrigins: Map<string, string>;
} {
  const merged: RegistryRoot = {
    version: '0.0.0',
    tools: [],
    servers: [],
  };

  const conflicts = new Map<string, string[]>();
  const itemOrigins = new Map<string, string>();

  for (const source of sources) {
    const { file, data } = source;

    if (data.version && merged.version === '0.0.0') {
      merged.version = data.version;
    }

    if (Array.isArray(data.tools)) {
      for (const tool of data.tools) {
        const id = tool.tool_id;
        if (id) {
          const key = `tool:${id}`;
          if (!conflicts.has(key)) conflicts.set(key, []);
          conflicts.get(key)!.push(file);

          if (!itemOrigins.has(key)) {
            itemOrigins.set(key, file);
            merged.tools.push(tool);
          }
        }
      }
    }

    if (Array.isArray(data.servers)) {
      for (const server of data.servers) {
        const id = server.server_id;
        if (id) {
          const key = `server:${id}`;
          if (!conflicts.has(key)) conflicts.set(key, []);
          conflicts.get(key)!.push(file);

          if (!itemOrigins.has(key)) {
            itemOrigins.set(key, file);
            merged.servers.push(server);
          }
        }
      }
    }
  }

  return { registry: merged, conflicts, itemOrigins };
}
