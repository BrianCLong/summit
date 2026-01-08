import { describe, expect, it } from "vitest";
import { applyPatches, encodeKtoon, renderKtoon } from "../src/index.js";

const sampleBookings = [
  { id: 1, status: "confirmed", artist: { id: "PGreBnRL", name: "René Bourgeois" } },
  { id: 2, status: "cancelled", artist: { id: "ABCD1234", name: "Some Artist" } },
];

describe("encodeKtoon", () => {
  it("builds key and value dictionaries when repetition occurs", () => {
    const doc = encodeKtoon(sampleBookings);
    expect(doc.keys).toBeDefined();
    expect(Object.values(doc.keys ?? {})).toContain("id");
    expect(doc.values).toBeDefined();
    expect(renderKtoon(doc)).toContain("@vals");
  });

  it("optimizes uniform arrays into tables", () => {
    const doc = encodeKtoon(sampleBookings);
    expect(doc.body.type).toBe("table");
    if (doc.body.type === "table") {
      expect(doc.body.columns).toEqual(["artist", "id", "status"]);
      expect(doc.body.rows.length).toBe(2);
    }
  });
});

describe("patch application", () => {
  it("applies append and update patches on tables", () => {
    const base = encodeKtoon(sampleBookings).body;
    if (base.type !== "table") throw new Error("expected table");
    base.primaryKey = "id";
    const patched = applyPatches(base, [
      {
        op: "append",
        path: base.name ?? "table",
        rows: [[3, "hold", { id: "XYZ", name: "New Artist" }]],
      },
      {
        op: "update",
        path: base.name ?? "table",
        key: "id",
        rows: [{ id: 2, status: "confirmed" }],
      },
    ]);

    if (patched.type !== "table") throw new Error("expected table");
    expect(patched.rows).toHaveLength(3);
    const statusIdx = patched.columns.indexOf("status");
    const second = patched.rows.find((row) => row[patched.columns.indexOf("id")] === 2);
    expect(second?.[statusIdx]).toBe("confirmed");
  });
});

describe("rendering", () => {
  it("produces strict TOON output when requested", () => {
    const doc = encodeKtoon(sampleBookings, { mode: "strict-toon" });
    const text = renderKtoon(doc, true);
    expect(text).not.toContain("@keys");
    expect(text).toContain("bookings");
  });
});
