import * as assert from "node:assert";
import { describe, it } from "node:test";
const expect = (actual) => ({
  toBe: (expected) => assert.strictEqual(actual, expected),
  toContain: (expected) => assert.ok(actual.includes(expected)),
});

import { checkDisinfoRisk } from "../disinfo_heuristics";

describe("checkDisinfoRisk", () => {
  it("flags recycled media as high risk", () => {
    const res = checkDisinfoRisk("Look at this explosion", false, "RECYCLED_HASH_123");
    expect(res.risk_level).toBe("high");
    expect(res.flags).toContain("recycled_media");
  });

  it("flags unofficial breaking news as medium", () => {
    const res = checkDisinfoRisk("breaking news!!!", false);
    expect(res.risk_level).toBe("medium");
    expect(res.flags).toContain("unofficial_breaking");
  });
});
