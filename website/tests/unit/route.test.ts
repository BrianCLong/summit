import { describe, expect, it } from "vitest";
import { isInternalPath } from "@/lib/route";

describe("route utils", () => {
  it("detects internal paths", () => {
    expect(isInternalPath("/summit")).toBe(true);
    expect(isInternalPath("https://example.com")).toBe(false);
  });
});
