/**
 * CSV Ingestion Stub for INFOWAR Incident Ledger.
 */

export interface IncidentLedgerEntry {
  incident_id: string;
  date: string;
  narrative_id: string;
  claim_id: string;
  actor_id: string;
  platform: string;
  event_id?: string;
  evidence_id: string;
  confidence: number;
  description: string;
}

/**
 * Parses a CSV string into an array of IncidentLedgerEntries.
 */
export function parseIncidentLedger(csvContent: string): IncidentLedgerEntry[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const values = line.split(",");
    const entry: any = {};
    headers.forEach((header, index) => {
      const value = values[index];
      if (header === "confidence") {
        entry[header] = parseFloat(value);
      } else {
        entry[header] = value;
      }
    });
    return entry as IncidentLedgerEntry;
  });
}

/**
 * Maps an IncidentLedgerEntry to Summit graph primitives (Nodes/Edges).
 */
export function mapIncidentToGraph(entry: IncidentLedgerEntry): any {
  return {
    nodes: [
      { id: entry.narrative_id, label: "Narrative" },
      { id: entry.claim_id, label: "Claim" },
      { id: entry.actor_id, label: "Actor" },
      { id: entry.event_id, label: "Event", optional: !entry.event_id }
    ],
    edges: [
      { from: entry.actor_id, to: entry.claim_id, label: "AMPLIFIES" },
      { from: entry.claim_id, to: entry.narrative_id, label: "PART_OF" },
      { from: entry.claim_id, to: entry.evidence_id, label: "EVIDENCED_BY" }
    ],
    metadata: {
      incident_id: entry.incident_id,
      description: entry.description,
      confidence: entry.confidence,
      timestamp: entry.date
    }
  };
}
