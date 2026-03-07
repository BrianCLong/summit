import { test, expect } from "../fixtures/osint-fixtures";

test.describe("OSINT Module End-to-End", () => {
  test.beforeEach(async ({ mockWikipedia, mockOsintFeeds }) => {
    // Setup mocks
    await mockWikipedia();
    await mockOsintFeeds();
  });

  test("should support creating OSINT-derived entities", async ({ createEntity, request }) => {
    const entity = await createEntity({
      label: "Suspected Botnet",
      type: "THREAT_ACTOR",
      description: "Identified via OSINT analysis",
      properties: {
        confidence: 0.85,
        source: "osint_feed",
      },
    });

    expect(entity.id).toBeDefined();
    expect(entity.label).toBe("Suspected Botnet");
    expect(entity.properties.source).toBe("osint_feed");

    // Verify retrieval
    const getRes = await request.get(`/api/entities/${entity.uuid}`);
    expect(getRes.ok()).toBeTruthy();
    const fetched = await getRes.json();
    expect(fetched.label).toBe("Suspected Botnet");
  });

  // Since we can't easily trigger the backend OSINT service directly from the frontend without a UI,
  // we simulate the workflow by creating the entity (as done above) and then
  // potentially generating a report for it (covered in reports.spec.ts).

  test("should generate and retrieve a report for an investigation", async ({ request, page }) => {
    // 1. Trigger Report Generation API
    const reportData = {
      title: "OSINT Investigation Report",
      investigationId: "INV-2025-001",
      findings: [
        "Open port 8080 found on target host.",
        "Suspicious DNS queries detected to known C2 domains.",
      ],
      evidence: ["Nmap scan results showing port 8080 open.", "DNS logs timestamped 2025-05-20."],
      metadata: {
        analyst: "Jules",
        classification: "CONFIDENTIAL",
      },
      format: "html",
    };

    const startTime = Date.now();
    const response = await request.post("/api/reports/generate", {
      data: reportData,
    });
    const duration = Date.now() - startTime;

    // Performance Assertion
    expect(duration).toBeLessThan(2000); // Report generation should be under 2s

    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.url).toContain("/uploads/reports/");

    // 2. Visual Validation of the Report
    await page.goto(result.url);
    await expect(page).toHaveTitle(/OSINT Investigation Report/);

    // Check content
    await expect(page.locator("h1")).toHaveText("OSINT Investigation Report");
    await expect(page.locator(".findings")).toContainText("Open port 8080");
    await expect(page.locator(".evidence")).toContainText("Nmap scan results");

    // Visual Regression Snapshot
    // Masking the generated date to avoid snapshot mismatches
    await expect(page).toHaveScreenshot("osint-report.png", {
      mask: [page.locator(".meta")],
    });
  });

  test("should handle concurrent report generation requests", async ({ request }) => {
    // Parallel execution test
    const requests = Array.from({ length: 5 }).map((_, i) =>
      request.post("/api/reports/generate", {
        data: {
          title: `Concurrent Report ${i}`,
          findings: [`Finding ${i}`],
        },
      })
    );

    const responses = await Promise.all(requests);
    for (const res of responses) {
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      expect(json.success).toBe(true);
    }
  });
});
