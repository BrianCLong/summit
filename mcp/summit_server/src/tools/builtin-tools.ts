import { z } from 'zod';
import type {
  EvidenceBundle,
  ToolDefinition,
  ToolExecutionContext,
  ToolIndexEntry,
  ToolSchema,
} from '../types.js';
import type { EvidenceStore } from '../evidence/evidence-store.js';
import type { SkillsRegistry } from '../skills/skills-registry.js';
import { hashJson } from '../utils/hash.js';

const limitedString = (max: number) => z.string().min(1).max(max);

type BuiltinToolDeps = {
  getToolIndex: () => ToolIndexEntry[];
  getToolSchema: (toolId: string) => ToolSchema<any, any>;
  skillsRegistry: SkillsRegistry;
  evidenceStore: EvidenceStore;
};

export const createBuiltinTools = (
  deps: BuiltinToolDeps,
): ToolDefinition<any, any>[] => {
  const listCapabilities: ToolDefinition<
    z.ZodTypeAny,
    {
      tools: ToolIndexEntry[];
      skills: ReturnType<SkillsRegistry['list']>;
    }
  > = {
    schema: {
      id: 'list_capabilities',
      name: 'List capabilities',
      description: 'Return lightweight capability and skill indexes.',
      tags: ['capabilities', 'discovery'],
      riskTier: 'low',
      requiredScopes: [],
      costHint: 'low',
      version: 'v1',
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({
        tools: z.array(z.any()),
        skills: z.array(z.any()),
      }),
      inputJsonSchema: { type: 'object', properties: {}, additionalProperties: false },
      outputJsonSchema: {
        type: 'object',
        properties: {
          tools: { type: 'array', items: { type: 'object' } },
          skills: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    handler: () => ({
      tools: deps.getToolIndex(),
      skills: deps.skillsRegistry.list(),
    }),
  };

  const getToolSchema: ToolDefinition<
    z.ZodTypeAny,
    { schema: ToolSchema<any, any>; schemaHash: string }
  > = {
    schema: {
      id: 'get_tool_schema',
      name: 'Get tool schema',
      description: 'Return full tool schema on-demand.',
      tags: ['capabilities', 'schema'],
      riskTier: 'low',
      requiredScopes: [],
      costHint: 'low',
      version: 'v1',
      inputSchema: z.object({ tool_id: limitedString(80) }).strict(),
      outputSchema: z.object({
        schema: z.any(),
        schemaHash: z.string(),
      }),
      inputJsonSchema: {
        type: 'object',
        properties: { tool_id: { type: 'string', maxLength: 80 } },
        required: ['tool_id'],
        additionalProperties: false,
      },
      outputJsonSchema: {
        type: 'object',
        properties: {
          schema: { type: 'object' },
          schemaHash: { type: 'string' },
        },
      },
    },
    handler: (input) => {
      const schema = deps.getToolSchema(input.tool_id);
      return {
        schema,
        schemaHash: hashJson({
          id: schema.id,
          version: schema.version,
          input: schema.inputJsonSchema,
          output: schema.outputJsonSchema,
        }),
      };
    },
  };

  const getSkillToc: ToolDefinition<
    z.ZodTypeAny,
    { skill: ReturnType<SkillsRegistry['list']>[number] }
  > = {
    schema: {
      id: 'get_skill_toc',
      name: 'Get skill TOC',
      description: 'Return TOC for a skill module.',
      tags: ['skills'],
      riskTier: 'low',
      requiredScopes: [],
      costHint: 'low',
      version: 'v1',
      inputSchema: z.object({ skill_id: limitedString(80) }).strict(),
      outputSchema: z.object({ skill: z.any() }),
      inputJsonSchema: {
        type: 'object',
        properties: { skill_id: { type: 'string', maxLength: 80 } },
        required: ['skill_id'],
        additionalProperties: false,
      },
      outputJsonSchema: {
        type: 'object',
        properties: { skill: { type: 'object' } },
      },
    },
    handler: (input) => ({
      skill: deps.skillsRegistry.getSkill(input.skill_id),
    }),
  };

  const getSkillSection: ToolDefinition<
    z.ZodTypeAny,
    { section: string }
  > = {
    schema: {
      id: 'get_skill_section',
      name: 'Get skill section',
      description: 'Return a specific section from a skill module.',
      tags: ['skills'],
      riskTier: 'low',
      requiredScopes: [],
      costHint: 'low',
      version: 'v1',
      inputSchema: z
        .object({
          skill_id: limitedString(80),
          section: limitedString(80),
        })
        .strict(),
      outputSchema: z.object({ section: z.string() }),
      inputJsonSchema: {
        type: 'object',
        properties: {
          skill_id: { type: 'string', maxLength: 80 },
          section: { type: 'string', maxLength: 80 },
        },
        required: ['skill_id', 'section'],
        additionalProperties: false,
      },
      outputJsonSchema: {
        type: 'object',
        properties: { section: { type: 'string' } },
      },
    },
    handler: async (input) => ({
      section: await deps.skillsRegistry.getSkillSection(
        input.skill_id,
        input.section,
      ),
    }),
  };

  const runQueryReadonly: ToolDefinition<
    z.ZodTypeAny,
    { rows: { id: string; label: string; score: number }[] }
  > = {
    schema: {
      id: 'run_query_readonly',
      name: 'Run readonly query',
      description: 'Execute a safe, mocked read query path.',
      tags: ['query', 'readonly'],
      riskTier: 'medium',
      requiredScopes: ['mcp:query:readonly'],
      costHint: 'medium',
      version: 'v1',
      aliases: ['query.readonly'],
      inputSchema: z
        .object({
          query: limitedString(256),
          limit: z.number().int().min(1).max(50).default(10),
        })
        .strict(),
      outputSchema: z.object({
        rows: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            score: z.number(),
          }),
        ),
      }),
      inputJsonSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', maxLength: 256 },
          limit: { type: 'integer', minimum: 1, maximum: 50 },
        },
        required: ['query'],
        additionalProperties: false,
      },
      outputJsonSchema: {
        type: 'object',
        properties: {
          rows: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                score: { type: 'number' },
              },
              required: ['id', 'label', 'score'],
            },
          },
        },
      },
    },
    handler: (input: { query: string; limit: number }) => ({
      rows: Array.from({ length: input.limit }).map((_, index) => ({
        id: `row-${index + 1}`,
        label: `Result for ${input.query}`,
        score: Number((1 - index / input.limit).toFixed(2)),
      })),
    }),
  };

  const exportEvidence: ToolDefinition<
    z.ZodTypeAny,
    { bundle: EvidenceBundle }
  > = {
    schema: {
      id: 'export_evidence',
      name: 'Export evidence bundle',
      description: 'Export the audit evidence bundle for a session.',
      tags: ['evidence', 'audit'],
      riskTier: 'medium',
      requiredScopes: ['mcp:evidence:read'],
      costHint: 'medium',
      version: 'v1',
      inputSchema: z.object({ session_id: limitedString(64) }).strict(),
      outputSchema: z.object({ bundle: z.any() }),
      inputJsonSchema: {
        type: 'object',
        properties: { session_id: { type: 'string', maxLength: 64 } },
        required: ['session_id'],
        additionalProperties: false,
      },
      outputJsonSchema: {
        type: 'object',
        properties: { bundle: { type: 'object' } },
      },
    },
    handler: (input, context: ToolExecutionContext) => ({
      bundle: deps.evidenceStore.exportBundle(
        input.session_id ?? context.sessionId,
      ),
    }),
  };

  return [
    listCapabilities,
    getToolSchema,
    getSkillToc,
    getSkillSection,
    runQueryReadonly,
    exportEvidence,
  ];
};
