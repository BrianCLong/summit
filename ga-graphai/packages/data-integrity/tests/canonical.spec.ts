import { describe, expect, it } from "vitest";
import { canonicalStringify, canonicalize, normalizeTimestamp, stableHash } from "../src/index.js";

describe("canonicalization", () => {
  it("produces stable ordering for objects and arrays", () => {
    const value = { b: 2, a: { z: 1, y: 2 }, list: [3, 2, 1] };
    const canonical = canonicalStringify(value);
    expect(canonical).toBe('{"a":{"y":2,"z":1},"b":2,"list":[3,2,1]}');
  });

  it("normalizes numbers and strings deterministically", () => {
    const value = { num: 1.23456789123, text: "héllo\nworld" };
    const canonical = canonicalize(value) as Record<string, unknown>;
    expect(canonical.num).toBeCloseTo(1.23456789123, 12);
    expect((canonical.text as string).includes("\n")).toBe(false);
  });

  it("produces stable hashes across equivalent payloads", () => {
    const a = { foo: "bar", nested: { a: 1 } };
    const b = { nested: { a: 1 }, foo: "bar" };
    expect(stableHash(a)).toEqual(stableHash(b));
  });

  it("normalizes timestamps regardless of timezone string", () => {
    const ts = normalizeTimestamp("2024-01-01T00:00:00-05:00");
    expect(ts).toBe("2024-01-01T05:00:00.000Z");
  });
});
