export interface LedgerEntry {
  id: string
  type: "DECISION" | "DELEGATION" | "APPROVAL" | "ROLLBACK"
  payloadHash: string
}

export class AuditLedger {
  private entries: LedgerEntry[] = []

  append(entry: LedgerEntry) {
    // TODO: enforce append-only persistence, hash chaining
    this.entries.push(entry)
  }

  list() {
    return [...this.entries]
  }
}
