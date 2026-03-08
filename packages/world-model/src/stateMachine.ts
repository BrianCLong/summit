import { EntityState } from "./types.js";

export function canTransition(from: EntityState, to: EntityState, eventType: string): boolean {
  if (from === "unknown" && to === "open") return true;
  if (from === "open" && to === "in_progress") return true;
  if (from === "in_progress" && to === "blocked") return true;
  if (from === "in_progress" && to === "resolved") return true;
  if (from === "blocked" && to === "in_progress") return true;
  if (from === "resolved" && to === "closed") return true;

  // Degraded state transitions
  if (to === "degraded") return true; // Anything can degrade
  if (from === "degraded" && to === "in_progress") return true;

  // Event specific overrides
  if (eventType === "force_close" && to === "closed") return true;

  return false;
}
