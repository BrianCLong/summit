import { EntitySnapshot } from "./types.js";
import { allowedActions } from "./affordances.js";

export function isActionAllowed(snapshot: EntitySnapshot, requestedAction: string): boolean {
  // deny-by-default logic for mutations
  const available = allowedActions(snapshot);
  return available.includes(requestedAction);
}

export function evaluateMutation(snapshot: EntitySnapshot, requestedAction: string, roles: string[]): boolean {
  // basic check to ensure the roles matches some policy.
  // In a real system, this might query an OPA policy
  if (!isActionAllowed(snapshot, requestedAction)) {
    return false;
  }

  // if the requested action is 'close', require 'admin' or 'owner' role
  if (requestedAction === "close" && !(roles.includes("admin") || roles.includes("owner"))) {
    return false;
  }

  return true;
}
