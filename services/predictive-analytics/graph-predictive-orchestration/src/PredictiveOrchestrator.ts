/**
 * Predictive Orchestrator - Core Engine
 * Drives automated workflows from graph-embedded predictions
 */

import { PredictionBinder, Binding } from './algorithms/PredictionBinder.js';
import { FlowTrigger, TriggerResult } from './algorithms/FlowTrigger.js';
import { PathwayRewirer, RewireResult } from './algorithms/PathwayRewirer.js';
import { DecisionExecutor, ExecutionResult } from './algorithms/DecisionExecutor.js';
import { PredictionBinding } from './models/PredictionBinding.js';
import { DecisionFlow, FlowStatus } from './models/DecisionFlow.js';
import { OperationalPathway } from './models/OperationalPathway.js';

export interface OrchestratorConfig {
  autoTriggerEnabled: boolean;
  maxConcurrentFlows: number;
  defaultTimeout: number;
  rewireThreshold: number;
}

export interface OrchestrationStatus {
  activeFlows: number;
  pendingTriggers: number;
  totalBindings: number;
  lastActivity: Date;
}

export class PredictiveOrchestrator {
  private binder: PredictionBinder;
  private trigger: FlowTrigger;
  private rewirer: PathwayRewirer;
  private executor: DecisionExecutor;

  private bindings: Map<string, PredictionBinding> = new Map();
  private flows: Map<string, DecisionFlow> = new Map();
  private pathways: Map<string, OperationalPathway> = new Map();

  private config: OrchestratorConfig;

  constructor(config?: Partial<OrchestratorConfig>) {
    this.config = {
      autoTriggerEnabled: true,
      maxConcurrentFlows: 10,
      defaultTimeout: 30000,
      rewireThreshold: 0.7,
      ...config,
    };

    this.binder = new PredictionBinder();
    this.trigger = new FlowTrigger();
    this.rewirer = new PathwayRewirer(this.config.rewireThreshold);
    this.executor = new DecisionExecutor(this.config.defaultTimeout);
  }

  // Binding Management
  bindPrediction(
    nodeId: string,
    predictionId: string,
    predictionValue: unknown,
    confidence: number,
  ): PredictionBinding {
    const binding = this.binder.bind({
      nodeId,
      predictionId,
      predictionValue,
      confidence,
      boundAt: new Date(),
    });

    this.bindings.set(binding.id, binding);

    // Check if binding should trigger a flow
    if (this.config.autoTriggerEnabled) {
      this.checkTriggers(binding);
    }

    return binding;
  }

  unbindPrediction(bindingId: string): boolean {
    return this.bindings.delete(bindingId);
  }

  getBinding(bindingId: string): PredictionBinding | undefined {
    return this.bindings.get(bindingId);
  }

  getBindingsForNode(nodeId: string): PredictionBinding[] {
    return [...this.bindings.values()].filter((b) => b.nodeId === nodeId);
  }

  // Flow Management
  createFlow(
    name: string,
    triggerCondition: string,
    actions: string[],
  ): DecisionFlow {
    const flow: DecisionFlow = {
      id: crypto.randomUUID(),
      name,
      triggerCondition,
      actions,
      status: FlowStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.flows.set(flow.id, flow);
    return flow;
  }

  async executeFlow(flowId: string): Promise<ExecutionResult> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    // Check concurrent flow limit
    const activeCount = [...this.flows.values()].filter(
      (f) => f.status === FlowStatus.RUNNING,
    ).length;

    if (activeCount >= this.config.maxConcurrentFlows) {
      throw new Error('Maximum concurrent flows reached');
    }

    // Update flow status
    flow.status = FlowStatus.RUNNING;
    flow.startedAt = new Date();
    this.flows.set(flow.id, flow);

    try {
      const result = await this.executor.execute(flow);

      flow.status = result.success ? FlowStatus.COMPLETED : FlowStatus.FAILED;
      flow.completedAt = new Date();
      flow.result = result;
      this.flows.set(flow.id, flow);

      return result;
    } catch (error) {
      flow.status = FlowStatus.FAILED;
      flow.completedAt = new Date();
      flow.error = error instanceof Error ? error.message : 'Unknown error';
      this.flows.set(flow.id, flow);
      throw error;
    }
  }

  getFlow(flowId: string): DecisionFlow | undefined {
    return this.flows.get(flowId);
  }

  getActiveFlows(): DecisionFlow[] {
    return [...this.flows.values()].filter(
      (f) => f.status === FlowStatus.RUNNING,
    );
  }

  // Pathway Management
  createPathway(
    name: string,
    nodes: string[],
    transitions: Array<{ from: string; to: string; condition: string }>,
  ): OperationalPathway {
    const pathway: OperationalPathway = {
      id: crypto.randomUUID(),
      name,
      nodes,
      transitions,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.pathways.set(pathway.id, pathway);
    return pathway;
  }

  async rewirePathway(
    pathwayId: string,
    reason: string,
  ): Promise<RewireResult> {
    const pathway = this.pathways.get(pathwayId);
    if (!pathway) {
      throw new Error(`Pathway not found: ${pathwayId}`);
    }

    // Gather relevant bindings for pathway nodes
    const relevantBindings = pathway.nodes.flatMap((nodeId) =>
      this.getBindingsForNode(nodeId),
    );

    const result = await this.rewirer.rewire(pathway, relevantBindings, reason);

    if (result.success && result.newPathway) {
      this.pathways.set(pathway.id, result.newPathway);
    }

    return result;
  }

  getPathway(pathwayId: string): OperationalPathway | undefined {
    return this.pathways.get(pathwayId);
  }

  getAllPathways(): OperationalPathway[] {
    return [...this.pathways.values()];
  }

  // Trigger Management
  private async checkTriggers(binding: PredictionBinding): Promise<void> {
    for (const flow of this.flows.values()) {
      if (flow.status !== FlowStatus.PENDING) continue;

      const shouldTrigger = await this.trigger.evaluate(
        flow.triggerCondition,
        binding,
        this.bindings,
      );

      if (shouldTrigger) {
        // Queue flow for execution
        this.executeFlow(flow.id).catch((err) => {
          console.error(`Flow execution failed: ${flow.id}`, err);
        });
      }
    }
  }

  evaluateTriggers(): TriggerResult[] {
    const results: TriggerResult[] = [];

    for (const flow of this.flows.values()) {
      if (flow.status !== FlowStatus.PENDING) continue;

      results.push({
        flowId: flow.id,
        flowName: flow.name,
        condition: flow.triggerCondition,
        wouldTrigger: false, // Would need to evaluate condition
        relevantBindings: [],
      });
    }

    return results;
  }

  // Status
  getStatus(): OrchestrationStatus {
    return {
      activeFlows: this.getActiveFlows().length,
      pendingTriggers: [...this.flows.values()].filter(
        (f) => f.status === FlowStatus.PENDING,
      ).length,
      totalBindings: this.bindings.size,
      lastActivity: new Date(),
    };
  }

  // Cleanup
  cleanup(): void {
    // Remove completed flows older than 1 hour
    const oneHourAgo = Date.now() - 3600000;

    for (const [id, flow] of this.flows) {
      if (
        (flow.status === FlowStatus.COMPLETED || flow.status === FlowStatus.FAILED) &&
        flow.completedAt &&
        flow.completedAt.getTime() < oneHourAgo
      ) {
        this.flows.delete(id);
      }
    }

    // Remove stale bindings
    for (const [id, binding] of this.bindings) {
      if (binding.expiresAt && binding.expiresAt.getTime() < Date.now()) {
        this.bindings.delete(id);
      }
    }
  }
}

export function createOrchestrator(
  config?: Partial<OrchestratorConfig>,
): PredictiveOrchestrator {
  return new PredictiveOrchestrator(config);
}
