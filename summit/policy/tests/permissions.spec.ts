import { describe, test, expect } from "vitest";
import { decide } from "../permissions";

describe("Permissions Policy", () => {
  test("deny-by-default: remote requests rejected", () => {
    const d = decide({ requestId:"r1", tool:"fs.write", scope:{workspaceRoot:"/w"}, reason:"x", remote:true });
    expect(d.reply).toBe("reject");
  });

  test("local requests allowed once (baseline)", () => {
    const d = decide({ requestId:"r2", tool:"fs.read", scope:{workspaceRoot:"/w"}, reason:"x", remote:false });
    expect(d.reply).toBe("once");
  });
});
