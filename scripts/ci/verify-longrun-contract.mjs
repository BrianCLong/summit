import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import yaml from 'js-yaml';

const workspaceRoot = process.cwd();
const jobsDir = path.join(workspaceRoot, '.maestro', 'jobs');
const evidenceDir = path.join(workspaceRoot, '.maestro', 'evidence');
const waiverPath = path.join(workspaceRoot, '.maestro', 'waivers', 'longrun.json');

const loadJobSpec = (jobPath) => {
  const raw = fs.readFileSync(jobPath, 'utf-8');
  if (jobPath.endsWith('.json')) {
    return JSON.parse(raw);
  }
  return yaml.load(raw);
};

const collectJobSpecs = () => {
  if (!fs.existsSync(jobsDir)) {
    return [];
  }

  return fs
    .readdirSync(jobsDir)
    .filter((entry) => /\.(ya?ml|json)$/i.test(entry))
    .map((entry) => path.join(jobsDir, entry))
    .filter((filePath) => fs.statSync(filePath).isFile());
};

const loadWaiver = () => {
  if (!fs.existsSync(waiverPath)) {
    return null;
  }
  const data = JSON.parse(fs.readFileSync(waiverPath, 'utf-8'));
  return data;
};

const validateWaiver = (waiver) => {
  if (!waiver.reason || !waiver.expires_at) {
    throw new Error('LongRunJob waiver must include reason and expires_at.');
  }
  const expiry = Date.parse(waiver.expires_at);
  if (Number.isNaN(expiry)) {
    throw new Error('LongRunJob waiver expires_at must be a valid date-time.');
  }
  if (expiry <= Date.now()) {
    throw new Error('LongRunJob waiver has expired.');
  }
  return waiver;
};

const verifyEvidence = (jobId) => {
  const manifestPath = path.join(evidenceDir, `${jobId}.manifest.json`);
  const bundlePath = path.join(evidenceDir, `${jobId}.tar.gz`);

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing evidence manifest for ${jobId} at ${manifestPath}`);
  }
  if (!fs.existsSync(bundlePath)) {
    throw new Error(`Missing evidence bundle for ${jobId} at ${bundlePath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  if (!manifest.completion || manifest.completion.verified !== true) {
    throw new Error(
      `Completion contract not verified for ${jobId} (status: ${manifest.completion?.status ?? 'unknown'})`,
    );
  }

  return manifest;
};

const main = () => {
  const jobPaths = collectJobSpecs();
  if (jobPaths.length === 0) {
    const waiver = loadWaiver();
    if (waiver) {
      const validated = validateWaiver(waiver);
      console.log(`Governed exception applied: ${validated.reason}`);
      return;
    }
    console.log(
      'Intentionally constrained: no LongRunJob specs declared; strict gate skipped.',
    );
    return;
  }

  console.log('Strict LongRunJob contract verification:');
  for (const jobPath of jobPaths) {
    const job = loadJobSpec(jobPath);
    const jobId = job.job_id;
    if (!jobId) {
      throw new Error(`Missing job_id in ${jobPath}`);
    }
    const manifest = verifyEvidence(jobId);
    console.log(
      `- ${jobId}: verified=${manifest.completion.verified} reason=${manifest.completion.reason}`,
    );
  }
};

main();
