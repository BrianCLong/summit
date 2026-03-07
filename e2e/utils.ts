// =============================================
// Optional helper: e2e/utils.ts (small utilities for future tests)
// =============================================
export async function openMaestro(page: any) {
  await page.goto("/maestro");
}
