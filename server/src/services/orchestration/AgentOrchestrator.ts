import logger from "../../utils/logger.js";
import { AgentLifecycleManager } from "./AgentLifecycleManager.js";
import { TaskRouter } from "./TaskRouter.js";
import { ConsensusManager } from "./ConsensusManager.js";
import { PolicyEngine } from "../governance/PolicyEngine.js";
import { AgentTask, AgentMessage } from "./types.js";
import { PersistenceLayer, InMemoryPersistence } from "./persistence.js";
import { IntelGraphIntegration } from "./IntelGraphIntegration.js";
import { traceTask } from "./telemetry.js";
import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import {
  ArchitectureSelector,
  ErrorMetrics,
  OrchestrationArchitecture,
  StepResult,
  TaskSignalFeatures,
} from "./architectureSelector.js";

export class AgentOrchestrator extends EventEmitter {
  private static instance: AgentOrchestrator;

  public lifecycleManager: AgentLifecycleManager;
  public taskRouter: TaskRouter;
  public consensusManager: ConsensusManager;
  public policyEngine: PolicyEngine;
  public persistence: PersistenceLayer;
  public intelGraph: IntelGraphIntegration;
  private readonly architectureSelector: ArchitectureSelector;

  private processInterval: NodeJS.Timeout;

  private constructor() {
    super();
    this.lifecycleManager = AgentLifecycleManager.getInstance();
    this.taskRouter = TaskRouter.getInstance();
    this.consensusManager = ConsensusManager.getInstance();
    this.policyEngine = PolicyEngine.getInstance();
    this.persistence = new InMemoryPersistence(); // Default to InMemory
    this.intelGraph = IntelGraphIntegration.getInstance();
    this.architectureSelector = new ArchitectureSelector();

    // Periodically process queue
    this.processInterval = setInterval(() => this.processQueue(), 5000);
  }

  public shutdown() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
    }
  }

  public static getInstance(): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator();
    }
    return AgentOrchestrator.instance;
  }

  /**
   * Submits a high-level task to the orchestration layer.
   */
  public async submitTask(
    taskDef: Omit<AgentTask, "id" | "status" | "createdAt" | "dependencies">
  ): Promise<string> {
    return traceTask("submitTask", async () => {
      // 1. Policy Check
      const policyResult = await this.policyEngine.evaluate("submit_task", {
        user: taskDef.metadata?.user,
        resource: taskDef,
      });

      if (!policyResult.allowed) {
        throw new Error(`Task submission denied: ${policyResult.reason}`);
      }

      const architecture = this.predictArchitecture(taskDef);

      // 2. Create Task
      const task: AgentTask = {
        ...taskDef,
        id: randomUUID(),
        status: "pending",
        createdAt: new Date(),
        dependencies: [],
        metadata: {
          ...(taskDef.metadata ?? {}),
          orchestrationArchitecture: architecture,
        },
      };

      await this.persistence.saveTask(task);

      // 3. Decompose (if needed) - Stub for now
      // In a real system, we'd use an LLM here to break down the task
      // const subtasks = await this.decomposeTask(task);
      // this.taskQueue.push(...subtasks);

      logger.info(`Task submitted: ${task.id}`);

      return task.id;
    });
  }

  public async processQueue() {
    return traceTask("processQueue", async () => {
      const pendingTasks = await this.persistence.getPendingTasks();
      if (pendingTasks.length === 0) return;

      for (const task of pendingTasks) {
        // Check dependencies
        if (!this.checkDependencies(task)) {
          continue;
        }

        // Route
        const agentId = this.taskRouter.routeTask(task);

        if (agentId) {
          // Assign
          await this.persistence.updateTaskStatus(task.id, "assigned", agentId);
          this.lifecycleManager.updateStatus(agentId, "busy");

          // Notify Agent (simulation)
          // In reality, this would send a message via message bus
          this.emit("task_assigned", { taskId: task.id, agentId });
          logger.info(`Task ${task.id} assigned to ${agentId}`);

          // Log to IntelGraph
          const agent = this.lifecycleManager.getAgent(agentId);
          if (agent) {
            await this.intelGraph.logAgentDecision(
              agent,
              task,
              "ASSIGNED",
              "Best match by capability score"
            );
          }
        } else {
          // No agent available
          // logger.debug(`No agent available for task ${task.id}`);
        }
      }
    });
  }

  private checkDependencies(task: AgentTask): boolean {
    if (task.dependencies.length === 0) return true;
    // Check if all dependent tasks are complete
    // This requires looking up tasks which we don't store persistently in this class yet
    // Assuming dependencies are satisfied for this prototype or implemented with a lookup
    return true;
  }

  public async broadcastMessage(message: AgentMessage) {
    // Basic message bus
    this.emit("message", message);

    // If targeted
    if (message.toAgentId) {
      // specific delivery logic
    }
  }

  public predictArchitecture(
    taskDef: Omit<AgentTask, "id" | "status" | "createdAt" | "dependencies">
  ): OrchestrationArchitecture {
    return this.architectureSelector.predictOptimalArchitecture(
      this.deriveFeaturesFromTask(taskDef)
    );
  }

  public monitorErrorAmplification(
    architecture: OrchestrationArchitecture,
    stepResults: StepResult[]
  ): ErrorMetrics {
    return this.architectureSelector.monitorErrorAmplification(architecture, stepResults);
  }

  private deriveFeaturesFromTask(
    taskDef: Omit<AgentTask, "id" | "status" | "createdAt" | "dependencies">
  ): TaskSignalFeatures {
    const requiredCapabilities = taskDef.requiredCapabilities ?? [];
    const requiresStrictOrdering = Boolean(
      (taskDef.metadata as Record<string, unknown> | undefined)?.requiresStrictOrdering
    );

    return {
      id: "pending",
      name: taskDef.title,
      decomposabilityScore: requiredCapabilities.length > 1 ? 0.7 : 0.3,
      estimatedToolCount: Math.max(requiredCapabilities.length, 1),
      sequentialDependencyScore: requiresStrictOrdering ? 0.85 : 0.35,
      riskScore: this.deriveRiskScoreFromPriority(taskDef.priority),
      timeCriticalityScore: this.deriveTimeCriticality(taskDef.deadline),
    };
  }

  private deriveRiskScoreFromPriority(priority?: AgentTask["priority"]): number {
    switch (priority) {
      case "critical":
        return 0.9;
      case "high":
        return 0.75;
      case "medium":
        return 0.5;
      default:
        return 0.3;
    }
  }

  private deriveTimeCriticality(deadline?: Date): number {
    if (!deadline) {
      return 0.5;
    }

    const msRemaining = deadline.getTime() - Date.now();
    if (msRemaining <= 0) {
      return 1;
    }

    const dayMs = 24 * 60 * 60 * 1000;
    if (msRemaining <= dayMs) {
      return 0.9;
    }
    if (msRemaining <= dayMs * 3) {
      return 0.7;
    }
    if (msRemaining <= dayMs * 7) {
      return 0.5;
    }
    return 0.3;
  }
}
