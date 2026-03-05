import { createHash } from "crypto";
import type { WorkGraph, WorkTicket, EvidenceId } from "./schema";

export function compileWorkGraph(spec: string): WorkGraph {
  const specHash = createHash("sha256").update(spec).digest("hex");
  const tickets: WorkTicket[] = [];

  const lines = spec.split('\n');
  let currentTicket: Partial<WorkTicket> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for ticket heading, e.g., "## TICKET-001: Setup Project"
    const headingMatch = line.match(/^##\s+(TICKET-\d+):\s+(.*)$/);
    if (headingMatch) {
      if (currentTicket && currentTicket.id) {
        tickets.push(currentTicket as WorkTicket);
      }
      currentTicket = {
        id: headingMatch[1],
        title: headingMatch[2],
        description: "",
        owners: [],
        deps: [],
        evidence: [],
      };
      continue;
    }

    if (currentTicket) {
      // Look for fields
      if (line.startsWith("Description:")) {
        currentTicket.description = line.substring("Description:".length).trim();
      } else if (line.startsWith("Owners:")) {
        const ownersStr = line.substring("Owners:".length).trim();
        currentTicket.owners = ownersStr ? ownersStr.split(',').map(s => s.trim()).filter(Boolean) : [];
      } else if (line.startsWith("Deps:")) {
        const depsStr = line.substring("Deps:".length).trim();
        currentTicket.deps = depsStr ? depsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
      } else if (line.startsWith("Evidence:")) {
        const evidenceStr = line.substring("Evidence:".length).trim();
        currentTicket.evidence = (evidenceStr ? evidenceStr.split(',').map(s => s.trim()).filter(Boolean) : []) as EvidenceId[];
      }
    }
  }

  // Push the last ticket if it exists
  if (currentTicket && currentTicket.id) {
    tickets.push(currentTicket as WorkTicket);
  }

  return { specHash, tickets };
}
