import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport';
import type { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol';
import type {
  ServerNotification,
  ServerRequest,
} from '@modelcontextprotocol/sdk/types';
import { stdioServerTransport } from './transports/stdio.js';
import { httpServer, type HttpServerConfig } from './transports/http.js';
import { verifyJwt, type TenantContext, type JwtClaims } from './auth.js';
import { enforcePolicy } from './policy.js';
import { createLogger } from './logging.js';
import {
  ToolRegistry,
  ResourceRegistry,
  PromptRegistry,
  type ToolDefinition,
  type ResourceDefinition,
  type PromptDefinition,
  type HandlerContext,
} from './registry.js';

type Registries = {
  tools?: ToolRegistry;
  resources?: ResourceRegistry;
  prompts?: PromptRegistry;
};

export type McpCoreOptions = {
  serverName: string;
  version: string;
  transport: 'stdio' | 'http';
  http?: HttpServerConfig;
  jwksUrl?: string;
  getTenantCtx?: (token: string, claims: JwtClaims) => Promise<TenantContext>;
  registries?: Registries;
  transportFactory?: () => Transport;
};

const defaultTenant: TenantContext = { tenantId: 'public', roles: [] };

export type McpServerInstance = McpServer & {
  shutdown: () => Promise<void>;
};

const getAuthorizationHeader = (headers?: unknown): string | undefined => {
  if (!headers) {
    return undefined;
  }

  const candidate = headers as { get?: (name: string) => string | null };
  if (typeof candidate.get === 'function') {
    return candidate.get('authorization') ?? undefined;
  }

  if (typeof headers === 'object') {
    const entries = Object.entries(headers as Record<string, unknown>);
    for (const [key, value] of entries) {
      if (key.toLowerCase() === 'authorization') {
        if (typeof value === 'string') {
          return value;
        }
        if (Array.isArray(value)) {
          const strValue = value.find(
            (item): item is string => typeof item === 'string',
          );
          if (strValue) {
            return strValue;
          }
        }
      }
    }
  }

  return undefined;
};

const extractBearer = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  const match = /^Bearer\s+(?<token>.+)$/i.exec(value.trim());
  return match?.groups?.token;
};

const resolveToken = (
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
): string | undefined => {
  if (extra.authInfo?.token) {
    return extra.authInfo.token;
  }
  const headerValue = getAuthorizationHeader(extra.requestInfo?.headers);
  if (headerValue) {
    return extractBearer(headerValue);
  }
  const metaAuth = (extra._meta as { authorization?: string } | undefined)
    ?.authorization;
  return extractBearer(metaAuth);
};

const buildHealthTool = (name: string, version: string): ToolDefinition => ({
  name: 'health.check',
  config: {
    description: 'Returns ok and build info',
  },
  handler: async () => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify({ ok: true, server: name, version }),
      },
    ],
  }),
});

export async function createMcpServer(
  options: McpCoreOptions,
): Promise<McpServerInstance> {
  const log = createLogger(options.serverName);

  const mcp = new McpServer(
    {
      name: options.serverName,
      version: options.version,
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {},
      },
    },
  );

  const toolRegistry = options.registries?.tools ?? new ToolRegistry();
  const resourceRegistry =
    options.registries?.resources ?? new ResourceRegistry();
  const promptRegistry = options.registries?.prompts ?? new PromptRegistry();

  toolRegistry.register(buildHealthTool(options.serverName, options.version));

  const resolveTenant = async (
    extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
  ): Promise<TenantContext> => {
    if (!options.jwksUrl) {
      return { ...defaultTenant };
    }

    const token = resolveToken(extra);
    if (!token) {
      throw new Error('Authorization token required');
    }

    const claims = await verifyJwt(token, options.jwksUrl);
    if (options.getTenantCtx) {
      return options.getTenantCtx(token, claims);
    }

    const rolesClaim = claims.roles;
    const roles = Array.isArray(rolesClaim)
      ? rolesClaim.map((role) => String(role))
      : typeof rolesClaim === 'string'
        ? [rolesClaim]
        : [];

    return {
      tenantId: typeof claims.tid === 'string' ? claims.tid : 'unknown',
      roles,
      subject: typeof claims.sub === 'string' ? claims.sub : undefined,
    };
  };

  const buildContext = async (
    extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
  ): Promise<HandlerContext> => {
    const tenant = await resolveTenant(extra).catch((error) => {
      log.error(`Authorization failed: ${(error as Error).message}`);
      throw error;
    });
    return { ...(extra as Record<string, unknown>), tenant } as HandlerContext;
  };

  const registerTool = (definition: ToolDefinition) => {
    mcp.registerTool(
      definition.name,
      definition.config ?? {},
      async (args, extra) => {
        const context = await buildContext(extra);
        await enforcePolicy(definition.policy, context.tenant, args);
        return definition.handler(args, context);
      },
    );
  };

  const registerResource = (definition: ResourceDefinition) => {
    const metadata = definition.metadata ?? {};
    if (typeof definition.uri === 'string') {
      mcp.registerResource(
        definition.name,
        definition.uri,
        metadata,
        async (uri, extra) => {
          const context = await buildContext(extra);
          await enforcePolicy(definition.policy, context.tenant, uri);
          return definition.read(uri, context);
        },
      );
    } else {
      mcp.registerResource(
        definition.name,
        definition.uri,
        metadata,
        async (uri, variables, extra) => {
          const context = await buildContext(extra);
          await enforcePolicy(definition.policy, context.tenant, {
            uri,
            variables,
          });
          return definition.read(uri, context, variables);
        },
      );
    }
  };

  const registerPrompt = (definition: PromptDefinition) => {
    mcp.registerPrompt(
      definition.name,
      definition.config ?? {},
      async (
        args: unknown,
        extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
      ) => {
        const context = await buildContext(extra);
        await enforcePolicy(definition.policy, context.tenant, args);
        return definition.handler(
          args as Record<string, unknown> | undefined,
          context,
        );
      },
    );
  };

  toolRegistry.list().forEach(registerTool);
  resourceRegistry.list().forEach(registerResource);
  promptRegistry.list().forEach(registerPrompt);

  const shutdownHandlers: Array<() => Promise<void>> = [];

  if (options.transport === 'stdio') {
    const transport = options.transportFactory?.() ?? stdioServerTransport();
    await mcp.connect(transport);
    shutdownHandlers.push(async () => {
      await transport.close();
    });
    log.info('MCP stdio server started');
  } else {
    if (!options.http) {
      throw new Error('HTTP transport requires http options');
    }
    const nodeServer = await httpServer(mcp, options.http);
    shutdownHandlers.push(
      () =>
        new Promise<void>((resolve, reject) => {
          nodeServer.close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        }),
    );
    log.info(
      `MCP HTTP server listening on ${options.http.host ?? '0.0.0.0'}:${options.http.port}`,
    );
  }

  shutdownHandlers.push(async () => {
    await mcp.close();
  });

  const instance = mcp as McpServerInstance;
  instance.shutdown = async () => {
    for (const handler of shutdownHandlers.reverse()) {
      await handler();
    }
  };

  return instance;
}
