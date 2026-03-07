import path from "node:path";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { UnifiedSearchIndex, decodeSearchCursor } from "../src/search/unified.js";

const datasetPath = path.resolve(__dirname, "../../../test-data/search-index-sample.json");

function buildTestApp() {
  const searchIndex = new UnifiedSearchIndex({ now: () => new Date("2025-09-01T00:00:00Z") });
  searchIndex.loadFromFile(datasetPath);
  const app = createApp({
    searchService: { index: searchIndex, query: (params) => searchIndex.query(params) },
  });
  return app;
}

describe("Unified search API", () => {
  it("filters by tenant and type and enforces purpose header", async () => {
    const app = buildTestApp();
    const res = await request(app)
      .get("/api/search/unified")
      .query({ q: "bridge", tenant_id: "acme", types: ["event"] })
      .set("x-purpose", "investigation");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].id).toBe("evt-9");
    expect(res.body.items[0].highlight.length).toBeGreaterThan(0);
  });

  it("rejects missing tenant and purpose", async () => {
    const app = buildTestApp();
    const res = await request(app).get("/api/search/unified").query({ q: "bridge" });
    expect(res.status).toBe(400);
    const resPurpose = await request(app)
      .get("/api/search/unified")
      .query({ q: "bridge", tenant_id: "acme" });
    expect(resPurpose.status).toBe(412);
  });

  it("supports cursor pagination with verification", async () => {
    const index = new UnifiedSearchIndex({ now: () => new Date("2025-09-01T00:00:00Z") });
    index.loadFromFile(datasetPath);
    const firstPage = index.query({ q: "project", tenant_id: "odin", page_size: 1 });
    expect(firstPage.cursor).toBeTruthy();
    const decoded = decodeSearchCursor(firstPage.cursor, index.cursorSecret);
    expect(decoded.tenant_id).toBe("odin");
    const secondPage = index.query({
      q: "project",
      tenant_id: "odin",
      cursor: firstPage.cursor,
      page_size: 1,
    });
    expect(secondPage.items[0].id).not.toBe(firstPage.items[0].id);
  });

  it("blocks when budget exceeded", async () => {
    const index = new UnifiedSearchIndex({ now: () => new Date("2025-09-01T00:00:00Z") });
    index.loadFromFile(datasetPath);
    const app = createApp({
      searchService: { index, query: (params) => index.query(params) },
      privacyOptions: {
        thresholds: { daily_limit: 1, per_user_limit: 1, burst_limit: 1 },
      },
    });
    const first = await request(app)
      .get("/api/search/unified")
      .query({ q: "project", tenant_id: "odin", page_size: 1 })
      .set("x-purpose", "demo");
    expect(first.status).toBe(200);
    const blocked = await request(app)
      .get("/api/search/unified")
      .query({ q: "project", tenant_id: "odin", page_size: 10 })
      .set("x-purpose", "demo");
    expect(blocked.status).toBe(403);
  });
});
