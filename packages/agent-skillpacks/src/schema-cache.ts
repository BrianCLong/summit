import fs from 'fs/promises';
import path from 'path';
import { type ToolSchema } from './types';

export class SchemaCache {
  constructor(private readonly cacheDir: string) {}

  async write(tool: ToolSchema): Promise<void> {
    await fs.mkdir(this.cacheDir, { recursive: true });
    const filePath = this.resolvePath(tool.name);
    await fs.writeFile(filePath, JSON.stringify(tool, null, 2), 'utf-8');
  }

  async read(toolName: string): Promise<ToolSchema | undefined> {
    const filePath = this.resolvePath(toolName);
    try {
      const contents = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(contents) as ToolSchema;
    } catch {
      return undefined;
    }
  }

  private resolvePath(toolName: string): string {
    const safeName = toolName.replace(/[^a-zA-Z0-9-_]/g, '_');
    return path.join(this.cacheDir, `${safeName}.json`);
  }
}
