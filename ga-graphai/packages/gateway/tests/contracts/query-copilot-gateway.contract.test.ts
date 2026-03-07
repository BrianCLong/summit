import path from "node:path";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { UnifiedSearchIndex } from "../../src/search/unified.js";

const datasetPath = path.resolve(__dirname, "../../../../test-data/search-index-sample.json");

describe("Contract: query-copilot -> gateway unified search", () => {
  it("returns stable schema and version header", async () => {
    const index = new UnifiedSearchIndex({ now: () => new Date("2025-09-01T00:00:00Z") });
    index.loadFromFile(datasetPath);
    const app = createApp({
      searchService: { index, query: (params) => index.query(params) },
    });
    const res = await request(app)
      .get("/api/search/unified")
      .query({ q: "bridge", tenant_id: "acme" })
      .set("x-purpose", "investigation")
      .set("Accept-Version", "v1");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.headers["content-type"]).toContain("json");
    expect(res.body.items[0]).toHaveProperty("ranking_features");
  });
});
