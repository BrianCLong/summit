#!/usr/bin/env node
/**
 * Summit supersedence apply script
 *
 * Current mode in this version:
 * - report-only
 * - no mutations against GitHub
 */

import fs from "node:fs/promises";

async function main() {
  const raw = await fs.readFile("artifacts/supersedence-actions.json", "utf8");
  const actions = JSON.parse(raw);

  const summary = {
    mode: actions.mode || "report-only",
    close_now: actions.close_now?.length || 0,
    close_after_timeout: actions.close_after_timeout?.length || 0,
    review_required: actions.review_required?.length || 0,
    survivors: actions.survivors?.length || 0,
  };

  console.log("Supersedence apply is disabled in this version.");
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
