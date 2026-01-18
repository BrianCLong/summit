import fs from 'node:fs';
import path from 'node:path';

const runId = process.env.RUN_ID || 'test-run';
const artifactDir = process.argv[2] || `artifacts/telemetry/${runId}`;

if (!fs.existsSync(artifactDir)) {
  console.error(`Directory not found: ${artifactDir}`);
  process.exit(1);
}

try {
  const jobsContent = fs.readFileSync(path.join(artifactDir, 'jobs.csv'), 'utf8');
  const jobs = jobsContent.trim().split('\n').filter(Boolean).map(l => {
    // CSV parsing might need to be more robust if names contain commas, but assuming simple format for now
    const parts = l.split(',');
    // Extract last 4 parts as duration, runner, name, id might be mixed up in simple split if name has commas
    // The prompt says: ($j.id)+","+($j.name)+","+($j.runner_name)+","+($j.duration)
    // So: id, name, runner, duration
    return parts;
  });

  const gitContent = fs.readFileSync(path.join(artifactDir, 'git_context.json'), 'utf8');
  const git = JSON.parse(gitContent);

  const out = {
    run: {
      run_id: runId,
      repo: process.env.GITHUB_REPOSITORY || 'unknown/repo',
      sha: git.sha,
      config_hash: git.config_hash,
      files_changed: git.files_changed,
      loc_delta: git.loc_delta,
      parent_sha: git.parent_sha
    },
    jobs: jobs.map(([id, name, runner, dur]) => ({
      job_id: id,
      run_id: runId,
      name,
      runner_label: runner,
      duration_s: Number(dur) || 0
    }))
  };

  const outFile = path.join(artifactDir, 'ingest.json');
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log(`Wrote ingest.json to ${outFile}`);

} catch (err) {
  console.error('Error processing telemetry:', err);
  process.exit(1);
}
