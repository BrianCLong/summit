import crypto from 'node:crypto';
import { Capability, RoleDefinition, RoleDefinitionSchema, ToolDefinition, ToolDefinitionSchema } from './types.js';

interface RateLimitState {
  windowStart: number;
  count: number;
}

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  private roles = new Map<string, RoleDefinition>();
  private rateLimits = new Map<string, RateLimitState>();

  registerRole(definition: RoleDefinition): void {
    const parsed = RoleDefinitionSchema.parse(definition);
    this.roles.set(parsed.role, parsed);
  }

  getRole(role: string): RoleDefinition | undefined {
    return this.roles.get(role);
  }

  registerTool(tool: ToolDefinition): ToolDefinition {
    const parsed = ToolDefinitionSchema.parse(tool);
    this.tools.set(parsed.id, parsed);
    return parsed;
  }

  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getTool(toolId: string): ToolDefinition | undefined {
    return this.tools.get(toolId);
  }

  toggleKillSwitch(toolId: string, enabled: boolean): void {
    const tool = this.requireTool(toolId);
    this.tools.set(toolId, { ...tool, killSwitch: enabled });
  }

  deprecateTool(toolId: string, reason?: string): ToolDefinition {
    const tool = this.requireTool(toolId);
    const updated: ToolDefinition = { ...tool, deprecatedAt: new Date() };
    this.tools.set(toolId, updated);
    if (reason) {
      // eslint-disable-next-line no-console
      console.warn(`Tool ${toolId} deprecated: ${reason}`);
    }
    return updated;
  }

  isRateLimited(toolId: string, tenantId: string): boolean {
    const tool = this.requireTool(toolId);
    const key = `${tool.id}:${tenantId}`;
    const state = this.rateLimits.get(key);
    const now = Date.now();
    const windowStart = now - tool.rateLimit.intervalSeconds * 1000;

    if (!state || state.windowStart < windowStart) {
      this.rateLimits.set(key, { windowStart: now, count: 1 });
      return false;
    }

    if (state.count >= tool.rateLimit.maxCalls) {
      return true;
    }

    state.count += 1;
    this.rateLimits.set(key, state);
    return false;
  }

  assertScope(role: string, capability: Capability, tool: ToolDefinition, environment: string): void {
    if (!tool.environments.includes(environment)) {
      throw new Error(`Tool ${tool.id} not allowed in environment ${environment}`);
    }

    if (!tool.scopes.includes(capability.action)) {
      throw new Error(`Tool ${tool.id} does not support action ${capability.action}`);
    }

    const roleDefinition = this.roles.get(role);
    if (!roleDefinition) {
      throw new Error(`Unknown role: ${role}`);
    }

    const permitted = roleDefinition.capabilities.some((c) =>
      c.action === capability.action &&
      c.domains.includes(capability.domains[0]) &&
      c.environments.some((env) => env === environment),
    );

    if (!permitted) {
      throw new Error(`Role ${role} is not permitted to perform ${capability.action} in ${environment}`);
    }
  }

  createAuditId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  private requireTool(toolId: string): ToolDefinition {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} is not registered`);
    }
    return tool;
  }
}

export const createDefaultRoles = (): RoleDefinition[] => [
  {
    role: 'user_copilot',
    capabilities: [
      { action: 'read', domains: ['analysis', 'search'], environments: ['dev', 'staging', 'prod'] },
      { action: 'notify', domains: ['communications'], environments: ['dev', 'staging', 'prod'] },
    ],
  },
  {
    role: 'support_copilot',
    capabilities: [
      { action: 'read', domains: ['cases', 'support'], environments: ['dev', 'staging', 'prod'] },
      { action: 'write', domains: ['cases'], environments: ['staging', 'prod'], approvalRequired: true },
      { action: 'notify', domains: ['communications'], environments: ['dev', 'staging', 'prod'] },
    ],
  },
  {
    role: 'ops_agent',
    capabilities: [
      { action: 'read', domains: ['ops', 'platform'], environments: ['dev', 'staging', 'prod'] },
      { action: 'write', domains: ['ops', 'platform'], environments: ['staging', 'prod'], highBlastRadius: true, approvalRequired: true },
      { action: 'delete', domains: ['ops'], environments: ['staging'], approvalRequired: true },
      { action: 'export', domains: ['audit'], environments: ['staging', 'prod'], approvalRequired: true },
    ],
  },
];
