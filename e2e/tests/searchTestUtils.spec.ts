import { test, expect } from "@playwright/test";
import { generateSeedDocuments } from "../utils/searchTestUtils";

test.describe("Search Test Utils", () => {
  test("should generate seed documents with unique canaries for each tenant", () => {
    const tenant1Id = "tenant-1";
    const tenant2Id = "tenant-2";

    const documents = generateSeedDocuments(tenant1Id, tenant2Id);

    const tenant1Docs = documents.filter((d) => d.tenantId === tenant1Id);
    const tenant2Docs = documents.filter((d) => d.tenantId === tenant2Id);

    expect(tenant1Docs.length).toBeGreaterThan(0);
    expect(tenant2Docs.length).toBeGreaterThan(0);

    const tenant1Canary = tenant1Docs[0].canary;
    const tenant2Canary = tenant2Docs[0].canary;

    expect(tenant1Canary).not.toBe(tenant2Canary);

    for (const doc of tenant1Docs) {
      expect(doc.canary).toBe(tenant1Canary);
    }

    for (const doc of tenant2Docs) {
      expect(doc.canary).toBe(tenant2Canary);
    }
  });
});
