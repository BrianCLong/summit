import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { AppendOnlyLedger } from "../src/ledger.js";

test("ledger appends with hash chaining", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-"));
  const file = path.join(dir, "attest.ndjson");
  const ledger = new AppendOnlyLedger(file);

  const first = ledger.append({
    attestation_id: "1",
    control_id: "c1",
    result: "PASS",
    evaluated_at: new Date().toISOString(),
    inputs_hash: "ih1"
  });

  const second = ledger.append({
    attestation_id: "2",
    control_id: "c1",
    result: "FAIL",
    evaluated_at: new Date().toISOString(),
    inputs_hash: "ih2"
  });

  expect(second.prev_hash).toBe(first.hash);
});
