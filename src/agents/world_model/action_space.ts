/**
 * Action Space — enterprise actions understood by the dynamics model
 *
 * Evidence: EVD-WORLD_MODEL-PLAN-003
 */

export type AgentActionType =
  | "deploy_software"
  | "launch_campaign"
  | "change_pricing"
  | "hire_team"
  | "ship_feature"

export interface AgentAction {
  type: AgentActionType
  /** Human-readable description of the intended action */
  description: string
  /** Arbitrary structured parameters specific to the action type */
  params: Record<string, unknown>
}

/** All valid action types; used for validation in the planning engine. */
export const VALID_ACTION_TYPES: ReadonlySet<AgentActionType> = new Set([
  "deploy_software",
  "launch_campaign",
  "change_pricing",
  "hire_team",
  "ship_feature",
])

export function isValidAction(action: AgentAction): boolean {
  return VALID_ACTION_TYPES.has(action.type)
}
