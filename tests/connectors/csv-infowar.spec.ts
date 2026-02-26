import { describe, it, expect } from 'vitest';
import { parseIncidentLedger, mapIncidentToGraph, IncidentLedgerEntry } from "../../src/connectors/csv/infowar/index";

describe("CSV Incident Ledger Ingestion", () => {
  it("should parse an incident ledger CSV", () => {
    const csvContent = "incident_id,date,narrative_id,claim_id,actor_id,platform,event_id,evidence_id,confidence,description\nINC-001,2026-01-01,NARR-001,CLAIM-001,ACTOR-001,PLAT-001,EVT-001,EVD-001,0.9,A test incident";
    const entries = parseIncidentLedger(csvContent);
    expect(entries).toHaveLength(1);
    expect(entries[0].incident_id).toBe("INC-001");
    expect(entries[0].confidence).toBe(0.9);
  });

  it("should map an incident entry to graph primitives", () => {
    const entry: IncidentLedgerEntry = {
      incident_id: "INC-001",
      date: "2026-01-01",
      narrative_id: "NARR-001",
      claim_id: "CLAIM-001",
      actor_id: "ACTOR-001",
      platform: "PLAT-001",
      event_id: "EVT-001",
      evidence_id: "EVD-001",
      confidence: 0.9,
      description: "A test incident"
    };

    const graph = mapIncidentToGraph(entry);
    expect(graph.nodes).toHaveLength(4);
    expect(graph.edges).toHaveLength(3);
    expect(graph.metadata.incident_id).toBe("INC-001");
    expect(graph.edges[0].label).toBe("AMPLIFIES");
  });

  it("should handle empty CSV content", () => {
    const entries = parseIncidentLedger("");
    expect(entries).toHaveLength(0);
  });
});
