import { AgentRegistry } from './AgentRegistry.js';
import { AgentStatus } from './types.js';

export class HealthMonitor {
  private registry: AgentRegistry;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly TIMEOUT_MS = 30000; // 30 seconds

  constructor() {
    this.registry = AgentRegistry.getInstance();
  }

  public startMonitoring(intervalMs: number = 10000): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this.checkAgents();
    }, intervalMs);
  }

  public stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private checkAgents(): void {
    const agents = this.registry.getAllAgents();
    const now = new Date();

    for (const agent of agents) {
      const timeSinceLastHeartbeat = now.getTime() - agent.health.lastHeartbeat.getTime();

      if (timeSinceLastHeartbeat > this.TIMEOUT_MS && agent.status !== AgentStatus.OFFLINE) {
        console.warn(`Agent ${agent.id} timed out. Marking as OFFLINE.`);
        this.registry.updateStatus(agent.id, AgentStatus.OFFLINE);
      }
    }
  }

  public reportHeartbeat(agentId: string, metrics: { cpu: number; memory: number; activeTasks: number }): void {
    this.registry.updateHealth(agentId, {
      cpuUsage: metrics.cpu,
      memoryUsage: metrics.memory,
      activeTasks: metrics.activeTasks
    });

    // If agent was offline, mark it as IDLE or BUSY depending on tasks
    const agent = this.registry.getAgent(agentId);
    if (agent && agent.status === AgentStatus.OFFLINE) {
        this.registry.updateStatus(agentId, metrics.activeTasks > 0 ? AgentStatus.BUSY : AgentStatus.IDLE);
    }
  }
}
