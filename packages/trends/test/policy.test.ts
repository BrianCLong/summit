import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateTouchpointEvent } from "../src/policy";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("Touchpoint Policy", () => {
  test("deny fixture fails", () => {
    const p = join(__dirname, "fixtures/deny/invalid_touchpoint_signature.json");
    const e = JSON.parse(readFileSync(p, "utf8"));
    expect(validateTouchpointEvent(e).ok).toBe(false);
  });

  test("allow fixture passes", () => {
    const p = join(__dirname, "fixtures/allow/valid_touchpoint_signature.json");
    const e = JSON.parse(readFileSync(p, "utf8"));
    expect(validateTouchpointEvent(e).ok).toBe(true);
  });

  test("invalid type fails", () => {
    const p = join(__dirname, "fixtures/deny/invalid_touchpoint_type.json");
    const e = JSON.parse(readFileSync(p, "utf8"));
    const res = validateTouchpointEvent(e);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("invalid_event_type");
  });
});
