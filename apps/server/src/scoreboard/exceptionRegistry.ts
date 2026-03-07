import { randomUUID } from "crypto";
import { ExceptionEntry, GateType } from "./types.js";

export class ExceptionRegistry {
  private entries: ExceptionEntry[] = [];

  registerException(params: {
    domainId: string;
    gate: GateType;
    owner: string;
    reason: string;
    expiresAt: string;
  }): ExceptionEntry {
    const entry: ExceptionEntry = {
      id: randomUUID(),
      domainId: params.domainId,
      gate: params.gate,
      owner: params.owner,
      reason: params.reason,
      expiresAt: params.expiresAt,
      createdAt: new Date().toISOString(),
    };

    this.entries.push(entry);
    this.pruneExpired();
    return entry;
  }

  getActive(domainId: string, gate: GateType): ExceptionEntry | undefined {
    this.pruneExpired();
    return this.entries.find(
      (entry) =>
        entry.domainId === domainId &&
        entry.gate === gate &&
        new Date(entry.expiresAt).getTime() > Date.now()
    );
  }

  listByDomain(domainId: string): ExceptionEntry[] {
    this.pruneExpired();
    return this.entries.filter((entry) => entry.domainId === domainId);
  }

  private pruneExpired() {
    const now = Date.now();
    this.entries = this.entries.filter((entry) => new Date(entry.expiresAt).getTime() > now);
  }
}
