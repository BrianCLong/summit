import { z } from 'zod';
import type {
  ToolDefinition,
  ResourceDefinition,
  PromptDefinition
} from '../registry.js';
import type { TenantContext } from '../auth.js';

type GraphToolkitDeps = {
  cypher: (tenantId: string, cypher: string, params?: unknown) => Promise<unknown[]>;
  explain?: (cypher: string) => Promise<unknown>;
};

const analystOnly = (tenant: TenantContext): boolean =>
  tenant.roles.includes('analyst') || tenant.roles.includes('admin');

export function graphToolkit(deps: GraphToolkitDeps): {
  tools: ToolDefinition[];
  resources: ResourceDefinition[];
  prompts: PromptDefinition[];
} {
  const queryTool: ToolDefinition = {
    name: 'graph.query',
    config: {
      title: 'Run graph query',
      description: 'Execute a tenant-scoped Cypher query and return the resulting rows.',
      inputSchema: {
        cypher: z.string(),
        params: z.record(z.any()).optional(),
        limit: z.number().int().positive().optional()
      }
    },
    handler: async (rawArgs, context) => {
      const args = (rawArgs ?? {}) as {
        cypher: string;
        params?: unknown;
        limit?: number;
      };
      const tenantId = context.tenant.tenantId ?? 'public';
      const rows = await deps.cypher(tenantId, args.cypher, args.params);
      const limited = args.limit ? rows.slice(0, args.limit) : rows;
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ rows: limited }, null, 2)
          }
        ]
      };
    },
    policy: analystOnly
  };

  const schemaResource: ResourceDefinition = {
    name: 'graph.schema',
    uri: 'resource://graph/schema',
    metadata: {
      title: 'Graph schema',
      description: 'Canonical entity and relationship schema for grounding analytical queries.'
    },
    read: async (uri, _context) => ({
      contents: [
        {
          uri: uri.href,
          text: JSON.stringify(
            {
              entities: ['Person', 'Org', 'Event'],
              edges: ['RELATES_TO']
            },
            null,
            2
          ),
          mimeType: 'application/json'
        }
      ]
    })
  };

  const promptDefinition: PromptDefinition = {
    name: 'graph.nl-to-cypher',
    config: {
      title: 'NL to Cypher',
      description: 'Prompt template that guides safe NL to Cypher translation.',
      argsSchema: {
        question: z.string()
      }
    },
    handler: async (args) => {
      const question = (args?.question as string) ?? '';
      return {
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'You are a graph assistant. Output parameterized, read-only Cypher queries.'
            }
          },
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Question: ${question}\nReturn Cypher and a short rationale.`
            }
          }
        ]
      };
    }
  };

  return {
    tools: [queryTool],
    resources: [schemaResource],
    prompts: [promptDefinition]
  };
}
