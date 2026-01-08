
import { writeFileSync, readFileSync } from 'fs';
import { EOL } from 'os';

function generateSummary() {
  // These paths are relative to the repository root where the workflow checks out the code.
  // The action-download-artifact step is configured to place all artifacts into this directory.
  const decisionPath = './artifacts/signoff-artifacts/decision.json';
  const manifestPath = './artifacts/release-artifacts/manifest.json';
  const onePagerPath = './artifacts/one-pager-artifacts/onepager.md';
  const outputPath = './artifacts/dry-run/DRY_RUN_SUMMARY.md';

  let summary = `
# GA Cut Dry-Run Summary
| | |
|---|---|
| **Resolved SHA** | \`${process.env.GITHUB_SHA || 'N/A'}\` |
| **Workflow Run** | [Link](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}) |
| **Timestamp** | \`${new Date().toISOString()}\` |
`.trim();

  summary += EOL + EOL;

  // --- Decision ---
  try {
    const decisionData = JSON.parse(readFileSync(decisionPath, 'utf8'));
    summary += `## Sign-Off Decision` + EOL;
    summary += `**Outcome: ${decisionData.decision}**` + EOL + EOL;
    if (decisionData.reasons && decisionData.reasons.length > 0) {
      summary += `**Top Reasons:**` + EOL;
      summary += decisionData.reasons.map(reason => `- ${reason}`).join(EOL) + EOL;
    }
  } catch (error) {
    summary += `## Sign-Off Decision` + EOL;
    summary += `**Missing Input:** Could not read \`decision.json\`.`+ EOL;
    summary += `*To fix: Ensure the sign-off job runs and produces a valid \`decision.json\` artifact.*` + EOL;
  }

  summary += EOL;

  // --- Evidence Bundle ---
  try {
    const manifestData = JSON.parse(readFileSync(manifestPath, 'utf8'));
    summary += `## Evidence Bundle` + EOL;
    summary += `**Bundle Name:** \`${manifestData.bundleName || 'N/A'}\`` + EOL + EOL;
    summary += `**Included Reports (${manifestData.files.length}):**` + EOL;
    summary += manifestData.files.map(file => `- \`${file.path}\` (${file.hash.slice(0,12)})`).join(EOL) + EOL;
  } catch (error) {
    summary += `## Evidence Bundle` + EOL;
    summary += `**Missing Input:** Could not read bundle \`manifest.json\`.`+ EOL;
    summary += `*To fix: Ensure the evidence bundle generation job runs and produces a valid manifest artifact.*` + EOL;
  }

  summary += EOL;

  // --- One Pager ---
  try {
    const onePagerContent = readFileSync(onePagerPath, 'utf8');
    summary += `## Release Readiness One-Pager` + EOL + EOL;
    summary += `> Note: The following is a transclusion of the one-pager artifact.` + EOL + EOL;
    summary += onePagerContent + EOL;
  } catch (error) {
    summary += `## Release Readiness One-Pager` + EOL;
    summary += `**Missing Input:** Could not read the one-pager markdown file.`+ EOL;
    summary += `*To fix: Ensure the one-pager generation job runs and produces a valid markdown artifact.*` + EOL;
  }

  writeFileSync(outputPath, summary);
  console.log(`Dry-run summary written to ${outputPath}`);
}

generateSummary();
