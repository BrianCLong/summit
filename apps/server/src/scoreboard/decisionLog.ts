import { randomUUID } from "crypto";
import { DecisionLogEntry } from "./types.js";

export class DecisionLog {
  private entries: DecisionLogEntry[] = [];

  log(entry: Omit<DecisionLogEntry, "id" | "createdAt">): DecisionLogEntry {
    const record: DecisionLogEntry = {
      ...entry,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.entries.push(record);
    return record;
  }

  list(domainId?: string): DecisionLogEntry[] {
    if (!domainId) return [...this.entries];
    return this.entries.filter((entry) => entry.domainId === domainId);
  }
}
