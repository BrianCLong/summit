// server/src/hydra/HydraService.ts

import { Swarm, SwarmTask } from './hydra.types';
import { randomUUID } from 'crypto';

/**
 * Service for managing (simulated) decentralized, self-replicating AI swarms.
 * Project HYDRA.
 */
export class HydraService {
  private activeSwarms: Map<string, Swarm> = new Map();

  /**
   * Unleashes a new AI swarm.
   * @param swarm The Swarm to be unleashed.
   * @returns The created Swarm object.
   */
  async unleashSwarm(swarm: Omit<Swarm, 'swarmId'>): Promise<Swarm> {
    const swarmId = `swarm-${randomUUID()}`;
    const newSwarm: Swarm = { ...swarm, swarmId, status: 'active' };
    this.activeSwarms.set(swarmId, newSwarm);
    return newSwarm;
  }

  /**
   * Assigns a task to a swarm.
   * @param task The SwarmTask to be assigned.
   * @returns A confirmation object.
   */
  async assignTask(task: Omit<SwarmTask, 'taskId'>): Promise<{ confirmationId: string; status: string }> {
    const { swarmId } = task;
    const swarm = this.activeSwarms.get(swarmId);
    if (!swarm || swarm.status !== 'active') {
      throw new Error(`Swarm ${swarmId} is not active.`);
    }
    const confirmationId = `task-${randomUUID()}`;
    return { confirmationId, status: 'assigned' };
  }
}

export const hydraService = new HydraService();
