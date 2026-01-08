import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';

const { values } = parseArgs({
  options: {
    sha: { type: 'string' },
    channel: { type: 'string' },
  },
});

if (!values.sha || !values.channel) {
  console.error('Usage: node generate-war-room-checklist.mjs --sha <commit-sha> --channel <channel>');
  process.exit(1);
}

const shortSha = values.sha.substring(0, 7);
const fileName = `WAR_ROOM_${values.channel}_${shortSha}.md`;
const outputPath = path.resolve(process.cwd(), '.artifacts', fileName);

const content = `
# War Room Checklist: GA Cut for ${values.sha}

- **Channel**: ${values.channel}
- **Target SHA**: \`${values.sha}\`
- **Date**: ${new Date().toISOString()}

---

## Roles

| Role            | Assignee | Status      |
|-----------------|----------|-------------|
| Release Lead    | @(lead)  | Pending     |
| CI Operator     | @(ci)    | Pending     |
| Scribe          | @(scribe)| Pending     |
| Security        | @(sec)   | Pending     |
| Infra/Deploy    | @(infra) | Pending     |

---

## Preconditions (Dry-Run Agenda)

- [ ] **Eligibility Confirmed**: Governance check for SHA \`${values.sha}\` returned **ELIGIBLE**.
- [ ] **Approval Gate Configured**: The \`release-approval\` environment is correctly configured with required reviewers.
- [ ] **Rollback Runbook Present**: The \`ROLLBACK.md\` runbook is up-to-date.
- [ ] **Last-Known-Good Reference Known**: The previous stable release tag is identified as \`ga-YYYY.MM.DD-shortsha\`.

---

## Action Items

- [ ] **Decision**: Go / No-Go for the \`apply=true\` run.
- [ ] **Approval**: Trigger the \`release-cut\` workflow and secure approvals.
- [ ] **Monitor**: Observe the \`release-cut\` and subsequent \`post-release-verify\` workflows.
- [ ] **Communicate**: Announce release status upon successful completion.
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, content.trim());

console.log(`War room checklist generated at: ${outputPath}`);
