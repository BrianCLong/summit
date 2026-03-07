import { describe, expect, it } from "vitest";

import { scrubLogArgs } from "./index.js";

describe("scrubLogArgs", () => {
  it("redacts sensitive object fields", () => {
    const [payload] = scrubLogArgs([
      {
        token: "abc123",
        nested: { apiKey: "xyz789", keep: "ok" },
        message: "Bearer top-secret-token",
      },
    ]);

    const result = payload as Record<string, unknown>;
    expect(result.token).toBe("[REDACTED]");
    expect((result.nested as Record<string, unknown>).apiKey).toBe("[REDACTED]");
    expect((result.nested as Record<string, unknown>).keep).toBe("ok");
    expect(result.message).not.toContain("top-secret-token");
    expect(result.message).toContain("[REDACTED]");
  });

  it("redacts inline tokens and query parameters", () => {
    const [payload] = scrubLogArgs(["call?access_token=abc.def&next=home Bearer another-secret"]);

    expect(payload).toBe("call?access_token=[REDACTED]&next=home Bearer [REDACTED]");
  });
});
