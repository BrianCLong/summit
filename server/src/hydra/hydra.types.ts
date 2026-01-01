// server/src/hydra/hydra.types.ts

/**
 * Represents a decentralized AI swarm.
 */
export interface Swarm {
  swarmId: string;
  objective: string;
  status: 'active' | 'inactive';
}

/**
 * Represents a task for a swarm.
 */
export interface SwarmTask {
  taskId: string;
  swarmId: string;
  objective: string;
}
