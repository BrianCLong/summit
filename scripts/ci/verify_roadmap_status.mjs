#!/usr/bin/env node
import fs from 'node:fs';

const DEFAULT_STATUS_PATH = 'docs/roadmap/STATUS.json';

export function verifyRoadmapStatus(statusPath = DEFAULT_STATUS_PATH) {
  const raw = fs.readFileSync(statusPath, 'utf8');
  const status = JSON.parse(raw);

  const initiatives = Array.isArray(status.initiatives) ? status.initiatives : [];
  const declaredTotal = Number(status?.summary?.total);
  const computedTotal = initiatives.length;

  if (!Number.isFinite(declaredTotal)) {
    throw new Error(
      `docs/roadmap/STATUS.json summary.total must be numeric, received: ${status?.summary?.total}`,
    );
  }

  if (declaredTotal !== computedTotal) {
    throw new Error(
      `docs/roadmap/STATUS.json summary.total mismatch: expected ${computedTotal}, received ${declaredTotal}`,
    );
  }

  return {
    declaredTotal,
    computedTotal,
    statusPath,
  };
}

function main() {
  const statusPath = process.argv[2] ?? DEFAULT_STATUS_PATH;
  const { computedTotal } = verifyRoadmapStatus(statusPath);
  console.log(`roadmap-status verification passed (initiatives=${computedTotal})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
