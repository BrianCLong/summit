import logger from '../../utils/logger.js';
import { AgentLifecycleManager } from './AgentLifecycleManager.js';
import { TaskRouter } from './TaskRouter.js';
import { ConsensusManager } from './ConsensusManager.js';
import { PolicyEngine } from '../governance/PolicyEngine.js';
import { AgentTask, AgentMessage } from './types.js';
import { PersistenceLayer, InMemoryPersistence } from './persistence.js';
import { IntelGraphIntegration } from './IntelGraphIntegration.js';
import { traceTask } from './telemetry.js';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { JobQueue } from '../../queue/job-queue.js';
import { getRedisClient } from '../../db/redis.js';

export class AgentOrchestrator extends EventEmitter {
  private static instance: AgentOrchestrator;

  public lifecycleManager: AgentLifecycleManager;
  public taskRouter: TaskRouter;
  public consensusManager: ConsensusManager;
  public policyEngine: PolicyEngine;
  public persistence: PersistenceLayer;
  public intelGraph: IntelGraphIntegration;
  private jobQueue: JobQueue<AgentTask>;

  private constructor() {
    super();
    this.lifecycleManager = AgentLifecycleManager.getInstance();
    this.taskRouter = TaskRouter.getInstance();
    this.consensusManager = ConsensusManager.getInstance();
    this.policyEngine = PolicyEngine.getInstance();
    this.persistence = new InMemoryPersistence(); // Default to InMemory, could be injected
    this.intelGraph = IntelGraphIntegration.getInstance();

    this.jobQueue = new JobQueue<AgentTask>({
      name: 'agent_tasks',
      connection: getRedisClient()
    });

    this.initWorker();
  }

  private async initWorker() {
    await this.jobQueue.start(async (job) => {
      const task = job.data;
      return traceTask('processTask', async () => {
        // Route
        const agentId = await this.taskRouter.routeTask(task);

        if (agentId) {
          // Assign
          await this.persistence.updateTaskStatus(task.id, 'assigned', agentId);
          this.lifecycleManager.updateStatus(agentId, 'busy');

          // Notify Agent
          this.emit('task_assigned', { taskId: task.id, agentId });
          logger.info(`Task ${task.id} assigned to ${agentId}`);

          // Log to IntelGraph
          const agent = this.lifecycleManager.getAgent(agentId);
          if (agent) {
              await this.intelGraph.logAgentDecision(agent, task, 'ASSIGNED', 'Best match by capability score');
          }

          // Simulation of task completion
          // await this.persistence.updateTaskStatus(task.id, 'completed', agentId);
          // this.lifecycleManager.updateStatus(agentId, 'idle');

          return { status: 'assigned', agentId };
        } else {
          logger.debug(`No agent available for task ${task.id}, requeuing`);
          throw new Error('No agent available'); // BullMQ will retry based on backoff
        }
      });
    });
  }

  public shutdown() {
    this.jobQueue.shutdown();
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
  public async submitTask(taskDef: Omit<AgentTask, 'id' | 'status' | 'createdAt' | 'dependencies'>): Promise<string> {
    return traceTask('submitTask', async () => {
      // 1. Policy Check
      const policyResult = await this.policyEngine.evaluate('submit_task', {
        user: taskDef.metadata?.user,
        resource: taskDef
      });

      if (!policyResult.allowed) {
        throw new Error(`Task submission denied: ${policyResult.reason}`);
      }

      // 2. Create Task
      const task: AgentTask = {
        ...taskDef,
        id: randomUUID(),
        status: 'pending',
        createdAt: new Date(),
        dependencies: []
      };

      await this.persistence.saveTask(task);

      // 3. Enqueue to BullMQ
      const priority = taskDef.priority === 'critical' ? 1 : taskDef.priority === 'high' ? 2 : taskDef.priority === 'medium' ? 3 : 4;
      await this.jobQueue.enqueue(task, { priority, jobId: task.id });

      logger.info(`Task submitted: ${task.id}`);

      return task.id;
    });
  }

  public async broadcastMessage(message: AgentMessage) {
    // Basic message bus
    this.emit('message', message);

    // If targeted
    if (message.toAgentId) {
        // specific delivery logic
    }
  }
}
