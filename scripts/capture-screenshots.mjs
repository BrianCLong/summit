import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const uiUrl = process.env.UI_URL || "http://localhost:3000";
const screenshotDir = path.resolve("docs/cookbook/screenshots");
const screenshotPath = path.join(screenshotDir, "observability-dashboard.png");

async function capture() {
  mkdirSync(screenshotDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto(uiUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await browser.close();

  const metadataPath = path.join(screenshotDir, "metadata.json");
  const metadata = {
    capturedAt: new Date().toISOString(),
    target: uiUrl,
    files: [path.basename(screenshotPath)],
  };
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);

  console.log(`✅ Screenshot captured at ${screenshotPath}`);
}

capture().catch((error) => {
  console.error("❌ Failed to capture screenshot", error);
  process.exit(1);
});
