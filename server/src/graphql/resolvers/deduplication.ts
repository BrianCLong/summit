import { spawn } from 'child_process';
import path from 'path';
import { randomUUID } from 'crypto';
import { trace, SpanStatusCode, Span } from '@opentelemetry/api';

interface NodeRuleInput {
  label: string;
  matchAttributes: string[];
}

interface RelationshipRuleInput {
  type: string;
  matchAttributes: string[];
}

interface GraphDeduplicationInput {
  nodeRules?: NodeRuleInput[] | null;
  relationshipRules?: RelationshipRuleInput[] | null;
  dryRun?: boolean | null;
  database?: string | null;
  context?: Record<string, unknown> | null;
}

const tracer = trace.getTracer('graph-deduplication');

function formatRules(
  rules: NodeRuleInput[] | RelationshipRuleInput[] | null | undefined,
  key: 'label' | 'type',
) {
  if (!Array.isArray(rules) || rules.length === 0) {
    return [];
  }
  return rules.map((rule) => {
    const values = Array.isArray(rule.matchAttributes)
      ? rule.matchAttributes.filter((value) => typeof value === 'string' && value.trim().length > 0)
      : [];

    if (values.length === 0) {
      throw new Error(`Rule for ${key} '${rule[key]}' must include at least one match attribute`);
    }

    return {
      [key]: rule[key],
      match_attributes: values,
    };
  });
}

function runPythonDeduplication(pythonPath: string, scriptPath: string, payload: Record<string, unknown>, span: Span) {
  return new Promise<any>((resolve, reject) => {
    const child = spawn(pythonPath, [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      const message = data.toString();
      stderr += message;
      span.addEvent('graph.dedup.stderr', { 'graph.dedup.stderr_chunk': message });
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        const errorMessage = stderr || stdout || `Deduplication script exited with code ${code}`;
        reject(new Error(errorMessage.trim()));
        return;
      }

      try {
        const parsed = stdout ? JSON.parse(stdout) : {};
        resolve(parsed);
      } catch (error) {
        reject(new Error(`Failed to parse deduplication response: ${(error as Error).message}`));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

export const graphDeduplicationResolvers = {
  Mutation: {
    async runGraphDeduplication(_: unknown, args: { input: GraphDeduplicationInput }, ctx: any) {
      const pythonExecutable = process.env.PYTHON_PATH || 'python3';
      const scriptPath = path.join(process.cwd(), 'server', 'python', 'graph_deduplication.py');
      const input = args?.input || {};
      const dryRun = Boolean(input.dryRun);
      const operationId = randomUUID();

      const span = tracer.startSpan('graph.runGraphDeduplication', {
        attributes: {
          'graph.dedup.operation_id': operationId,
          'graph.dedup.dry_run': dryRun,
          'graph.dedup.triggered_by': ctx?.user?.id ?? 'anonymous',
          'graph.dedup.tenant': ctx?.user?.tenantId ?? ctx?.tenantId ?? 'unknown',
        },
      });

      try {
        const nodeRules = formatRules(input.nodeRules, 'label');
        const relationshipRules = formatRules(input.relationshipRules, 'type');

        if (nodeRules.length === 0 && relationshipRules.length === 0) {
          throw new Error('At least one deduplication rule must be provided');
        }

        const payload: Record<string, unknown> = {
          operation_id: operationId,
          dry_run: dryRun,
          node_rules: nodeRules,
          relationship_rules: relationshipRules,
        };

        if (input.database) {
          payload.database = input.database;
        }

        const contextData: Record<string, unknown> = {
          triggered_by: ctx?.user?.id,
          tenant_id: ctx?.user?.tenantId ?? ctx?.tenantId,
          request_id: ctx?.req?.id,
        };

        if (input.context && typeof input.context === 'object') {
          Object.assign(contextData, input.context);
        }

        payload.context = contextData;

        const result = await runPythonDeduplication(pythonExecutable, scriptPath, payload, span);

        const nodeSummary = result?.node_summary ?? {};
        const relationshipSummary = result?.relationship_summary ?? {};
        const mergedNodes = nodeSummary?.merged ?? 0;
        const mergedRelationships = relationshipSummary?.merged ?? 0;

        span.setAttribute('graph.dedup.nodes.merged', mergedNodes);
        span.setAttribute('graph.dedup.relationships.merged', mergedRelationships);
        span.setAttribute('graph.dedup.node_groups', nodeSummary?.total_groups ?? 0);
        span.setAttribute('graph.dedup.relationship_groups', relationshipSummary?.total_groups ?? 0);

        const logs = Array.isArray(result?.logs) ? result.logs : [];
        logs.slice(0, 5).forEach((entry: string, index: number) => {
          span.addEvent('graph.dedup.log', { 'log.index': index, 'log.message': entry });
        });

        span.addEvent('graph.dedup.completed', {
          'graph.dedup.operation_id': result?.operation_id ?? operationId,
          'graph.dedup.merged_nodes': mergedNodes,
          'graph.dedup.merged_relationships': mergedRelationships,
        });

        return {
          operationId: result?.operation_id ?? operationId,
          dryRun: Boolean(result?.dry_run ?? dryRun),
          startedAt: result?.started_at ?? new Date().toISOString(),
          completedAt: result?.completed_at ?? new Date().toISOString(),
          mergedNodes,
          mergedRelationships,
          nodeSummary,
          relationshipSummary,
          logs,
        };
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    },
  },
};
