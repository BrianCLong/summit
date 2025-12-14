import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

export type PromptType = 'system' | 'user' | 'tool' | 'few-shot';
export type PromptRiskTier = 'low' | 'medium' | 'high';

export interface PromptTemplate {
  id: string;
  version: string;
  owner: string;
  module?: string;
  type: PromptType;
  description?: string;
  riskTier?: PromptRiskTier;
  tags?: string[];
  variables?: string[];
  template: string;
  sourcePath: string;
}

export interface PromptFilter {
  owner?: string;
  module?: string;
  type?: PromptType;
  riskTier?: PromptRiskTier;
  tag?: string;
  search?: string;
}

export interface RenderedPrompt extends PromptTemplate {
  content: string;
}

const SUPPORTED_EXTENSIONS = new Set(['.yaml', '.yml', '.json']);
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROMPT_DIRECTORY = path.resolve(CURRENT_DIR, '../../prompts/registry');

class PromptRegistry {
  private cache: Map<string, PromptTemplate> = new Map();

  constructor(private promptDirectory: string = DEFAULT_PROMPT_DIRECTORY) {
    this.reload();
  }

  public reload(): void {
    this.cache = this.loadFromDisk();
  }

  public loadPrompt(id: string): PromptTemplate {
    const prompt = this.cache.get(id);

    if (!prompt) {
      throw new Error(`Prompt ${id} not found in registry`);
    }

    return prompt;
  }

  public renderPrompt(
    id: string,
    variables: Record<string, string | number | boolean> = {},
  ): RenderedPrompt {
    const prompt = this.loadPrompt(id);
    const content = this.applyTemplate(prompt.template, variables);

    return { ...prompt, content };
  }

  public listPrompts(filter?: PromptFilter): PromptTemplate[] {
    const entries = Array.from(this.cache.values());

    if (!filter) {
      return entries;
    }

    return entries.filter((entry) => {
      const matchesOwner = filter.owner ? entry.owner === filter.owner : true;
      const matchesModule = filter.module ? entry.module === filter.module : true;
      const matchesType = filter.type ? entry.type === filter.type : true;
      const matchesRisk = filter.riskTier ? entry.riskTier === filter.riskTier : true;
      const matchesTag = filter.tag ? entry.tags?.includes(filter.tag) : true;
      const matchesSearch = filter.search
        ? entry.template.toLowerCase().includes(filter.search.toLowerCase()) ||
          entry.description?.toLowerCase().includes(filter.search.toLowerCase())
        : true;

      return (
        matchesOwner &&
        matchesModule &&
        matchesType &&
        matchesRisk &&
        matchesTag &&
        matchesSearch
      );
    });
  }

  private applyTemplate(
    template: string,
    variables: Record<string, string | number | boolean>,
  ): string {
    return template.replace(/{{\s*([\w_]+)\s*}}/g, (_match, key) => {
      const value = variables[key];
      return value === undefined || value === null ? '' : String(value);
    });
  }

  private loadFromDisk(): Map<string, PromptTemplate> {
    const promptFiles = this.walkPromptFiles(this.promptDirectory);
    const registry = new Map<string, PromptTemplate>();

    for (const filePath of promptFiles) {
      const prompt = this.parsePromptFile(filePath);
      if (registry.has(prompt.id)) {
        throw new Error(`Duplicate prompt id detected: ${prompt.id} in ${filePath}`);
      }
      registry.set(prompt.id, prompt);
    }

    return registry;
  }

  private walkPromptFiles(dir: string): string[] {
    const entries = readdirSync(dir);
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        files.push(...this.walkPromptFiles(fullPath));
      } else if (SUPPORTED_EXTENSIONS.has(path.extname(fullPath))) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private parsePromptFile(filePath: string): PromptTemplate {
    const rawContent = readFileSync(filePath, 'utf8');
    const parsed = yaml.load(rawContent) as Record<string, unknown> | undefined;

    if (!parsed || typeof parsed !== 'object') {
      throw new Error(`Invalid prompt file: ${filePath}`);
    }

    const template = parsed.template;

    if (typeof template !== 'string' || !template.trim()) {
      throw new Error(`Prompt template missing or invalid in ${filePath}`);
    }

    const prompt: PromptTemplate = {
      id: this.expectString(parsed, 'id', filePath),
      version: this.expectString(parsed, 'version', filePath),
      owner: this.expectString(parsed, 'owner', filePath),
      module: this.optionalString(parsed, 'module'),
      type: this.expectString(parsed, 'type', filePath) as PromptType,
      description: this.optionalString(parsed, 'description'),
      riskTier: this.optionalString(parsed, 'riskTier') as PromptRiskTier,
      tags: this.optionalStringArray(parsed, 'tags'),
      variables: this.optionalStringArray(parsed, 'variables'),
      template,
      sourcePath: filePath,
    };

    return prompt;
  }

  private expectString(
    parsed: Record<string, unknown>,
    key: string,
    filePath: string,
  ): string {
    const value = parsed[key];
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`Expected string for ${key} in ${filePath}`);
    }
    return value;
  }

  private optionalString(parsed: Record<string, unknown>, key: string): string | undefined {
    const value = parsed[key];
    return typeof value === 'string' ? value : undefined;
  }

  private optionalStringArray(
    parsed: Record<string, unknown>,
    key: string,
  ): string[] | undefined {
    const value = parsed[key];

    if (!value) {
      return undefined;
    }

    if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
      return value as string[];
    }

    throw new Error(`Expected array of strings for ${key}`);
  }
}

export const promptRegistry = new PromptRegistry();

export const loadPrompt = (id: string): PromptTemplate => promptRegistry.loadPrompt(id);

export const renderPrompt = (
  id: string,
  variables: Record<string, string | number | boolean> = {},
): RenderedPrompt => promptRegistry.renderPrompt(id, variables);

export const listPrompts = (filter?: PromptFilter): PromptTemplate[] =>
  promptRegistry.listPrompts(filter);
