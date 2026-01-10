import logger from '../../utils/logger.js';
import { Agent, AgentStatus, AgentCapability, AgentConstraints } from './types.js';
import { EventEmitter } from 'events';

export class AgentLifecycleManager extends EventEmitter {
  private static instance: AgentLifecycleManager;
  private agents: Map<string, Agent> = new Map();
  private heartbeatInterval: NodeJS.Timeout;

  private constructor() {
    super();
    // Check for stale agents every 30 seconds
    this.heartbeatInterval = setInterval(() => this.checkHeartbeats(), 30000);
  }

  public static getInstance(): AgentLifecycleManager {
    if (!AgentLifecycleManager.instance) {
      AgentLifecycleManager.instance = new AgentLifecycleManager();
    }
    return AgentLifecycleManager.instance;
  }

  public registerAgent(agentDef: {
    id: string;
    name: string;
    role: string;
    capabilities: AgentCapability[];
    constraints?: AgentConstraints;
    version: string;
  }): Agent {
    const agent: Agent = {
      ...agentDef,
      constraints: agentDef.constraints || {},
      status: 'idle',
      lastHeartbeat: new Date()
    };

    this.agents.set(agent.id, agent);
    this.emit('agent_registered', agent);
    logger.info(`Agent registered: ${agent.name} (${agent.id})`);
    return agent;
  }

  public unregisterAgent(agentId: string) {
    if (this.agents.has(agentId)) {
      this.agents.delete(agentId);
      this.emit('agent_unregistered', agentId);
      logger.info(`Agent unregistered: ${agentId}`);
    }
  }

  public heartbeat(agentId: string) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lastHeartbeat = new Date();
      if (agent.status === 'offline') {
        agent.status = 'idle'; // Recover status if it was offline
      }
    }
  }

  public updateStatus(agentId: string, status: AgentStatus) {
    const agent = this.agents.get(agentId);
    if (agent) {
      const oldStatus = agent.status;
      agent.status = status;
      this.emit('agent_status_change', { agentId, oldStatus, newStatus: status });
    }
  }

  public getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  public getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  public getAgentsByCapability(capabilityName: string): Agent[] {
    return this.getAllAgents().filter(agent =>
      agent.status !== 'offline' &&
      agent.status !== 'terminated' &&
      agent.capabilities.some(cap => cap.name === capabilityName)
    );
  }

  private checkHeartbeats() {
    const now = new Date().getTime();
    const TIMEOUT_MS = 60000; // 1 minute timeout

    for (const agent of this.agents.values()) {
      if (agent.status === 'terminated') continue;

      if (now - agent.lastHeartbeat.getTime() > TIMEOUT_MS) {
        if (agent.status !== 'offline') {
          logger.warn(`Agent heartbeat timeout: ${agent.name} (${agent.id})`);
          this.updateStatus(agent.id, 'offline');
        }
      }
    }
  }

  public shutdown() {
    clearInterval(this.heartbeatInterval);
  }
}
