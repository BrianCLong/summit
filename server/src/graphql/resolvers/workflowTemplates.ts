import { z } from 'zod';
import { getPostgresPool } from '../../db/postgres.js';
import { WorkflowTemplateRepo } from '../../repos/WorkflowTemplateRepo.js';
import type { WorkflowTemplate } from '../../repos/WorkflowTemplateRepo.js';
import { ArgoWorkflowService } from '../../services/workflows/ArgoWorkflowService.ts';
import logger from '../../config/logger.js';

const resolverLogger = logger.child({ name: 'WorkflowTemplateResolvers' });

const TemplateVariableInputZ = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  defaultValue: z.any().optional(),
});

const CreateTemplateInputZ = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  argoTemplate: z.record(z.any()),
  variables: z.array(TemplateVariableInputZ).default([]),
});

const ExecuteTemplateInputZ = z.object({
  templateId: z.string().uuid(),
  tenantId: z.string().optional(),
  variables: z.record(z.any()).optional(),
  runName: z.string().optional(),
});

const ListTemplatesInputZ = z.object({
  tenantId: z.string().min(1),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const repo = new WorkflowTemplateRepo(getPostgresPool());
const argoService = new ArgoWorkflowService({
  baseUrl: process.env.ARGO_WORKFLOWS_URL,
  namespace: process.env.ARGO_WORKFLOWS_NAMESPACE,
  authToken: process.env.ARGO_WORKFLOWS_TOKEN,
});

function resolveTenantId(explicitTenantId: string | undefined, contextTenantId: string | undefined): string {
  const tenantId = explicitTenantId || contextTenantId;
  if (!tenantId) {
    throw new Error('Tenant ID is required');
  }
  return tenantId;
}

function buildVariableMap(template: WorkflowTemplate, inputVariables: Record<string, unknown> = {}): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const variable of template.variables) {
    const provided = inputVariables[variable.name];

    if (provided === undefined) {
      if (variable.defaultValue !== undefined) {
        result[variable.name] = variable.defaultValue;
      } else if (variable.required) {
        throw new Error(`Missing required variable '${variable.name}'`);
      }
    } else {
      result[variable.name] = provided;
    }
  }

  for (const [name, value] of Object.entries(inputVariables)) {
    if (!(name in result)) {
      resolverLogger.debug({ name }, 'Passing through additional workflow variable');
      result[name] = value;
    }
  }

  return result;
}

export const workflowTemplateResolvers = {
  Query: {
    workflowTemplate: async (_: unknown, args: { id: string; tenantId?: string }, context: any) => {
      const tenantId = resolveTenantId(args.tenantId, context.tenantId);
      return repo.getTemplateById(args.id, tenantId);
    },
    workflowTemplates: async (
      _: unknown,
      args: { tenantId: string; limit?: number; offset?: number },
      context: any,
    ) => {
      const parsed = ListTemplatesInputZ.parse({ ...args, limit: args.limit ?? undefined, offset: args.offset ?? undefined });
      const tenantId = resolveTenantId(parsed.tenantId, context.tenantId);
      return repo.listTemplates(tenantId, parsed.limit, parsed.offset);
    },
  },
  Mutation: {
    createWorkflowTemplate: async (_: unknown, args: { input: unknown }, context: any) => {
      const parsed = CreateTemplateInputZ.parse(args.input);
      const tenantId = resolveTenantId(parsed.tenantId, context.tenantId);
      const userId = context.user?.sub || context.user?.id || 'system';

      const template = await repo.createTemplate(
        { ...parsed, tenantId, variables: parsed.variables },
        userId,
      );

      return template;
    },
    executeWorkflowTemplate: async (_: unknown, args: { input: unknown }, context: any) => {
      const parsed = ExecuteTemplateInputZ.parse(args.input);
      const tenantId = resolveTenantId(parsed.tenantId, context.tenantId);
      const template = await repo.getTemplateById(parsed.templateId, tenantId);

      if (!template) {
        throw new Error('Workflow template not found');
      }

      const variables = buildVariableMap(template, parsed.variables || {});
      const submission = await argoService.submitWorkflow(template.argoTemplate, {
        runName: parsed.runName,
        variables,
      });

      return {
        runId: submission.runId,
        status: submission.status,
        submittedAt: submission.submittedAt,
        workflow: submission.workflow,
      };
    },
  },
};

export default workflowTemplateResolvers;
