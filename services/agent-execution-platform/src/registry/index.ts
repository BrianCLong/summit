/**
 * Prompt Registry - Centralized prompt management with versioning
 */

import crypto from 'node:crypto';
import {
  PromptTemplate,
  PromptVariable,
  PromptMetadata,
  RenderedPrompt,
  PromptVersion,
  PromptLifecycleStatus,
  PromptApproval,
  PromptAuditEntry,
  PromptInvocationRecord,
  PromptInvocationReplay,
  PromptLockfile,
  TokenDiff,
} from '../types/index.js';
import { logger } from '../logging/index.js';

interface PromptInvocationOptions {
  version?: string;
  model?: string;
  modelFamily?: string;
  toolVersions?: Record<string, string>;
  temperature?: number;
  output?: string;
  replayOf?: string;
  lockfile?: PromptLockfile;
}

interface ReplayOptions {
  variables?: Record<string, any>;
  model?: string;
  toolVersions?: Record<string, string>;
  output?: string;
}

export class PromptRegistry {
  private prompts: Map<string, PromptTemplate>;
  private versions: Map<string, PromptVersion[]>;
  private versionStatus: Map<string, PromptLifecycleStatus>;
  private audits: Map<string, PromptAuditEntry[]>;
  private invocations: Map<string, PromptInvocationRecord>;
  private cache: Map<string, RenderedPrompt>;
  private cacheTTL: number;

  constructor(cacheTTL: number = 3600000) {
    this.prompts = new Map();
    this.versions = new Map();
    this.versionStatus = new Map();
    this.audits = new Map();
    this.invocations = new Map();
    this.cache = new Map();
    this.cacheTTL = cacheTTL;
  }

  async register(template: PromptTemplate): Promise<void> {
    logger.getLogger().info('Registering prompt template', {
      promptId: template.id,
      name: template.name,
      version: template.version,
    });

    // Validate template
    this.validateTemplate(template);

    // Store template
    const key = this.makeKey(template.name, template.version);
    const lifecycle = template.metadata.lifecycle || 'draft';
    this.prompts.set(key, template);

    // Store version history
    const version: PromptVersion = {
      version: template.version,
      content: template.content,
      createdAt: template.metadata.createdAt,
      createdBy: template.metadata.author,
      status: lifecycle,
      approvals: [],
    };

    const existingVersions = this.versions.get(template.name) || [];
    const existingIndex = existingVersions.findIndex(
      (v) => v.version === template.version
    );
    if (existingIndex >= 0) {
      existingVersions[existingIndex] = version;
    } else {
      existingVersions.push(version);
    }
    this.versions.set(template.name, existingVersions);
    this.versionStatus.set(key, lifecycle);
    this.appendAudit(key, {
      actor: template.metadata.author,
      action: 'created',
      timestamp: template.metadata.createdAt || new Date(),
      toStatus: lifecycle,
      notes: template.metadata.purpose,
    });
    if (lifecycle === 'approved') {
      this.addApproval(template.name, template.version, {
        approvedBy: template.metadata.author,
        approvedAt: template.metadata.updatedAt || new Date(),
        notes: 'Approved on registration',
      });
    }

    logger.getLogger().info('Prompt template registered successfully', {
      promptId: template.id,
    });
  }

  async get(name: string, version?: string): Promise<PromptTemplate | null> {
    if (version) {
      const key = this.makeKey(name, version);
      return this.prompts.get(key) || null;
    }

    // Get latest version
    const versions = this.versions.get(name);
    if (!versions || versions.length === 0) {
      return null;
    }

    const approvedVersions = versions.filter(
      (version) => this.getVersionStatus(name, version.version) === 'approved'
    );
    const latestVersion =
      approvedVersions.length > 0
        ? approvedVersions[approvedVersions.length - 1]!
        : versions[versions.length - 1]!;
    const key = this.makeKey(name, latestVersion.version);
    return this.prompts.get(key) || null;
  }

  async render(
    name: string,
    variables: Record<string, any>,
    versionOrOptions?: string | PromptInvocationOptions
  ): Promise<RenderedPrompt> {
    const version =
      typeof versionOrOptions === 'string'
        ? versionOrOptions
        : versionOrOptions?.version;
    const template = await this.get(name, version);
    if (!template) {
      throw new Error('Prompt template not found: ' + name);
    }

    logger.getLogger().debug('Rendering prompt', {
      name,
      version: version || 'latest',
      variables,
    });

    // Validate variables
    this.validateVariables(template, variables);

    // Render template
    let rendered = template.content;

    for (const variable of template.variables) {
      const value = variables[variable.name] !== undefined
        ? variables[variable.name]
        : variable.default;

      if (value === undefined && variable.required) {
        throw new Error('Required variable missing: ' + variable.name);
      }

      const placeholder = '{{' + variable.name + '}}';
      const stringValue = this.formatValue(value, variable.type);
      rendered = rendered.replace(new RegExp(placeholder, 'g'), stringValue);
    }

    const result: RenderedPrompt = {
      content: rendered,
      metadata: template.metadata,
      variables,
      renderedAt: new Date(),
      version: template.version,
    };

    logger.getLogger().debug('Prompt rendered successfully', {
      name,
      length: rendered.length,
    });

    return result;
  }

  async invoke(
    name: string,
    variables: Record<string, any>,
    options: PromptInvocationOptions = {}
  ): Promise<PromptInvocationRecord> {
    const renderVersion = options.version || options.lockfile?.promptVersion;
    const rendered = await this.render(name, variables, renderVersion);
    const promptVersion = renderVersion || rendered.version;
    const model = options.model || rendered.metadata.model || 'unspecified';
    const modelFamily = options.modelFamily || rendered.metadata.modelFamily || 'unspecified';
    const toolVersions = options.toolVersions || {};
    const temperature = options.temperature ?? rendered.metadata.temperature;
    const lockfile =
      options.lockfile ||
      this.buildLockfile(
        name,
        rendered.metadata,
        promptVersion,
        model,
        modelFamily,
        toolVersions,
        temperature
      );

    const output = options.output || this.defaultOutput(rendered.content, model, lockfile);
    const status = this.getVersionStatus(name, lockfile.promptVersion);

    const record: PromptInvocationRecord = {
      id: this.generateRunId(),
      promptName: name,
      promptVersion: lockfile.promptVersion,
      promptVersionId: lockfile.promptVersionId,
      status,
      model,
      toolVersions: lockfile.toolVersions,
      inputHash: this.hashPayload(variables),
      outputHash: this.hashPayload(output),
      input: variables,
      output,
      lockfile,
      createdAt: new Date(),
      replayOf: options.replayOf,
    };

    if (this.isFeatureEnabled()) {
      this.invocations.set(record.id, record);
    }

    return record;
  }

  getInvocation(id: string): PromptInvocationRecord | null {
    return this.invocations.get(id) || null;
  }

  async replayInvocation(
    runId: string,
    overrides: ReplayOptions = {}
  ): Promise<PromptInvocationReplay> {
    const original = this.getInvocation(runId);
    if (!original) {
      throw new Error('Invocation not found: ' + runId);
    }

    const replayRun = await this.invoke(original.promptName, overrides.variables || original.input, {
      version: original.promptVersion,
      model: overrides.model || original.model,
      modelFamily: original.lockfile.modelFamily,
      toolVersions: overrides.toolVersions || original.toolVersions,
      temperature: original.lockfile.temperature,
      output: overrides.output,
      replayOf: runId,
      lockfile: original.lockfile,
    });

    return {
      originalRunId: runId,
      replayRun,
      diff: this.diffTokens(original.output, replayRun.output),
    };
  }

  async updateStatus(
    name: string,
    version: string,
    nextStatus: PromptLifecycleStatus,
    actor: string,
    notes?: string
  ): Promise<PromptVersion> {
    const key = this.makeKey(name, version);
    const current = this.versionStatus.get(key) || 'draft';

    if (!this.isLifecycleTransitionValid(current, nextStatus)) {
      throw new Error(`Invalid status transition from ${current} to ${nextStatus}`);
    }

    this.versionStatus.set(key, nextStatus);
    const updated = this.syncVersionStatus(name, version, nextStatus);

    if (nextStatus === 'approved') {
      this.addApproval(name, version, {
        approvedAt: new Date(),
        approvedBy: actor,
        notes,
      });
    }

    this.appendAudit(key, {
      actor,
      action: 'status-changed',
      timestamp: new Date(),
      fromStatus: current,
      toStatus: nextStatus,
      notes,
    });

    return updated;
  }

  getAuditTrail(name: string, version: string): PromptAuditEntry[] {
    const key = this.makeKey(name, version);
    return this.audits.get(key) || [];
  }

  async list(tags?: string[]): Promise<PromptTemplate[]> {
    const templates = Array.from(this.prompts.values());

    if (!tags || tags.length === 0) {
      return templates;
    }

    return templates.filter((template) =>
      tags.some((tag) => template.tags.includes(tag))
    );
  }

  async delete(name: string, version?: string): Promise<boolean> {
    if (version) {
      const key = this.makeKey(name, version);
      this.versionStatus.delete(key);
      this.audits.delete(key);
      return this.prompts.delete(key);
    }

    // Delete all versions
    const versions = this.versions.get(name);
    if (!versions) {
      return false;
    }

    for (const v of versions) {
      const key = this.makeKey(name, v.version);
      this.prompts.delete(key);
      this.versionStatus.delete(key);
      this.audits.delete(key);
    }

    this.versions.delete(name);
    return true;
  }

  async getVersions(name: string): Promise<PromptVersion[]> {
    const versions = this.versions.get(name) || [];
    return versions.map((version) => ({
      ...version,
      status: this.versionStatus.get(this.makeKey(name, version.version)) || version.status || 'draft',
      approvals: version.approvals || [],
    }));
  }

  private validateTemplate(template: PromptTemplate): void {
    if (!template.id || !template.name || !template.version) {
      throw new Error('Template must have id, name, and version');
    }

    if (!template.content) {
      throw new Error('Template content cannot be empty');
    }

    if (this.isFeatureEnabled()) {
      if (!template.metadata.owner || !template.metadata.purpose) {
        throw new Error('Template metadata must include owner and purpose');
      }

      if (!template.metadata.modelFamily) {
        throw new Error('Template metadata must include modelFamily');
      }

      if (
        !Array.isArray(template.metadata.safetyConstraints) ||
        template.metadata.safetyConstraints.length === 0
      ) {
        throw new Error('Template metadata must include at least one safety constraint');
      }

      if (
        template.metadata.lifecycle &&
        !['draft', 'approved', 'deprecated'].includes(template.metadata.lifecycle)
      ) {
        throw new Error('Invalid lifecycle value for prompt metadata');
      }
    }

    // Validate variables
    for (const variable of template.variables) {
      if (!variable.name) {
        throw new Error('Variable must have a name');
      }

      if (variable.validation) {
        // Validate validation rules
        if (variable.validation.pattern) {
          try {
            new RegExp(variable.validation.pattern);
          } catch (error) {
            throw new Error('Invalid validation pattern for variable: ' + variable.name);
          }
        }
      }
    }

    // Check for undefined variables in content
    const variablePattern = /\{\{(\w+)\}\}/g;
    const matches = template.content.match(variablePattern);
    if (matches) {
      const definedVars = new Set(template.variables.map((v) => v.name));
      for (const match of matches) {
        const varName = match.slice(2, -2);
        if (!definedVars.has(varName)) {
          throw new Error('Undefined variable in template: ' + varName);
        }
      }
    }
  }

  private validateVariables(
    template: PromptTemplate,
    variables: Record<string, any>
  ): void {
    for (const variable of template.variables) {
      const value = variables[variable.name];

      // Check required
      if (variable.required && value === undefined && variable.default === undefined) {
        throw new Error('Required variable missing: ' + variable.name);
      }

      if (value !== undefined) {
        // Check type
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== variable.type && variable.type !== 'object') {
          throw new Error(
            'Type mismatch for variable ' + variable.name +
            ': expected ' + variable.type + ', got ' + actualType
          );
        }

        // Check validation rules
        if (variable.validation) {
          this.validateValue(value, variable);
        }
      }
    }
  }

  private validateValue(value: any, variable: PromptVariable): void {
    const validation = variable.validation!;

    // Pattern validation
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        throw new Error(
          'Value for variable ' + variable.name + ' does not match pattern: ' + validation.pattern
        );
      }
    }

    // Min/max validation
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        throw new Error(
          'Value for variable ' + variable.name + ' is below minimum: ' + validation.min
        );
      }
      if (validation.max !== undefined && value > validation.max) {
        throw new Error(
          'Value for variable ' + variable.name + ' is above maximum: ' + validation.max
        );
      }
    }

    // Enum validation
    if (validation.enum && !validation.enum.includes(value)) {
      throw new Error(
        'Value for variable ' + variable.name + ' is not in allowed values'
      );
    }
  }

  private formatValue(value: any, type: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        return String(value);
      case 'boolean':
        return String(value);
      case 'array':
        return Array.isArray(value) ? value.join(', ') : String(value);
      case 'object':
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
      default:
        return String(value);
    }
  }

  private makeKey(name: string, version: string): string {
    return name + '@' + version;
  }

  private buildLockfile(
    name: string,
    metadata: PromptMetadata,
    promptVersion: string,
    model: string,
    modelFamily: string,
    toolVersions: Record<string, string>,
    temperature?: number
  ): PromptLockfile {
    return {
      promptName: name,
      promptVersion,
      promptVersionId: this.makeKey(name, promptVersion),
      model,
      modelFamily,
      temperature,
      toolVersions,
      safetyConstraints: metadata.safetyConstraints || [],
    };
  }

  private getVersionStatus(name: string, version: string): PromptLifecycleStatus {
    const key = this.makeKey(name, version);
    return this.versionStatus.get(key) || 'draft';
  }

  private isLifecycleTransitionValid(
    current: PromptLifecycleStatus,
    next: PromptLifecycleStatus
  ): boolean {
    if (current === next) {
      return true;
    }

    const transitions: Record<PromptLifecycleStatus, PromptLifecycleStatus[]> = {
      draft: ['approved', 'deprecated'],
      approved: ['deprecated'],
      deprecated: [],
    };

    return transitions[current].includes(next);
  }

  private appendAudit(key: string, entry: PromptAuditEntry): void {
    const existing = this.audits.get(key) || [];
    existing.push(entry);
    this.audits.set(key, existing);
  }

  private addApproval(name: string, version: string, approval: PromptApproval): void {
    const versions = this.versions.get(name) || [];
    const index = versions.findIndex((v) => v.version === version);
    if (index >= 0) {
      const versionEntry = versions[index];
      if (!versionEntry) {
        return;
      }
      const approvals = versionEntry.approvals || [];
      approvals.push(approval);
      versions[index] = { ...versionEntry, approvals, status: 'approved' };
      this.versions.set(name, versions);
    }
  }

  private syncVersionStatus(
    name: string,
    version: string,
    status: PromptLifecycleStatus
  ): PromptVersion {
    const versions = this.versions.get(name) || [];
    const index = versions.findIndex((v) => v.version === version);

    if (index === -1) {
      throw new Error('Prompt version not found for status update');
    }

    const versionEntry = versions[index];
    if (!versionEntry) {
      throw new Error('Prompt version not found for status update');
    }

    const updated: PromptVersion = { ...versionEntry, status };
    versions[index] = updated;
    this.versions.set(name, versions);
    return updated;
  }

  private hashPayload(payload: any): string {
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(payload));
    return hash.digest('hex');
  }

  private defaultOutput(content: string, model: string, lockfile: PromptLockfile): string {
    return `[model:${model}|prompt:${lockfile.promptVersionId}] ${content}`;
  }

  private diffTokens(original: string, replayed: string): TokenDiff {
    const originalTokens = original.split(/\s+/);
    const replayedTokens = replayed.split(/\s+/);
    const removed = originalTokens.filter((token) => !replayedTokens.includes(token));
    const added = replayedTokens.filter((token) => !originalTokens.includes(token));

    return { added, removed };
  }

  private generateRunId(): string {
    return 'run_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }

  clearCache(): void {
    this.cache.clear();
  }

  isFeatureEnabled(): boolean {
    return (
      process.env.PROMPT_REGISTRY === '1' ||
      process.env.FEATURE_PROMPT_REGISTRY_ENABLED === 'true'
    );
  }

  getStats(): {
    totalPrompts: number;
    totalVersions: number;
    cacheSize: number;
    recordedRuns: number;
    lifecycle: Record<PromptLifecycleStatus, number>;
  } {
    let totalVersions = 0;
    for (const versions of this.versions.values()) {
      totalVersions += versions.length;
    }

    const lifecycle: Record<PromptLifecycleStatus, number> = {
      draft: 0,
      approved: 0,
      deprecated: 0,
    };

    for (const status of this.versionStatus.values()) {
      lifecycle[status] = (lifecycle[status] || 0) + 1;
    }

    return {
      totalPrompts: this.versions.size,
      totalVersions,
      cacheSize: this.cache.size,
      recordedRuns: this.invocations.size,
      lifecycle,
    };
  }
}

// Singleton instance
export const promptRegistry = new PromptRegistry();
