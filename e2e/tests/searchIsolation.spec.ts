import { test, expect } from "@playwright/test";
import { generateSeedDocuments, seedSearchData, TenantDocument } from "../utils/searchTestUtils";

test.describe("Search Isolation", () => {
  const tenant1Id = "tenant-1";
  const tenant2Id = "tenant-2";

  let documents: TenantDocument[];

  test.beforeAll(() => {
    documents = generateSeedDocuments(tenant1Id, tenant2Id);
  });

  test.beforeEach(async ({ request }) => {
    // Reset the search service state before each test
    await request.post("http://localhost:8000/search/reindex/start", {
      data: { label: "test-index", batchSize: 10 },
    });
    await seedSearchData(request, documents);
    await request.post("http://localhost:8000/search/reindex/run", { data: { batchSize: 10 } });
    await request.post("http://localhost:8000/search/reindex/cutover", {
      data: { label: "test-index" },
    });
  });

  test("should not return search results from another tenant", async ({ request }) => {
    const tenant1Canary = documents.find((d) => d.tenantId === tenant1Id)!.canary;
    const tenant2Canary = documents.find((d) => d.tenantId === tenant2Id)!.canary;

    // Search as tenant 1
    const response1 = await request.post("http://localhost:8000/search/query", {
      headers: { "X-Tenant-ID": tenant1Id },
      data: { query: "graph analytics", backend: "mock", filters: { tenantId: tenant1Id } },
    });

    expect(response1.ok()).toBeTruthy();
    const results1 = await response1.json();

    // Verify that tenant 1's results only contain tenant 1's canary
    expect(results1.hits.length).toBeGreaterThan(0);
    for (const hit of results1.hits) {
      expect(hit.source.canary).toBe(tenant1Canary);
      expect(hit.source.canary).not.toBe(tenant2Canary);
    }

    // Search as tenant 2
    const response2 = await request.post("http://localhost:8000/search/query", {
      headers: { "X-Tenant-ID": tenant2Id },
      data: { query: "graph analytics", backend: "mock", filters: { tenantId: tenant2Id } },
    });

    expect(response2.ok()).toBeTruthy();
    const results2 = await response2.json();

    // Verify that tenant 2's results only contain tenant 2's canary
    expect(results2.hits.length).toBeGreaterThan(0);
    for (const hit of results2.hits) {
      expect(hit.source.canary).toBe(tenant2Canary);
      expect(hit.source.canary).not.toBe(tenant1Canary);
    }
  });

  test("should not return typeahead suggestions from another tenant", async ({ request }) => {
    // Typeahead suggestions are based on previous queries, so we need to seed some query history
    await request.post("http://localhost:8000/search/query", {
      headers: { "X-Tenant-ID": tenant1Id },
      data: { query: "tenant-1-specific-query", backend: "mock" },
    });
    await request.post("http://localhost:8000/search/query", {
      headers: { "X-Tenant-ID": tenant2Id },
      data: { query: "tenant-2-specific-query", backend: "mock" },
    });

    // Get suggestions for tenant 1
    const response1 = await request.get("http://localhost:8000/search/suggest?q=tenant", {
      headers: { "X-Tenant-ID": tenant1Id },
    });

    expect(response1.ok()).toBeTruthy();
    const suggestions1 = await response1.json();

    // Verify that tenant 1's suggestions do not contain tenant 2's query
    expect(suggestions1.some((s) => s.text === "tenant-1-specific-query")).toBeTruthy();
    expect(suggestions1.some((s) => s.text === "tenant-2-specific-query")).toBeFalsy();

    // Get suggestions for tenant 2
    const response2 = await request.get("http://localhost:8000/search/suggest?q=tenant", {
      headers: { "X-Tenant-ID": tenant2Id },
    });

    expect(response2.ok()).toBeTruthy();
    const suggestions2 = await response2.json();

    // Verify that tenant 2's suggestions do not contain tenant 1's query
    expect(suggestions2.some((s) => s.text === "tenant-2-specific-query")).toBeTruthy();
    expect(suggestions2.some((s) => s.text === "tenant-1-specific-query")).toBeFalsy();
  });
});
