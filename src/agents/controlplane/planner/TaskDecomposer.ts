/**
 * TaskDecomposer — skeleton planner that breaks a goal string into typed subtasks.
 *
 * In the foundation lane this is intentionally minimal: it returns a single
 * passthrough task.  The graph-context-aware planner will replace this logic
 * once the graph context compiler is enabled.
 *
 * Feature flag: SUMMIT_AGENT_CONTROL_PLANE must be truthy for this module to
 * participate in live request handling.
 *
 * EVD-AFCP-ARCH-001
 */

import type { TaskSpec } from "./TaskSpec.js";

export interface DecomposedPlan {
  /** Unique plan identifier (inherited from the root task id). */
  planId: string;

  /** Original goal string. */
  goal: string;

  /** Ordered list of subtask specs. */
  tasks: TaskSpec[];

  /** Evidence artifact ids attached to this plan. */
  evidenceIds: string[];
}

/**
 * Decompose a high-level goal into an ordered list of subtasks.
 *
 * Foundation-lane implementation: produces exactly one passthrough task
 * with the root task spec as-is.  A graph-aware decomposer will replace
 * this once the compiler lane is enabled.
 */
export function planTask(root: TaskSpec): DecomposedPlan {
  return {
    planId: root.id,
    goal: root.goal,
    tasks: [root],
    evidenceIds: [],
  };
}
