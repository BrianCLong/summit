import * as fs from 'fs';
import * as process from 'process';

const SEMVER_LABELS = ['major', 'minor', 'patch'];

interface PullRequestLabel {
  name: string;
}

interface PullRequestEvent {
  pull_request?: {
    labels: PullRequestLabel[];
  };
}

function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  const mockLabelsEnv = process.env.MOCK_LABELS; // For local/fixture testing "patch,minor"

  let labels: string[] = [];

  if (mockLabelsEnv !== undefined) {
    labels = mockLabelsEnv.split(',').map(l => l.trim()).filter(Boolean);
    console.log(`[Fixture Mode] Using mock labels: ${JSON.stringify(labels)}`);
  } else if (eventPath) {
    try {
      if (!fs.existsSync(eventPath)) {
        console.error(`Error: GITHUB_EVENT_PATH set to '${eventPath}' but file does not exist.`);
        process.exit(1);
      }
      const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8')) as PullRequestEvent;
      if (!eventData.pull_request) {
        console.log('Not a pull request event. Skipping check.');
        process.exit(0);
      }
      labels = eventData.pull_request.labels.map(l => l.name);
      console.log(`[CI Mode] Found PR labels: ${JSON.stringify(labels)}`);
    } catch (error) {
      console.error('Error reading event payload:', error);
      process.exit(1);
    }
  } else {
    console.error('Error: No input source found. Set GITHUB_EVENT_PATH or MOCK_LABELS.');
    process.exit(1);
  }

  const foundSemverLabels = labels.filter(label => SEMVER_LABELS.includes(label));

  if (foundSemverLabels.length === 0) {
    console.error(`Error: No SemVer label found. Please add one of: ${SEMVER_LABELS.join(', ')}.`);
    process.exit(1);
  }

  if (foundSemverLabels.length > 1) {
    console.error(`Error: Multiple SemVer labels found (${foundSemverLabels.join(', ')}). Please provide exactly one.`);
    process.exit(1);
  }

  console.log(`Success: Found valid SemVer label '${foundSemverLabels[0]}'.`);
}

main();
