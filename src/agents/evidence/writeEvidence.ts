import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

interface EvidenceBundleOptions {
  runId: string;
  itemSlug: string;
  evidenceIds: string[];
  summary: string;
  counters: Record<string, number>;
  timings: Record<string, number>;
  quality: Record<string, number>;
  artifacts?: string[];
  rootDir?: string; // Optional override for testing
}

export async function writeEvidenceBundle(options: EvidenceBundleOptions): Promise<string> {
  const { runId, itemSlug, evidenceIds, summary, counters, timings, quality, artifacts = [], rootDir = process.cwd() } = options;
  const evidenceDir = path.join(rootDir, 'evidence', runId);

  // Ensure evidence directory exists
  await fs.mkdir(evidenceDir, { recursive: true });

  // Get git SHA
  let gitSha = 'unknown';
  try {
    gitSha = execSync('git rev-parse HEAD').toString().trim();
  } catch (e) {
    console.warn('Could not retrieve git SHA, defaulting to unknown');
  }

  // 1. Write report.json
  const report = {
    run_id: runId,
    item_slug: itemSlug,
    evidence_ids: evidenceIds,
    summary,
    artifacts
  };
  await fs.writeFile(path.join(evidenceDir, 'report.json'), JSON.stringify(report, null, 2));

  // 2. Write metrics.json
  const metrics = {
    run_id: runId,
    counters,
    timings_ms: timings,
    quality
  };
  await fs.writeFile(path.join(evidenceDir, 'metrics.json'), JSON.stringify(metrics, null, 2));

  // 3. Write stamp.json
  const stamp = {
    run_id: runId,
    created_at: new Date().toISOString(),
    git_sha: gitSha
  };
  await fs.writeFile(path.join(evidenceDir, 'stamp.json'), JSON.stringify(stamp, null, 2));

  // 4. Update evidence/index.json
  const indexFile = path.join(rootDir, 'evidence', 'index.json');
  let indexData: any = { item_slug: itemSlug, entries: [] };

  try {
    const content = await fs.readFile(indexFile, 'utf-8');
    indexData = JSON.parse(content);
    // If index exists but has different structure, try to adapt or reset if needed.
    // For this implementation, we assume the schema we defined.
    if (!indexData.entries) {
        indexData.entries = [];
    }
  } catch (e) {
    // File might not exist or be invalid, start fresh
  }

  // Add or update entry for this run's primary evidence ID (taking first from list or generated)
  const primaryEvidenceId = evidenceIds[0] || `EVD-${itemSlug}-${runId}`;

  // Check if entry exists
  const existingEntryIndex = indexData.entries.findIndex((e: any) => e.evidence_id === primaryEvidenceId);
  const newEntry = {
    evidence_id: primaryEvidenceId,
    files: [
      path.join('evidence', runId, 'report.json'),
      path.join('evidence', runId, 'metrics.json'),
      path.join('evidence', runId, 'stamp.json')
    ]
  };

  if (existingEntryIndex >= 0) {
    indexData.entries[existingEntryIndex] = newEntry;
  } else {
    indexData.entries.push(newEntry);
  }

  await fs.writeFile(indexFile, JSON.stringify(indexData, null, 2));

  return evidenceDir;
}
