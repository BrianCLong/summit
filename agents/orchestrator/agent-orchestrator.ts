import { TaskQueue, type QueuedTask, type QueueExecutionResult } from "../queue/task-queue.js";

export interface Agent {
  name: string;
  role: "planner" | "builder" | "reviewer" | "governance";
  execute(task: AgentTask): Promise<AgentResult>;
}

export interface AgentTask {
  id: string;
  objective: string;
  inputs: any;
  priority: number;
  attempts?: number;
}

export interface AgentResult {
  status: "success" | "retry" | "fail";
  outputs: any;
}

export interface OrchestrationResult {
  taskId: string;
  status: AgentResult["status"];
  timeline: Array<{
    agent: string;
    role: Agent["role"];
    status: AgentResult["status"];
    outputs: AgentResult["outputs"];
  }>;
  output: any;
}

const DETERMINISTIC_FLOW: Agent["role"][] = ["planner", "builder", "reviewer", "governance"];

export class AgentOrchestrator {
  private readonly agents = new Map<Agent["role"], Agent>();

  private readonly queue: TaskQueue<OrchestrationResult>;

  constructor(queue?: TaskQueue<OrchestrationResult>) {
    this.queue =
      queue ??
      new TaskQueue<OrchestrationResult>({
        concurrency: 1,
        defaultMaxAttempts: 3,
      });
  }

  registerAgent(agent: Agent): void {
    this.agents.set(agent.role, agent);
  }

  getRegisteredAgents(): Agent[] {
    return DETERMINISTIC_FLOW.map((role) => this.agents.get(role)).filter((agent): agent is Agent =>
      Boolean(agent)
    );
  }

  enqueueTask(task: AgentTask): void {
    this.queue.enqueue(task, (context) => this.runDeterministicFlow(context.task));
  }

  processNextTask(): Promise<QueueExecutionResult<OrchestrationResult> | null> {
    return this.queue.processNext();
  }

  processAllTasks(): Promise<QueueExecutionResult<OrchestrationResult>[]> {
    return this.queue.processAll();
  }

  private async runDeterministicFlow(task: AgentTask): Promise<OrchestrationResult> {
    let currentTask: AgentTask = { ...task };
    const timeline: OrchestrationResult["timeline"] = [];

    for (const role of DETERMINISTIC_FLOW) {
      const agent = this.agents.get(role);
      if (!agent) {
        throw new Error(`Missing required agent for role: ${role}`);
      }

      const result = await agent.execute(currentTask);
      timeline.push({
        agent: agent.name,
        role,
        status: result.status,
        outputs: result.outputs,
      });

      if (result.status === "fail") {
        return {
          taskId: task.id,
          status: "fail",
          timeline,
          output: result.outputs,
        };
      }

      if (result.status === "retry") {
        throw new Error(`Retry requested by ${agent.name}`);
      }

      currentTask = {
        ...currentTask,
        inputs: {
          ...currentTask.inputs,
          [role]: result.outputs,
        },
      };
    }

    return {
      taskId: task.id,
      status: "success",
      timeline,
      output: currentTask.inputs,
    };
  }

  getQueueSnapshot(): QueuedTask[] {
    return this.queue.getSnapshot();
  }
}
