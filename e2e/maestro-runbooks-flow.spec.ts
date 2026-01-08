import { test, expect } from "@playwright/test";

const schemaPayload = {
  $id: "https://intelgraph.dev/schemas/maestro-runbook.json",
  type: "object",
  required: ["nodes", "edges"],
  properties: {
    nodes: { type: "array" },
    edges: { type: "array" },
  },
};

test.describe("Maestro Runbooks flow", () => {
  test("author → validate → simulate → run", async ({ page }) => {
    await page.route("**/api/maestro/pipelines/schema", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(schemaPayload),
      });
    });

    await page.route("**/api/maestro/pipelines/validate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ valid: true, schemaErrors: [], dslError: null }),
      });
    });

    await page.route("**/api/maestro/pipelines/simulate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          estimate: {
            estimatedCostUSD: 0.0421,
            estimatedDurationMs: 2200,
            nodes: 3,
            edges: 2,
            taskNodes: 3,
          },
        }),
      });
    });

    await page.route("**/api/maestro/pipelines", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: "pipeline-123" }),
        });
        return;
      }
      await route.fallback();
    });

    await page.route("**/api/maestro/pipelines/*", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "pipeline-123" }),
        });
        return;
      }
      await route.fallback();
    });

    await page.route("**/api/maestro/runs", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: "run-123", status: "queued" }),
      });
    });

    await page.goto("/maestro/runbooks");

    await page.getByLabel("Runbook name").fill("Morning Intel Sweep");

    await page.getByRole("button", { name: "Validate Runbook" }).click();
    await expect(page.getByText("Valid runbook")).toBeVisible();

    await page.getByRole("button", { name: "Simulate Cost" }).click();
    await expect(page.getByText("Estimated cost: $0.0421")).toBeVisible();

    await page.getByRole("button", { name: "Run Now" }).click();
    await expect(page.getByText("Run queued")).toBeVisible();
    await expect(page.getByText("run-123")).toBeVisible();
  });
});
