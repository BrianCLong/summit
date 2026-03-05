/**
 * World-Model Memory — trajectory store
 *
 * Persists WorldState sequences (trajectories) to PostgreSQL + Neo4j so that
 * the planning engine can recall past rollouts and improve policy selection
 * over time.
 *
 * Storage contract:
 *   - PostgreSQL: append-only trajectory log (state rows + action edges)
 *   - Neo4j: trajectory graph for structural traversal
 *
 * Evidence: EVD-WORLD_MODEL-ARCH-001
 */

import type { WorldState } from "./state_model.js"
import type { AgentAction } from "../../agents/world_model/action_space.js"

export interface TrajectoryStep {
  state: WorldState
  action: AgentAction | null // null for the terminal state
}

export interface Trajectory {
  id: string
  created_at: string
  steps: TrajectoryStep[]
  /** Aggregate score assigned by the planning engine */
  score: number
}

/**
 * Minimal persistence interface — swap for real DB adapters in production.
 */
export interface TrajectoryStore {
  append(trajectory: Trajectory): Promise<void>
  getById(id: string): Promise<Trajectory | null>
  listRecent(limit: number): Promise<Trajectory[]>
}

/**
 * In-memory implementation for testing; not suitable for production.
 */
export class InMemoryTrajectoryStore implements TrajectoryStore {
  private readonly store = new Map<string, Trajectory>()
  private readonly order: string[] = []

  async append(trajectory: Trajectory): Promise<void> {
    this.store.set(trajectory.id, trajectory)
    this.order.push(trajectory.id)
  }

  async getById(id: string): Promise<Trajectory | null> {
    return this.store.get(id) ?? null
  }

  async listRecent(limit: number): Promise<Trajectory[]> {
    return this.order
      .slice(-limit)
      .reverse()
      .map((id) => this.store.get(id)!)
  }
}
