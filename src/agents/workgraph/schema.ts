export type EvidenceId = `EVID:${string}:${string}`;

export interface WorkTicket {
  id: string;                 // TICKET-001
  title: string;
  description: string;
  owners: string[];           // file globs
  deps: string[];             // ticket ids
  evidence: EvidenceId[];     // links to claims or "Summit original"
}

export interface WorkGraph {
  specHash: string;
  tickets: WorkTicket[];
}
