/**
 * Switchboard Registry Discovery and Validation
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import yaml from 'yaml';

export const RegistryEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string().default('1.0.0'),
  type: z.enum(['tool', 'server', 'agent']),
  description: z.string().optional(),
  capabilities: z.array(z.string()).default([]),
  hints: z.object({
    cost: z.string().optional(),
    latency: z.string().optional(),
  }).optional(),
  config: z.record(z.string(), z.unknown()).default({}),
});

export type RegistryEntry = z.infer<typeof RegistryEntrySchema>;

export class SwitchboardRegistry {
  private entries: Map<string, RegistryEntry> = new Map();

  /**
   * Load entries from a file or directory.
   */
  async load(targetPath: string): Promise<{ loaded: number; errors: string[] }> {
    const errors: string[] = [];
    let loadedCount = 0;

    const absolutePath = path.resolve(targetPath);
    if (!fs.existsSync(absolutePath)) {
      errors.push(`Path does not exist: ${targetPath}`);
      return { loaded: 0, errors };
    }

    const stats = fs.statSync(absolutePath);
    if (stats.isDirectory()) {
      const files = fs.readdirSync(absolutePath);
      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.yaml') || file.endsWith('.yml')) {
          const result = await this.loadFile(path.join(absolutePath, file));
          if (result.error) {
            errors.push(`${file}: ${result.error}`);
          } else if (result.entry) {
            this.addEntry(result.entry);
            loadedCount++;
          }
        }
      }
    } else {
      const result = await this.loadFile(absolutePath);
      if (result.error) {
        errors.push(`${targetPath}: ${result.error}`);
      } else if (result.entry) {
        this.addEntry(result.entry);
        loadedCount++;
      }
    }

    return { loaded: loadedCount, errors };
  }

  private async loadFile(filePath: string): Promise<{ entry?: RegistryEntry; error?: string }> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = filePath.endsWith('.json') ? JSON.parse(content) : yaml.parse(content);

      // Support single entry or array of entries
      if (Array.isArray(parsed)) {
        // For simplicity in this MVP, we only support one entry per file for now
        // or we could iterate. Let's iterate if it's an array.
        for (const item of parsed) {
          const entry = RegistryEntrySchema.parse(item);
          this.addEntry(entry);
        }
        return {}; // Already added
      } else {
        const entry = RegistryEntrySchema.parse(parsed);
        return { entry };
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  private addEntry(entry: RegistryEntry): void {
    this.entries.set(`${entry.type}:${entry.id}`, entry);
  }

  getEntries(): RegistryEntry[] {
    return Array.from(this.entries.values());
  }

  validateEntry(data: unknown): { valid: boolean; errors?: string[] } {
    const result = RegistryEntrySchema.safeParse(data);
    if (result.success) {
      return { valid: true };
    } else {
      return {
        valid: false,
        errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
      };
    }
  }
}
