
import { writeFileSync, mkdirSync } from 'fs';
import { EOL } from 'os';

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      options[key] = value;
      i++;
    }
  }
  return options;
}

function getRefName(ref) {
  if (!ref) return 'unknown-ref';
  return ref.split('/').pop();
}

function getChannel(refName) {
    if (refName.startsWith('rc-')) return 'rc';
    if (refName.startsWith('ga-')) return 'ga';
    return 'unknown';
}

async function main() {
  const options = parseArgs();
  const { ref, sha, status } = options;

  if (!ref || !sha || !status) {
    console.error('Missing required arguments: --ref, --sha, --status');
    process.exit(1);
  }

  const refName = getRefName(ref);
  const channel = getChannel(refName);
  const timestamp = new Date().toISOString();
  const outcome = status === 'success' ? 'PASS' : 'FAIL';

  const evidence = {
    ref,
    refName,
    sha,
    channel,
    timestamp,
    status: outcome,
    smokeTests: {
      outcome: status,
      commands: [
        'pnpm typecheck',
        'pnpm build',
        'pnpm --filter intelgraph-server test:unit',
        'pnpm --filter intelgraph-client test',
      ],
    },
    rerunInstructions: `
To rerun this verification locally, check out the tag and run the verification steps:

git checkout ${refName}
pnpm install
pnpm typecheck
pnpm build
pnpm --filter intelgraph-server test:unit
pnpm --filter intelgraph-client test
    `,
    preReleaseEvidencePointer: `
The pre-release evidence bundle for this release can be found in the artifacts of the workflow run that created the release.
It should be named 'release-evidence-bundle-${sha.substring(0, 7)}' or similar.
    `
  };

  const outputDir = `artifacts/post-release/${refName}`;
  mkdirSync(outputDir, { recursive: true });

  const jsonContent = JSON.stringify(evidence, null, 2);
  writeFileSync(`${outputDir}/summary.json`, jsonContent);
  console.log(`Wrote JSON evidence to ${outputDir}/summary.json`);


  const markdownContent = `
# Post-Release Verification Summary

| Field                   | Value                               |
| ----------------------- | ----------------------------------- |
| **Git Ref**             | \`${evidence.ref}\`                 |
| **SHA**                 | \`${evidence.sha}\`                 |
| **Channel**             | \`${evidence.channel}\`             |
| **Timestamp**           | \`${evidence.timestamp}\`           |
| **Overall Status**      | **${evidence.status}**              |

## Smoke Tests

The following smoke test commands were executed with the outcome: **${evidence.smokeTests.outcome}**

\`\`\`
${evidence.smokeTests.commands.join(EOL)}
\`\`\`

---

## Rerun Instructions

${evidence.rerunInstructions}

---

## Pre-Release Evidence

${evidence.preReleaseEvidencePointer}
`;

  writeFileSync(`${outputDir}/summary.md`, markdownContent.trim());
  console.log(`Wrote Markdown evidence to ${outputDir}/summary.md`);

}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
