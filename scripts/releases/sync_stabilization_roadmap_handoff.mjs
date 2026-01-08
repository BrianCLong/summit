import fs from 'fs';
import path from 'path';

const REPO_ROOT = process.cwd();
const CANDIDATES_PATH = path.join(REPO_ROOT, 'artifacts/stabilization/derived-candidates.json');
const OUTPUT_DIR = path.join(REPO_ROOT, 'artifacts/stabilization/roadmap-handoff');
const DRAFTS_DIR = path.join(OUTPUT_DIR, 'drafts');
const DIGEST_PATH = path.join(OUTPUT_DIR, 'digest.md');

function generateDraftContent(slug, details) {
  return `<!-- STAB_ROADMAP_KEY: ${slug} -->

# Roadmap Candidate: ${slug}

## Problem Statement
Based on the latest stabilization retrospective, the theme of **${slug}** has been identified as a candidate for a systemic fix.

${details.reason}

## Evidence
- **Source:** [Stabilization Retrospective Report](../../retrospective-report.json)
- **Derived Candidates:** [derived-candidates.json](../derived-candidates.json)

## Proposed Scope
This is a proposal for a systemic fix, not a feature. The focus should be on improving the underlying process or system to prevent this issue from recurring.

## Acceptance Criteria
- A measurable improvement in the metric that triggered this candidate.
- A reduction in the number of weeks this candidate is triggered in future retrospectives.

## Risks and Dependencies
- TBD

## Owner Routing
- needs-triage
`;
}

function main() {
  if (!fs.existsSync(CANDIDATES_PATH)) {
    console.log('No derived candidates file found. Skipping draft generation.');
    return;
  }

  const candidates = JSON.parse(fs.readFileSync(CANDIDATES_PATH, 'utf8'));
  const candidateSlugs = Object.keys(candidates);

  if (candidateSlugs.length === 0) {
    console.log('No candidates to process.');
    return;
  }

  if (!fs.existsSync(DRAFTS_DIR)) {
    fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  }

  for (const slug of candidateSlugs) {
    const draftPath = path.join(DRAFTS_DIR, `ROADMAP_${slug}.md`);
    const content = generateDraftContent(slug, candidates[slug]);
    fs.writeFileSync(draftPath, content);
  }

  let digestContent = '# Stabilization Roadmap Handoff Digest\n\n';
  digestContent += `Generated on: ${new Date().toISOString()}\n\n`;
  digestContent += 'The following roadmap candidates have been derived from the latest stabilization retrospective:\n\n';

  for (const slug of candidateSlugs) {
    digestContent += `- [${slug}](./drafts/ROADMAP_${slug}.md)\n`;
  }

  fs.writeFileSync(DIGEST_PATH, digestContent);

  console.log(`Successfully generated ${candidateSlugs.length} roadmap drafts and a digest.`);
  console.log(`Output written to ${OUTPUT_DIR}`);
}

main();
