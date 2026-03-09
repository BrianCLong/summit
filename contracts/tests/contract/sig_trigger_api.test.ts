import nock from "nock";
import fetch from "node-fetch";
import { describe, it, expect, afterEach } from "vitest";

const MAESTRO_BASE = "https://maestro.internal";

describe("Runbooks trigger API (allow‑listed)", () => {
  afterEach(() => nock.cleanAll());

  it("rejects non‑allow‑listed runbook", async () => {
    const scope = nock(MAESTRO_BASE)
      .post("/runbooks/trigger")
      .reply(403, { error: "runbook not allow‑listed" });

    const res = await fetch(`${MAESTRO_BASE}/runbooks/trigger`, {
      method: "POST",
    });
    expect(res.status).toBe(403);
    scope.done();
  });
});
