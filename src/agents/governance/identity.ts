import { randomUUID } from "crypto";
import { GovernanceManifest, AtfLevel } from "./types";
import { ATF_DEFAULT_LEVEL, canExecuteActions, requiresHumanApproval } from "./atfLevels";

export function createIdentity(
  level: AtfLevel = ATF_DEFAULT_LEVEL
): GovernanceManifest["identity"] {
  return {
    id: `agent-${randomUUID()}`,
    level,
    created_at: new Date().toISOString(),
  };
}

export function createManifest(
  identity: GovernanceManifest["identity"]
): GovernanceManifest {
  return {
    identity,
    capabilities: {
      canExecuteActions: canExecuteActions(identity.level),
      canProposeActions: true, // All levels can propose
      requiresApproval: requiresHumanApproval(identity.level),
      maxBudget: identity.level === "intern" ? 0 : 100, // Example budget logic
    },
  };
}
