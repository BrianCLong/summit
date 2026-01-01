import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { PromptRef } from './types.js';

interface PromptRegistryEntry extends PromptRef {
  description?: string;
  scope?: { paths?: string[]; domains?: string[]; allowed_operations?: string[] };
}

interface PromptRegistryFile {
  version: number;
  prompts: PromptRegistryEntry[];
}

export class PromptRegistry {
  private registryPath: string;
  private cache?: PromptRegistryFile;

  constructor(registryPath?: string) {
    this.registryPath =
      registryPath || path.resolve(__dirname, '..', '..', '..', 'prompts', 'registry.yaml');
  }

  private load(): PromptRegistryFile {
    if (this.cache) {
      return this.cache;
    }

    if (!fs.existsSync(this.registryPath)) {
      throw new Error(`Prompt registry not found at ${this.registryPath}`);
    }

    const raw = fs.readFileSync(this.registryPath, 'utf8');
    const parsed = yaml.load(raw) as PromptRegistryFile;

    if (!parsed || !Array.isArray(parsed.prompts)) {
      throw new Error('Invalid prompt registry format');
    }

    this.cache = parsed;
    return parsed;
  }

  getByHash(hash: string): PromptRegistryEntry | undefined {
    const registry = this.load();
    return registry.prompts.find((entry) => entry.sha256 === hash);
  }

  validatePromptRef(promptRef: PromptRef): PromptRegistryEntry {
    const entry = this.getByHash(promptRef.sha256);
    if (!entry) {
      throw new Error(`Prompt hash ${promptRef.sha256} not registered in prompts/registry.yaml`);
    }

    if (entry.id !== promptRef.id || entry.version !== promptRef.version) {
      throw new Error(
        `Prompt ref mismatch for ${promptRef.id}@${promptRef.version} (expected ${entry.id}@${entry.version})`
      );
    }

    return entry;
  }
}
