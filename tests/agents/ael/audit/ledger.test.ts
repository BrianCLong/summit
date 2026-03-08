import { AuditLedger, LedgerEntry } from "../../../../src/agents/ael/audit/ledger";

describe("AEL Audit Ledger", () => {
  test("appends and lists entries correctly", () => {
    const ledger = new AuditLedger();

    expect(ledger.list().length).toBe(0);

    const entry: LedgerEntry = {
      id: "test-id-1",
      type: "DECISION",
      payloadHash: "hash123",
    };

    ledger.append(entry);

    const entries = ledger.list();
    expect(entries.length).toBe(1);
    expect(entries[0]).toEqual(entry);
  });
});
