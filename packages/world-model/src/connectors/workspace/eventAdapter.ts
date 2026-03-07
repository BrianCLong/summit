import { WorldEvent } from "../../types.js";
import { generateEvidenceId } from "../../evidence.js";

export interface WorkspaceDoc {
  docId: string;
  lastModified: string;
  author: string;
  status: string;
}

export function workspaceDocToEvent(doc: WorkspaceDoc): WorldEvent {
  return {
    evidence_id: generateEvidenceId("workspace", doc.docId),
    entity_id: `doc:${doc.docId}`,
    event_type: "workspace.doc.updated",
    observed_at: doc.lastModified,
    payload: { owner: doc.author, state: doc.status }
  };
}
