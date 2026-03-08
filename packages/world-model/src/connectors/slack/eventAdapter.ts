import { WorldEvent } from "../../types.js";
import { generateEvidenceId } from "../../evidence.js";

export interface SlackEvent {
  ts: string;
  channel: string;
  user: string;
  type: string;
  text: string;
}

export function slackToEvent(event: SlackEvent): WorldEvent {
  return {
    evidence_id: generateEvidenceId("slack", `${event.channel}:${event.ts}`),
    entity_id: `slack:${event.channel}`,
    event_type: `slack.${event.type}`,
    observed_at: event.ts,
    payload: { text: event.text, owner: event.user }
  };
}
