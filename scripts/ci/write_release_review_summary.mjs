import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SUMMARY_FILE = process.env.GITHUB_STEP_SUMMARY;
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || 'artifacts/release-review';
const DECISION_FILE = process.env.DECISION_FILE || 'artifacts/signoff/decision.json';
const RELEASE_STATUS_FILE = 'dist/release/release-status.json';

// --- Helper to read JSON ---
function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(`Failed to read JSON at ${path}:`, e.message);
    return null;
  }
}

// --- Main ---
async function main() {
  console.log('📝 Generating Release Review Summary...');

  // 1. Read Decision Data
  let decision = readJson(DECISION_FILE);
  let source = 'decision.json';

  // Fallback to release-status.json if decision.json is missing
  if (!decision) {
    console.warn(`⚠️  ${DECISION_FILE} not found. Falling back to ${RELEASE_STATUS_FILE}.`);
    const status = readJson(RELEASE_STATUS_FILE);
    if (status) {
      source = 'release-status.json';
      // Map release-status to decision format
      decision = {
        eligible: status.status === 'ready',
        reasons: status.blockedReasons ? status.blockedReasons.map(r => r.message || r.code) : [],
        // Additional metadata if needed
        channel: status.channel,
        tag: status.tag
      };
    }
  }

  if (!decision) {
    console.error('❌ No decision data found. Cannot generate summary.');
    process.exit(1);
  }

  const isEligible = decision.eligible === true || decision.status === 'ELIGIBLE'; // Handle both formats if needed
  const decisionText = isEligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';
  const icon = isEligible ? '✅' : '🚫';

  // Extract reasons
  let reasons = decision.reasons || decision.top_reasons || [];
  if (reasons.length === 0 && !isEligible) {
    reasons = ['Unknown reasons (check logs)'];
  }
  const topReasons = reasons.slice(0, 3);

  // 2. Identify Artifacts
  // Paths can be overridden via env vars
  const artifactMap = {
    'Evidence Bundle': process.env.ARTIFACT_BUNDLE || 'dist/release/release-manifest.json',
    'Dashboard': process.env.ARTIFACT_DASHBOARD || 'dist/release/release-status.json',
    'Sign-off Checklist': process.env.ARTIFACT_CHECKLIST || 'dist/release/check-checklist.md',
    'Release Notes': process.env.ARTIFACT_NOTES || 'dist/release/release-notes.md',
    'Waiver Report': process.env.ARTIFACT_WAIVERS || 'dist/release/waivers.md',
    'Release-cut Plan': process.env.ARTIFACT_PLAN || 'dist/release/cut-plan.md'
  };

  const artifactLinks = [];
  for (const [label, path] of Object.entries(artifactMap)) {
    // In a real CI, we might link to the uploaded artifact URL.
    // For now, we just indicate if it exists in the workspace.
    const exists = existsSync(path);
    const filename = path.split('/').pop();
    if (exists) {
        artifactLinks.push(`- **${label}**: \`${filename}\` (Found)`);
    } else {
        if (label === 'Waiver Report' || label === 'Release-cut Plan') {
             artifactLinks.push(`- **${label}**: None`);
        } else {
             artifactLinks.push(`- **${label}**: ❌ Missing`);
        }
    }
  }

  // 3. Build Markdown Content
  const channel = process.env.CHANNEL || decision.channel || 'unknown';
  const sha = process.env.GITHUB_SHA || 'unknown';
  const shortSha = sha.substring(0, 7);

  const summaryMarkdown = `
## Release Review Summary — ${channel} — ${shortSha}

### Decision: ${icon} ${decisionText}

${topReasons.length > 0 ? '**Top Reasons:**\n' + topReasons.map(r => `* ${r}`).join('\n') : (isEligible ? '_No blocking issues identified._' : '')}

### Artifact Index
${artifactLinks.join('\n')}

### Regeneration Commands
To regenerate artifacts locally:
\`\`\`bash
node scripts/release/build-release-status.mjs
node scripts/release/release-bundle.mjs --tag <tag>
\`\`\`
*(Note: Scripts updated to match repository state)*
`;

  // 4. Write to GITHUB_STEP_SUMMARY
  if (SUMMARY_FILE) {
    try {
      const fs = await import('node:fs');
      fs.appendFileSync(SUMMARY_FILE, summaryMarkdown);
      console.log('✅ Wrote to GITHUB_STEP_SUMMARY');
    } catch (e) {
      console.error('❌ Failed to write to GITHUB_STEP_SUMMARY:', e);
    }
  } else {
      console.log('ℹ️  GITHUB_STEP_SUMMARY not set. Outputting to stdout:');
      console.log(summaryMarkdown);
  }

  // 5. Write to Artifact File
  if (!existsSync(ARTIFACTS_DIR)) {
    mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }
  const summaryPath = join(ARTIFACTS_DIR, 'summary.md');
  writeFileSync(summaryPath, summaryMarkdown);
  console.log(`✅ Wrote summary artifact to ${summaryPath}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
