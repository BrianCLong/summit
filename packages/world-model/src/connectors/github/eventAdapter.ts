import { WorldEvent } from "../../types.js";
import { generateEvidenceId } from "../../evidence.js";

export interface GitHubPR {
  id: number;
  repo: string;
  number: number;
  updated_at: string;
  state: "open" | "closed" | "in_progress" | "blocked" | "resolved";
  user: {
    login: string;
  };
}

export function githubPrToEvent(pr: GitHubPR): WorldEvent {
  return {
    evidence_id: generateEvidenceId("github", pr.id.toString()),
    entity_id: `pr:${pr.repo}:${pr.number}`,
    event_type: "github.pr.updated",
    observed_at: pr.updated_at,
    payload: { state: pr.state, owner: pr.user.login }
  };
}
