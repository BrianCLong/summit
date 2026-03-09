import * as fs from 'fs';
import * as path from 'path';

interface PRArtifact {
  prNumber: number;
  prTitle: string;
  prAuthor: string;
  closedAt: string;
  merged: boolean;
  evidenceId: string;
}

const ARTIFACT_PATH = path.join(process.cwd(), 'artifacts', 'pr-artifacts.json');
const REPOOS_ARTIFACTS_DIR = path.join(process.cwd(), 'repoos', 'artifacts');

function main() {
  const prNumber = process.env.PR_NUMBER;
  const prTitle = process.env.PR_TITLE;
  const prAuthor = process.env.PR_AUTHOR;
  const prMerged = process.env.PR_MERGED === 'true';

  if (!prNumber) {
    console.error('No PR_NUMBER provided.');
    process.exit(1);
  }

  const timestamp = new Date().toISOString();

  const newEntry: PRArtifact = {
    prNumber: parseInt(prNumber, 10),
    prTitle: prTitle || 'Unknown Title',
    prAuthor: prAuthor || 'Unknown Author',
    closedAt: timestamp,
    merged: prMerged,
    evidenceId: `EVID:pr-artifact:${prNumber}:${Date.now()}`
  };

  // 1. Update the central pr-artifacts.json
  let artifacts: PRArtifact[] = [];
  if (fs.existsSync(ARTIFACT_PATH)) {
    try {
      const data = fs.readFileSync(ARTIFACT_PATH, 'utf8');
      artifacts = JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse existing artifacts, starting fresh', e);
    }
  } else {
    fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
  }

  // Remove existing entry if re-archiving for some reason
  artifacts = artifacts.filter(a => a.prNumber !== newEntry.prNumber);
  artifacts.push(newEntry);
  fs.writeFileSync(ARTIFACT_PATH, JSON.stringify(artifacts, null, 2), 'utf8');
  console.log(`Archived PR #${prNumber} to ${ARTIFACT_PATH} successfully.`);

  // 2. Save an individual entry in repoos/artifacts/
  if (!fs.existsSync(REPOOS_ARTIFACTS_DIR)) {
    fs.mkdirSync(REPOOS_ARTIFACTS_DIR, { recursive: true });
  }
  const individualArtifactPath = path.join(REPOOS_ARTIFACTS_DIR, `pr-${prNumber}.json`);
  fs.writeFileSync(individualArtifactPath, JSON.stringify(newEntry, null, 2), 'utf8');
  console.log(`Archived individual PR #${prNumber} to ${individualArtifactPath} successfully.`);
}

main();
