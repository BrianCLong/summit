import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { AgentRegistryEntry, PromptRef } from './types.js';
import { PromptRegistry } from './PromptRegistry.js';

interface AgentRegistryFile {
  scenarios: AgentRegistryEntry[];
}

export class AgentTaskRegistry {
  private registryPath: string;
  private promptRegistry: PromptRegistry;
  private cache?: AgentRegistryFile;

  constructor(registryPath?: string, promptRegistry?: PromptRegistry) {
    this.registryPath =
      registryPath || path.resolve(__dirname, '..', '..', '..', 'agents', 'redteam', 'registry.json');
    this.promptRegistry = promptRegistry || new PromptRegistry();
  }

  private load(): AgentRegistryFile {
    if (this.cache) {
      return this.cache;
    }

    if (!fs.existsSync(this.registryPath)) {
      throw new Error(`Agent registry not found at ${this.registryPath}`);
    }

    const content = fs.readFileSync(this.registryPath, 'utf8');
    const parsed = JSON.parse(content) as AgentRegistryFile;

    if (!parsed || !Array.isArray(parsed.scenarios)) {
      throw new Error('Invalid agent registry format');
    }

    this.cache = parsed;
    return parsed;
  }

  getScenario(id: string): AgentRegistryEntry {
    const registry = this.load();
    const entry = registry.scenarios.find((scenario) => scenario.id === id);

    if (!entry) {
      throw new Error(`Scenario ${id} not found in agents/redteam/registry.json`);
    }

    this.validatePromptRef(entry.prompt_ref);
    return entry;
  }

  validatePromptRef(promptRef: PromptRef): void {
    this.promptRegistry.validatePromptRef(promptRef);
  }

  getAll(): AgentRegistryEntry[] {
    return this.load().scenarios;
  }

  loadTaskSpec(taskSpecPath: string): Record<string, unknown> {
    const resolved = path.isAbsolute(taskSpecPath)
      ? taskSpecPath
      : path.resolve(process.cwd(), taskSpecPath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`Task spec not found: ${resolved}`);
    }

    const ext = path.extname(resolved).toLowerCase();
    const content = fs.readFileSync(resolved, 'utf8');
    if (ext === '.yaml' || ext === '.yml') {
      return yaml.load(content) as Record<string, unknown>;
    }

    return JSON.parse(content) as Record<string, unknown>;
  }
}
