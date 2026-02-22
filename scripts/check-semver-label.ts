import { readFileSync } from 'fs';

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath) {
  console.error('GITHUB_EVENT_PATH not set');
  process.exit(1);
}

const eventData = JSON.parse(readFileSync(eventPath, 'utf8'));
const pr = eventData.pull_request;

if (!pr) {
  console.log('Not a pull request, skipping');
  process.exit(0);
}

// Get labels from the PR event
const labels = pr.labels ? pr.labels.map((l: any) => l.name) : [];

// ALSO Check body/AGENT-METADATA for labels if none are found in the event
if (labels.length === 0 && pr.body) {
    const validLabels = ['major', 'minor', 'patch', 'semver:major', 'semver:minor', 'semver:patch', 'norelease', 'documentation'];

    // Check Agent Metadata
    const metadataMatch = pr.body.match(/<!-- AGENT-METADATA:START -->([\s\S]*?)<!-- AGENT-METADATA:END -->/);
    if (metadataMatch) {
        try {
            const metadata = JSON.parse(metadataMatch[1]);
            if (metadata.tags && Array.isArray(metadata.tags)) {
                metadata.tags.forEach((tag: string) => {
                    if (validLabels.includes(tag) || validLabels.includes(`semver:${tag}`)) {
                         labels.push(tag.startsWith('semver:') ? tag : (validLabels.includes(tag) ? tag : `semver:${tag}`));
                    }
                });
            }
        } catch (e) {
            // ignore parse error
        }
    }

    // Simple body check
    validLabels.forEach(validLabel => {
        if (pr.body.includes(`[${validLabel}]`) || pr.body.includes(`label:${validLabel}`)) {
            labels.push(validLabel);
        }
    });
}

const semverLabels = labels.filter((l: string) =>
  ['major', 'minor', 'patch', 'semver:major', 'semver:minor', 'semver:patch', 'norelease', 'documentation'].includes(l)
);

if (semverLabels.length === 0) {
  console.log('::warning::No valid SemVer label found. Please add one of: major, minor, patch, semver:major, semver:minor, semver:patch, norelease, documentation');
  process.exit(1); // Fail the check
}

if (semverLabels.length > 1) {
  console.log('::warning::Multiple SemVer labels found. Please use only one.');
   process.exit(1);
}

console.log(`Found valid SemVer label: ${semverLabels[0]}`);
