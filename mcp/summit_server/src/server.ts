import { randomUUID } from 'crypto';
import type {
  EvidenceEvent,
  ToolExecutionContext,
  ToolExecutionResult,
} from './types.js';
import { sanitizeOutput } from './sanitization/sanitize.js';
import { EvidenceStore } from './evidence/evidence-store.js';
import { ToolRegistry } from './tools/tool-registry.js';
import { SkillsRegistry } from './skills/skills-registry.js';
import { createBuiltinTools } from './tools/builtin-tools.js';
import { evaluatePolicy } from './policy/policy-gate.js';
import { executeReact, type ReactRequest } from './react/react-loop.js';
import { stableStringify } from './utils/stable-json.js';

export type McpRequest = {
  sessionId?: string;
  traceId?: string;
  tenantId: string;
  actor: string;
  purpose: string;
  scopes: string[];
  breakGlass?: {
    reason: string;
    expiresAt: string;
  };
  request:
    | {
        type: 'tool';
        toolId: string;
        input: Record<string, unknown>;
      }
    | {
        type: 'react';
        react: ReactRequest;
      }
    | {
        type: 'route_tools';
        query: string;
        limit?: number;
      };
};

export type McpResponse = {
  sessionId: string;
  traceId: string;
  ok: boolean;
  data?: unknown;
  error?: string;
};

export type McpServerOptions = {
  maxSessionsPerTenant: number;
  maxToolCallsPerRequest: number;
};

export class McpServer {
  private toolRegistry: ToolRegistry;
  private skillsRegistry: SkillsRegistry;
  private evidenceStore: EvidenceStore;
  private options: McpServerOptions;
  private activeSessions: Map<string, Set<string>> = new Map();

  private constructor(
    toolRegistry: ToolRegistry,
    skillsRegistry: SkillsRegistry,
    evidenceStore: EvidenceStore,
    options: McpServerOptions,
  ) {
    this.toolRegistry = toolRegistry;
    this.skillsRegistry = skillsRegistry;
    this.evidenceStore = evidenceStore;
    this.options = options;
  }

  static async create(options?: Partial<McpServerOptions>): Promise<McpServer> {
    const skillsRegistry = await SkillsRegistry.load();
    const evidenceStore = new EvidenceStore();
    const toolRegistry = new ToolRegistry(
      createBuiltinTools({
        getToolIndex: () => toolRegistry.listIndex(),
        getToolSchema: (toolId) => toolRegistry.getSchema(toolId),
        skillsRegistry,
        evidenceStore,
      }),
    );
    return new McpServer(
      toolRegistry,
      skillsRegistry,
      evidenceStore,
      {
        maxSessionsPerTenant: 3,
        maxToolCallsPerRequest: 5,
        ...options,
      },
    );
  }

  async handle(request: McpRequest): Promise<McpResponse> {
    const sessionId = request.sessionId ?? randomUUID();
    const traceId = request.traceId ?? randomUUID();

    if (!this.registerSession(request.tenantId, sessionId)) {
      return {
        sessionId,
        traceId,
        ok: false,
        error: 'Max concurrent sessions exceeded for tenant',
      };
    }

    const context: ToolExecutionContext = {
      sessionId,
      traceId,
      tenantId: request.tenantId,
      actor: request.actor,
      purpose: request.purpose,
      scopes: request.scopes,
      breakGlass: request.breakGlass,
    };

    this.logEvent({
      timestamp: new Date().toISOString(),
      traceId,
      sessionId,
      type: 'request',
      detail: {
        type: request.request.type,
        actor: request.actor,
        purpose: request.purpose,
      },
    });

    try {
      if (request.request.type === 'route_tools') {
        const routed = this.toolRegistry.routeTools(
          request.request.query,
          request.request.limit ?? 5,
        );
        return { sessionId, traceId, ok: true, data: routed };
      }
      if (request.request.type === 'react') {
        const response = await executeReact(
          this.toolRegistry,
          context,
          request.request.react,
          this.options.maxToolCallsPerRequest,
          (toolId, input, toolContext) =>
            this.executeTool(toolId, input, toolContext),
        );
        return { sessionId, traceId, ok: true, data: response };
      }
      const result = await this.executeTool(
        request.request.toolId,
        request.request.input,
        context,
      );
      return {
        sessionId,
        traceId,
        ok: result.ok,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logEvent({
        timestamp: new Date().toISOString(),
        traceId,
        sessionId,
        type: 'error',
        detail: { message },
      });
      return { sessionId, traceId, ok: false, error: message };
    }
  }

  private async executeTool(
    toolId: string,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<ToolExecutionResult<unknown>> {
    const tool = this.toolRegistry.getTool(toolId);
    const parsed = tool.schema.inputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: `Validation failed: ${parsed.error.message}`,
      };
    }

    const decision = evaluatePolicy(tool.schema, context);
    this.evidenceStore.recordPolicy(decision);
    this.logEvent({
      timestamp: new Date().toISOString(),
      traceId: context.traceId,
      sessionId: context.sessionId,
      type: 'policy',
      detail: decision,
    });

    if (decision.decision === 'deny') {
      return { ok: false, error: decision.reason };
    }

    const start = Date.now();
    const output = await tool.handler(parsed.data, context);
    const sanitized = sanitizeOutput(output);

    this.evidenceStore.recordToolSchema({
      id: tool.schema.id,
      name: tool.schema.name,
      description: tool.schema.description,
      tags: tool.schema.tags,
      riskTier: tool.schema.riskTier,
      requiredScopes: tool.schema.requiredScopes,
      costHint: tool.schema.costHint,
      version: tool.schema.version,
      schemaHash: this.toolRegistry.getSchemaHash(tool.schema.id),
    });

    this.logEvent({
      timestamp: new Date().toISOString(),
      traceId: context.traceId,
      sessionId: context.sessionId,
      type: 'tool',
      detail: {
        toolId: tool.schema.id,
        durationMs: Date.now() - start,
      },
    });

    return { ok: true, data: sanitized };
  }

  private logEvent(event: EvidenceEvent): void {
    this.evidenceStore.recordEvent(event);
    const payload = stableStringify(event as never);
    console.info(payload);
  }

  private registerSession(tenantId: string, sessionId: string): boolean {
    const sessions = this.activeSessions.get(tenantId) ?? new Set();
    sessions.add(sessionId);
    this.activeSessions.set(tenantId, sessions);
    return sessions.size <= this.options.maxSessionsPerTenant;
  }
}
