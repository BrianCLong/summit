/**
 * AgentRegistry - Manages lifecycle and discovery of agent archetypes
 *
 * Provides centralized registration, discovery, and invocation of agents.
 */

import { BaseAgentArchetype } from './BaseAgentArchetype';
import { AgentRole, AgentContext, AgentResult, AgentStatusInfo, AgentHealth } from './types';

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<AgentRole, BaseAgentArchetype>;
  private initialized: boolean;

  private constructor() {
    this.agents = new Map();
    this.initialized = false;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Register an agent
   */
  public register(agent: BaseAgentArchetype): void {
    if (this.agents.has(agent.role)) {
      console.warn(`[AgentRegistry] Agent with role ${agent.role} already registered, replacing...`);
    }

    this.agents.set(agent.role, agent);
    console.log(`[AgentRegistry] Registered agent: ${agent.name} (${agent.role})`);
  }

  /**
   * Unregister an agent
   */
  public async unregister(role: AgentRole): Promise<void> {
    const agent = this.agents.get(role);
    if (agent) {
      await agent.shutdown();
      this.agents.delete(role);
      console.log(`[AgentRegistry] Unregistered agent: ${role}`);
    }
  }

  /**
   * Get an agent by role
   */
  public getAgent(role: AgentRole): BaseAgentArchetype | undefined {
    return this.agents.get(role);
  }

  /**
   * List all registered agents
   */
  public listAgents(): Array<{ role: AgentRole; name: string; capabilities: string[] }> {
    return Array.from(this.agents.values()).map((agent) => ({
      role: agent.role,
      name: agent.name,
      capabilities: agent.capabilities,
    }));
  }

  /**
   * Initialize all agents
   */
  public async initializeAll(): Promise<void> {
    if (this.initialized) {
      console.warn('[AgentRegistry] Already initialized');
      return;
    }

    console.log(`[AgentRegistry] Initializing ${this.agents.size} agents...`);

    const initPromises = Array.from(this.agents.values()).map(async (agent) => {
      try {
        await agent.initialize();
        console.log(`[AgentRegistry] Initialized ${agent.name}`);
      } catch (error) {
        console.error(`[AgentRegistry] Failed to initialize ${agent.name}:`, error);
        throw error;
      }
    });

    await Promise.all(initPromises);
    this.initialized = true;
    console.log('[AgentRegistry] All agents initialized');
  }

  /**
   * Shutdown all agents
   */
  public async shutdownAll(): Promise<void> {
    console.log(`[AgentRegistry] Shutting down ${this.agents.size} agents...`);

    const shutdownPromises = Array.from(this.agents.values()).map(async (agent) => {
      try {
        await agent.shutdown();
        console.log(`[AgentRegistry] Shutdown ${agent.name}`);
      } catch (error) {
        console.error(`[AgentRegistry] Failed to shutdown ${agent.name}:`, error);
      }
    });

    await Promise.all(shutdownPromises);
    this.agents.clear();
    this.initialized = false;
    console.log('[AgentRegistry] All agents shutdown');
  }

  /**
   * Execute an agent
   */
  public async execute(role: AgentRole, context: AgentContext): Promise<AgentResult> {
    const agent = this.agents.get(role);

    if (!agent) {
      return {
        requestId: context.requestId,
        success: false,
        error: `Agent with role ${role} not found`,
      };
    }

    try {
      const result = await agent.execute(context);
      return result;
    } catch (error) {
      console.error(`[AgentRegistry] Agent execution failed (${role}):`, error);
      return {
        requestId: context.requestId,
        success: false,
        error: `Agent execution failed: ${error.message}`,
      };
    }
  }

  /**
   * Get status of all agents
   */
  public getStatusAll(): Map<AgentRole, AgentStatusInfo> {
    const statusMap = new Map<AgentRole, AgentStatusInfo>();

    this.agents.forEach((agent, role) => {
      statusMap.set(role, agent.getStatus());
    });

    return statusMap;
  }

  /**
   * Get health of all agents
   */
  public async getHealthAll(): Promise<Map<AgentRole, AgentHealth>> {
    const healthMap = new Map<AgentRole, AgentHealth>();

    const healthPromises = Array.from(this.agents.entries()).map(async ([role, agent]) => {
      try {
        const health = await agent.getHealthCheck();
        healthMap.set(role, health);
      } catch (error) {
        healthMap.set(role, {
          healthy: false,
          checks: {
            graphConnection: false,
            policyEngine: false,
            approvalEngine: false,
            auditLog: false,
          },
          errors: [error.message],
          lastCheck: new Date(),
        });
      }
    });

    await Promise.all(healthPromises);
    return healthMap;
  }

  /**
   * Check if registry is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Helper function to get registry instance
 */
export function getAgentRegistry(): AgentRegistry {
  return AgentRegistry.getInstance();
}
