import { IntelGraphClient } from '../intelgraph/client.js';
import { Task, Run, Artifact, TaskStatus } from './types.js';
import { CostMeter } from './cost_meter.js';
import { OpenAILLM } from './adapters/llm_openai.js';
import { ResidencyGuard } from '../data-residency/residency-guard.js';
import { AgentGovernanceService } from './governance-service.js';
import logger from '../utils/logger.js';
import { metrics } from '../monitoring/metrics.js';
import {
  buildBudgetEvidence,
  normalizeReasoningBudget,
  type ReasoningBudgetContract,
} from './budget.js';
import { mcpRegistry, mcpClient } from '../conductor/mcp/client.js';


export interface MaestroConfig {
  defaultPlannerAgent: string;   // e.g. "openai:gpt-4.1"
  defaultActionAgent: string;
}

export interface MaestroRunOptions {
  tenantId?: string;
  reasoningBudget?: Partial<ReasoningBudgetContract>;
}

export class Maestro {
  constructor(
    public ig: IntelGraphClient,
    private costMeter: CostMeter,
    private llm: OpenAILLM,
    private config: MaestroConfig,
  ) { }

  async getTask(taskId: string): Promise<Task | null> {
    return this.ig.getTask(taskId);
  }

  async createRun(
    userId: string,
    requestText: string,
    options?: MaestroRunOptions,
  ): Promise<Run> {
    const reasoningBudget = normalizeReasoningBudget(
      options?.reasoningBudget,
    );
    const run: Run = {
      id: crypto.randomUUID(),
      user: { id: userId },
      createdAt: new Date().toISOString(),
      requestText,
      // Pass tenant context if available (will need DB schema update for full persistence)
      ...(options?.tenantId ? { tenantId: options.tenantId } : {}),
      reasoningBudget,
    } as Run;
    await this.ig.createRun(run);
    return run;
  }

  async planRequest(run: Run): Promise<Task[]> {
    // Here you can do something simple at first: single action task
    const tenantId = (run as any).tenantId;

    const planTask: Task = {
      id: crypto.randomUUID(),
      runId: run.id,
      tenantId: run.tenantId,
      status: 'succeeded',        // planning is instant for v0.1
      agent: {
        id: this.config.defaultPlannerAgent,
        name: 'planner',
        kind: 'llm',
        modelId: this.config.defaultPlannerAgent,
      },
      kind: 'plan',
      description: `Plan for: ${run.requestText}`,
      input: { requestText: run.requestText, tenantId },
      output: { steps: ['single_action'] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const actionTask: Task = {
      id: crypto.randomUUID(),
      runId: run.id,
      tenantId: run.tenantId,
      parentTaskId: planTask.id,
      status: 'queued',
      agent: {
        id: this.config.defaultActionAgent,
        name: 'action-llm',
        kind: 'llm',
        modelId: this.config.defaultActionAgent,
      },
      kind: 'action',
      description: `Execute user request: ${run.requestText}`,
      input: { requestText: run.requestText, tenantId },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.ig.createTask(planTask);
    await this.ig.createTask(actionTask);

    return [planTask, actionTask];
  }

  async executeTask(task: Task): Promise<{ task: Task; artifact: Artifact | null }> {
    const now = new Date().toISOString();
    const timer = metrics.maestroJobExecutionDurationSeconds.startTimer({ job_type: task.kind, status: 'success' });
    await this.ig.updateTask(task.id, { status: 'running', updatedAt: now });

    try {
      // Residency Check for Agent Execution
      // We assume run or task input has tenantId.
      // If run object isn't passed here, we rely on task input.
      // Or we should fetch the Run. For v0.1 simplification, we assume context is in task inputs
      // or we extract it from runId lookup (not efficient here without caching).
      // Assuming tasks created by createRun have tenantId in their metadata/input if provided.
      const tenantId = (task.input as any)?.tenantId;

      if (tenantId) {
        const guard = ResidencyGuard.getInstance();
        await guard.validateAgentExecution(tenantId);

        // === GLOBAL STEERING CHECK (Task #96) ===
        const { maestroGlobalAgent } = await import('./agents/MaestroGlobalAgent.js');
        const steeringResult = await maestroGlobalAgent.evaluateRouting(task);

        if (steeringResult.action === 'STOP') {
          const errorMsg = `Task execution forced STOP by Global Steering: ${steeringResult.reason}`;
          logger.error({ taskId: task.id, reason: steeringResult.reason }, 'Maestro Steering: Execution stopped');
          await this.ig.updateTask(task.id, { status: 'failed', errorMessage: errorMsg, updatedAt: now });
          throw new Error(errorMsg);
        }

        if (steeringResult.action === 'REDIRECT') {
          const { maestroHandoffService } = await import('./handoff-service.js');
          const handoff = await maestroHandoffService.initiateHandoff(task, steeringResult.advice!);

          if (handoff.success) {
            const msg = `Task handed off to region ${steeringResult.advice}: ${handoff.message}`;
            await this.ig.updateTask(task.id, {
              status: 'succeeded', // In handoff scenario, local task is 'done' once handed off
              output: { result: msg, handoffId: handoff.handoffId },
              updatedAt: now
            });

            return {
              task: { ...task, status: 'succeeded', output: { result: msg } } as Task,
              artifact: null
            };
          }
        }

        // === SHADOW TRAFFIC INTEGRATION (Task #101) ===
        if (!(task.input as any)?._isShadow) {
          // ... (existing shadow logic)
        }

        // === DEEPFAKE DETECTION (Phase 4) ===
        const mediaUri = (task.input as any)?.mediaUri || (task.input as any)?.uri;
        const mediaType = (task.input as any)?.mediaType;
        if (mediaUri && mediaType) {
          const { DeepfakeDetectionService } = await import('../services/DeepfakeDetectionService.js');
          const deepfakeService = new DeepfakeDetectionService();
          const analysis = await deepfakeService.analyze(mediaUri, mediaType, tenantId);

          if (analysis.isDeepfake && analysis.riskScore > 80) {
            const errorMsg = `Security Alert: High-risk deepfake detected in task input. ` +
              `Risk score: ${analysis.riskScore}. Markers: ${analysis.markers.join(', ')}. ` +
              `Details: ${analysis.details}`;

            logger.error({ taskId: task.id, analysis }, 'Deepfake detection blocked task execution');
            await this.ig.updateTask(task.id, { status: 'failed', errorMessage: errorMsg, updatedAt: now });
            throw new Error(errorMsg);
          }

          if (analysis.isDeepfake) {
            logger.warn({ taskId: task.id, analysis }, 'Deepfake detected but risk score below threshold. Proceeding with caution.');
            // Attach analysis to task output or metadata for downstream visibility
            task.output = { ...task.output, deepfakeAnalysis: analysis };
          }
        }
      }

      // === GOVERNANCE CHECK (Story 1.1) ===
      // Check agent governance policies before execution
      const governanceService = AgentGovernanceService.getInstance();
      const maestroAgent = {
        id: task.agent.id,
        name: task.agent.name,
        tenantId: tenantId || 'system',
        capabilities: [], // Could be extracted from agent metadata
        metadata: {
          modelId: task.agent.modelId,
          kind: task.agent.kind
        },
        status: 'idle' as const,
        health: {
          cpuUsage: 0,
          memoryUsage: 0,
          lastHeartbeat: new Date(),
          activeTasks: 1,
          errorRate: 0
        },
        templateId: task.agent.kind,
        config: {}
      };

      const governanceDecision = await governanceService.evaluateAction(
        maestroAgent,
        task.kind, // action type: 'plan', 'action', 'subworkflow', 'graph.analysis'
        {
          taskId: task.id,
          runId: task.runId,
          description: task.description,
          input: task.input,
          tenantId
        },
        {
          source: 'maestro_core_executeTask',
          timestamp: now
        }
      );

      // If governance check fails, fail the task
      if (!governanceDecision.allowed) {
        const errorMessage = `Governance policy violation: ${governanceDecision.reason}. ` +
          `Risk score: ${governanceDecision.riskScore.toFixed(2)}. ` +
          `Violations: ${governanceDecision.violations?.map(v => v.violationType).join(', ') || 'none'}`;

        logger.error({
          taskId: task.id,
          runId: task.runId,
          agentId: task.agent.id,
          decision: governanceDecision
        }, 'Task blocked by governance policy');

        await this.ig.updateTask(task.id, {
          status: 'failed',
          errorMessage,
          updatedAt: now
        });

        throw new Error(errorMessage);
      }

      // If requires approval, set task to pending_approval state (Story 1.3)
      if (governanceDecision.requiredApprovals && governanceDecision.requiredApprovals > 0) {
        logger.warn({
          taskId: task.id,
          runId: task.runId,
          agentId: task.agent.id,
          requiredApprovals: governanceDecision.requiredApprovals,
          riskScore: governanceDecision.riskScore
        }, 'Task requires human approval');

        await this.ig.updateTask(task.id, {
          status: 'pending_approval',
          errorMessage: `Awaiting ${governanceDecision.requiredApprovals} approval(s). Risk score: ${governanceDecision.riskScore.toFixed(2)}`,
          updatedAt: now
        });

        // === HITL INTEGRATION (Task #102) ===
        try {
          const { createApproval } = await import('../services/approvals.js');
          await createApproval({
            requesterId: task.agent.id,
            action: 'maestro_task_execution',
            payload: { taskId: task.id, taskKind: task.kind, riskScore: governanceDecision.riskScore },
            reason: `Governance policy flagged for review. Risk: ${governanceDecision.riskScore.toFixed(2)}. ${governanceDecision.reason}`,
            runId: task.runId
          });
        } catch (approvalError) {
          logger.error({ taskId: task.id, error: (approvalError as Error).message }, 'Maestro: Failed to create approval record');
        }

        // Return task in pending_approval state - execution halts here
        return {
          task: {
            ...task,
            status: 'pending_approval' as TaskStatus,
            errorMessage: `Awaiting ${governanceDecision.requiredApprovals} approval(s)`,
            updatedAt: now
          },
          artifact: null
        };
      }

      logger.info({
        taskId: task.id,
        runId: task.runId,
        agentId: task.agent.id,
        riskScore: governanceDecision.riskScore
      }, 'Task passed governance checks, proceeding with execution');
      // === END GOVERNANCE CHECK ===

      // === NARRATIVE IMPACT PREDICTION (Story 3.2) ===
      if (task.kind === 'action' && tenantId) {
        try {
          const { Neo4jNarrativeLoader } = await import('../narrative/adapters/neo4j-loader.js');
          const { narrativeSimulationManager } = await import('../narrative/manager.js');

          const rootId = (task.input as any)?.rootId || (task.input as any)?.targetId;
          if (rootId) {
            const initialEntities = await Neo4jNarrativeLoader.loadFromGraph(rootId, 2);

            if (initialEntities.length > 0) {
              const sim = narrativeSimulationManager.createSimulation({
                name: `Impact Prediction: ${task.id}`,
                themes: ['Security', 'Trust'],
                initialEntities,
                metadata: { taskId: task.id, isShadow: true }
              });

              narrativeSimulationManager.injectActorAction(sim.id, task.agent.id, task.description);
              const predictedState = await narrativeSimulationManager.tick(sim.id, 5);

              task.output = {
                ...task.output,
                impactForecast: {
                  summary: predictedState.narrative.summary,
                  arcs: predictedState.arcs.map(arc => ({ theme: arc.theme, momentum: arc.momentum, outlook: arc.outlook }))
                }
              };
              narrativeSimulationManager.remove(sim.id);
            }
          }
        } catch (simError) {
          logger.warn({ taskId: task.id, error: (simError as Error).message }, 'Maestro: Narrative impact prediction failed (non-blocking)');
        }
      }

      let result: string = '';

      if (task.agent.kind === 'llm') {
        metrics.maestroAiModelRequests.inc({ model: task.agent.modelId, operation: 'executeTask', status: 'attempt' });
        let attempts = 0;
        const maxRetries = 3;
        let lastError: any;

        while (attempts < maxRetries) {
          const controller = new AbortController();
          const signal = controller.signal;
          let timeoutId: NodeJS.Timeout;

          try {
            const timeout = new Promise<never>((_, reject) => {
              timeoutId = setTimeout(() => {
                controller.abort();
                reject(new Error('LLM execution timed out'));
              }, 60000);
            });

            const llmCall = this.llm.callCompletion(
              task.runId,
              task.id,
              {
                model: task.agent.modelId!,
                messages: [
                  { role: 'system', content: 'You are an execution agent.' },
                  { role: 'user', content: task.description },
                  ...(task.input.requestText
                    ? [{ role: 'user', content: String(task.input.requestText) }]
                    : []),
                ],
                tools: mcpRegistry.listServers().flatMap(s => {
                  const srv = mcpRegistry.getServer(s);
                  return srv?.tools.map(t => ({
                    type: 'function',
                    function: {
                      name: t.name,
                      description: t.description,
                      parameters: t.schema
                    }
                  })) || [];
                })
              },
              {
                feature: `maestro_${task.kind}`,
                tenantId: typeof task.input?.tenantId === 'string' ? task.input.tenantId : undefined,
                environment: process.env.NODE_ENV || 'unknown',
                // @ts-ignore
                signal: signal
              },
            );

            const llmResult = (await Promise.race([llmCall, timeout])) as any;
            clearTimeout(timeoutId!);

            if (llmResult.tool_calls && llmResult.tool_calls.length > 0) {
              const toolLogs: string[] = [];
              const toolOutputs: any[] = [];

              for (const call of llmResult.tool_calls) {
                const { name, arguments: argsJson } = call.function;
                const args = JSON.parse(argsJson);

                // Find server for tool
                const servers = mcpRegistry.findServersWithTool(name);
                if (servers.length > 0) {
                  const toolResult = await mcpClient.executeTool(servers[0], name, args);
                  toolOutputs.push({ tool: name, result: toolResult });
                  toolLogs.push(`Executed tool ${name}`);
                }
              }

              result = JSON.stringify({
                explanation: llmResult.content,
                tool_results: toolOutputs
              });
              task.output = { ...task.output, logs: [...(task.output?.logs || []), ...toolLogs] };
            } else {
              result = llmResult.content;
            }
            break;
          } catch (err: any) {
            clearTimeout(timeoutId!);
            lastError = err;
            attempts++;
            if (!signal.aborted) controller.abort();
            if (attempts >= maxRetries) break;
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
          }
        }
        if (!result && lastError) throw lastError;
      } else {
        result = 'TODO: implement non-LLM agent';
      }

      const artifact: Artifact = {
        id: crypto.randomUUID(),
        runId: task.runId,
        taskId: task.id,
        tenantId: task.tenantId,
        kind: 'text',
        label: 'task-output',
        data: result,
        createdAt: new Date().toISOString(),
      };

      const updatedTask: Partial<Task> = {
        status: 'succeeded',
        output: { ...task.output, result },
        updatedAt: new Date().toISOString(),
      };

      await this.ig.createArtifact(artifact);
      await this.ig.updateTask(task.id, updatedTask);

      timer();
      return {
        task: { ...task, ...updatedTask } as Task,
        artifact,
      };
    } catch (err: any) {
      const updatedTask: Partial<Task> = {
        status: 'failed',
        errorMessage: err?.message ?? String(err),
        updatedAt: new Date().toISOString(),
      };
      await this.ig.updateTask(task.id, updatedTask);

      metrics.maestroAiModelErrors.inc({ model: task.agent.modelId || 'unknown' });
      timer({ status: 'failed' });
      return { task: { ...task, ...updatedTask } as Task, artifact: null };
    }
  }

  async runPipeline(
    userId: string,
    requestText: string,
    options?: MaestroRunOptions,
  ) {
    const end = metrics.maestroOrchestrationDuration.startTimer({ endpoint: 'runPipeline' });
    metrics.maestroOrchestrationRequests.inc({ method: 'runPipeline', endpoint: 'runPipeline', status: 'started' });
    metrics.maestroActiveSessions.inc({ type: 'pipeline' });
    const startTime = Date.now();

    try {
      const run = await this.createRun(userId, requestText, options);
      const tasks = await this.planRequest(run);

      const executable = tasks.filter(t => t.status === 'queued');

      const results = await Promise.all(
        executable.map(task => this.executeTask(task))
      );

      const costSummary = await this.costMeter.summarize(run.id);

      const budgetEvidence = buildBudgetEvidence(run.reasoningBudget!, {
        success: results.every((result) => result.task.status === 'succeeded'),
        latencyMs: Date.now() - startTime,
        totalCostUSD: costSummary.totalCostUSD,
        totalInputTokens: costSummary.totalInputTokens,
        totalOutputTokens: costSummary.totalOutputTokens,
      });
      await this.ig.updateRun(run.id, {
        reasoningBudgetEvidence: budgetEvidence,
      });

      end();
      metrics.maestroOrchestrationRequests.inc({ method: 'runPipeline', endpoint: 'runPipeline', status: 'success' });
      return {
        run,
        tasks: tasks.map(t => ({
          id: t.id,
          status: t.status,
          description: t.description,
        })),
        results,
        costSummary,
      };
    } catch (error) {
      metrics.maestroOrchestrationErrors.inc({ error_type: 'pipeline_error', endpoint: 'runPipeline' });
      metrics.maestroOrchestrationRequests.inc({ method: 'runPipeline', endpoint: 'runPipeline', status: 'error' });
      throw error;
    } finally {
      metrics.maestroActiveSessions.dec({ type: 'pipeline' });
    }
  }
}
