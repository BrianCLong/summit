import type {
  ResourceTemplate,
  ResourceMetadata,
} from '@modelcontextprotocol/sdk/server/mcp';
import type {
  CallToolResult,
  GetPromptResult,
  ReadResourceResult,
  ServerNotification,
  ServerRequest,
  ToolAnnotations,
} from '@modelcontextprotocol/sdk/types';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol';
import type { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate';
import type { ZodRawShape, ZodTypeAny } from 'zod';
import type { TenantContext } from './auth.js';

export type HandlerContext = RequestHandlerExtra<
  ServerRequest,
  ServerNotification
> & {
  tenant: TenantContext;
};

export type PolicyEvaluator = (
  tenant: TenantContext,
  payload?: unknown,
) => boolean | Promise<boolean>;

export type ToolHandler = (
  args: unknown,
  context: HandlerContext,
) => Promise<CallToolResult> | CallToolResult;

export type PromptArgsShape = Record<string, ZodTypeAny>;

export type ResourceHandler = (
  uri: URL,
  context: HandlerContext,
  variables?: Variables,
) => Promise<ReadResourceResult> | ReadResourceResult;

export type PromptHandler = (
  args: Record<string, unknown> | undefined,
  context: HandlerContext,
) => Promise<GetPromptResult> | GetPromptResult;

export interface ToolDefinition {
  name: string;
  config?: {
    title?: string;
    description?: string;
    inputSchema?: ZodRawShape;
    outputSchema?: ZodRawShape;
    annotations?: ToolAnnotations;
    _meta?: Record<string, unknown>;
  };
  handler: ToolHandler;
  policy?: PolicyEvaluator;
}

export interface ResourceDefinition {
  name: string;
  uri: string | ResourceTemplate;
  metadata?: ResourceMetadata;
  read: ResourceHandler;
  policy?: PolicyEvaluator;
}

export interface PromptDefinition {
  name: string;
  config?: {
    title?: string;
    description?: string;
    argsSchema?: PromptArgsShape;
  };
  handler: PromptHandler;
  policy?: PolicyEvaluator;
}

export class ToolRegistry {
  private readonly items: ToolDefinition[] = [];

  register(tool: ToolDefinition): this {
    this.items.push(tool);
    return this;
  }

  list(): ToolDefinition[] {
    return [...this.items];
  }
}

export class ResourceRegistry {
  private readonly items: ResourceDefinition[] = [];

  register(resource: ResourceDefinition): this {
    this.items.push(resource);
    return this;
  }

  list(): ResourceDefinition[] {
    return [...this.items];
  }
}

export class PromptRegistry {
  private readonly items: PromptDefinition[] = [];

  register(prompt: PromptDefinition): this {
    this.items.push(prompt);
    return this;
  }

  list(): PromptDefinition[] {
    return [...this.items];
  }
}
