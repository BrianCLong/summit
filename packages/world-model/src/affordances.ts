import { EntitySnapshot } from "./types.js";

export function allowedActions(snapshot: EntitySnapshot): string[] {
  if (snapshot.type === "pull_request" && snapshot.current_state === "blocked") {
    return ["request_review", "resolve_blocker"];
  }
  if (snapshot.current_state === "open") {
    return ["start_work", "assign_owner"];
  }
  if (snapshot.current_state === "in_progress") {
    return ["block", "resolve"];
  }
  if (snapshot.current_state === "resolved") {
    return ["close"];
  }
  return [];
}
