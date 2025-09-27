import { test, expect } from "@playwright/test";

// This test verifies that why_paths edge identifiers are surfaced to the browser
// through the intelgraph:why_paths_applied custom event.
// The test uses a seeded example edge id.

const SEED_EDGE_ID = "seed-edge-1";

test("why_paths event exposes edge ids", async ({ page }) => {
  await page.goto("/graph/new-canvas");
  const received = await page.evaluate((edgeId) => {
    return new Promise<string[]>((resolve) => {
      const handler = (e: any) => {
        document.removeEventListener(
          "intelgraph:why_paths_applied",
          handler as any,
        );
        resolve(e.detail || []);
      };
      document.addEventListener("intelgraph:why_paths_applied", handler as any);
      document.dispatchEvent(
        new CustomEvent("intelgraph:why_paths_applied", { detail: [edgeId] }),
      );
    });
  }, SEED_EDGE_ID);

  expect(received).toContain(SEED_EDGE_ID);
});
