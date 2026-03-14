import * as fs from 'fs';
import * as path from 'path';

interface DriftResult {
  file: string;
  non_deterministic_fields: string[];
  status: 'STABLE' | 'DRIFT_DETECTED';
}

async function checkDeterminism() {
  const baselinePath = path.resolve('artifacts/ai-evals');
  const latestPath = path.resolve('artifacts/benchmarks/graphrag');
  const results: DriftResult[] = [];

  if (!fs.existsSync(baselinePath)) {
    console.warn(`Baseline directory ${baselinePath} not found. Skipping comparison.`);
    writeOutput({ status: 'SKIPPED', message: 'No baseline found' });
    return;
  }

  // Files to compare
  const filesToCheck = ['metrics.json', 'report.json', 'stamp.json'];

  for (const filename of filesToCheck) {
    const baselineFile = path.join(baselinePath, filename);
    const latestFile = path.join(latestPath, filename);

    if (!fs.existsSync(baselineFile)) {
      continue;
    }

    // For local dev, if latest doesn't exist, we skip comparison
    if (!fs.existsSync(latestFile)) {
       console.log(`Latest file ${latestFile} not found, skipping comparison.`);
       continue;
    }

    try {
      const baselineContent = fs.readFileSync(baselineFile, 'utf8');
      const latestContent = fs.readFileSync(latestFile, 'utf8');

      const baselineData = JSON.parse(baselineContent);
      const latestData = JSON.parse(latestContent);
      const detectedFields: string[] = [];

      // Recursive function to compare and find non-deterministic fields
      function compareObjects(baseline: any, latest: any, prefix = '') {
        if (!baseline || typeof baseline !== 'object' || !latest || typeof latest !== 'object') {
            if (baseline !== latest) {
                detectedFields.push(prefix);
            }
            return;
        }

        const allKeys = new Set([...Object.keys(baseline), ...Object.keys(latest)]);

        for (const key of allKeys) {
          const fieldPath = prefix ? `${prefix}.${key}` : key;

          if (!(key in baseline) || !(key in latest)) {
             detectedFields.push(`${fieldPath} (added/removed)`);
             continue;
          }

          const valB = baseline[key];
          const valL = latest[key];

          if (typeof valB === 'object' && typeof valL === 'object') {
            compareObjects(valB, valL, fieldPath);
          } else if (valB !== valL) {
             detectedFields.push(fieldPath);
          }
        }
      }

      compareObjects(baselineData, latestData);

      results.push({
        file: filename,
        non_deterministic_fields: detectedFields.sort(),
        status: detectedFields.length > 0 ? 'DRIFT_DETECTED' : 'STABLE',
      });
    } catch (e) {
      console.error(`Error processing ${filename}:`, e);
      results.push({
        file: filename,
        non_deterministic_fields: [],
        status: 'DRIFT_DETECTED', // Consider error as drift/failure
      });
    }
  }

  // Sort deterministically
  const sortedResults = results.sort((a, b) => a.file.localeCompare(b.file));
  const hasDrift = sortedResults.some(r => r.status === 'DRIFT_DETECTED');

  const finalOutput = {
    overall_status: hasDrift ? 'DRIFT_DETECTED' : 'STABLE',
    files: sortedResults
  };

  writeOutput(finalOutput);

  if (hasDrift) {
      const driftDetails = sortedResults
          .filter(r => r.status === 'DRIFT_DETECTED')
          .map(r => `- **${r.file}**: ${r.non_deterministic_fields.join(', ')}`)
          .join('\n');

      await createIssue('🚨 Determinism Drift Detected', `Non-deterministic fields detected in benchmark artifacts:\n\n${driftDetails}`);
  }
}

async function createIssue(title: string, body: string) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) {
    console.log(`[Dry Run Issue] ${title}\n${body}`);
    return;
  }

  try {
    const url = `https://api.github.com/repos/${repo}/issues`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, body, labels: ['monitoring', 'determinism-drift'] })
    });

    if (!res.ok) {
       console.error(`Failed to create issue: ${res.status} ${res.statusText}`);
    } else {
       console.log(`Successfully created issue: ${title}`);
    }
  } catch (e) {
    console.error('Error creating issue:', e);
  }
}

function writeOutput(data: any) {
  const outPath = path.resolve('artifacts/monitoring/determinism-drift.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n');
  console.log(`Wrote determinism drift data to ${outPath}`);
}

checkDeterminism().catch(console.error);
