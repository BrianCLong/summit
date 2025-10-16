import { z } from 'zod';
import type { ToolDefinition } from '../registry.js';
import type { TenantContext } from '../auth.js';

const operatorOnly = (tenant: TenantContext): boolean =>
  tenant.roles.includes('operator') || tenant.roles.includes('admin');

type OrchestratorDeps = {
  runJob: (
    tenantId: string,
    jobId: string,
    params?: unknown,
  ) => Promise<{ runId: string }>;
  jobStatus: (tenantId: string, runId: string) => Promise<{ status: string }>;
};

export function orchestratorToolkit(deps: OrchestratorDeps): {
  tools: ToolDefinition[];
} {
  const runTool: ToolDefinition = {
    name: 'orchestrator.run',
    config: {
      title: 'Run Maestro job',
      description: 'Trigger an orchestration job for the current tenant.',
      inputSchema: {
        jobId: z.string(),
        params: z.record(z.any()).optional(),
      },
    },
    handler: async (rawArgs, context) => {
      const args = (rawArgs ?? {}) as { jobId: string; params?: unknown };
      const tenantId = context.tenant.tenantId ?? 'public';
      const result = await deps.runJob(tenantId, args.jobId, args.params);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
      };
    },
    policy: operatorOnly,
  };

  const statusTool: ToolDefinition = {
    name: 'orchestrator.status',
    config: {
      title: 'Check Maestro job status',
      description: 'Fetch the current status of a Maestro job run.',
      inputSchema: {
        runId: z.string(),
      },
    },
    handler: async (rawArgs, context) => {
      const args = (rawArgs ?? {}) as { runId: string };
      const tenantId = context.tenant.tenantId ?? 'public';
      const status = await deps.jobStatus(tenantId, args.runId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(status),
          },
        ],
      };
    },
    policy: operatorOnly,
  };

  return { tools: [runTool, statusTool] };
}
