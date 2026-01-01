const fs = require('fs');

try {
  const fileContents = fs.readFileSync('pr-open.json', 'utf8');
  const prs = JSON.parse(fileContents);

  let markdown = `# PR Triage & Merge Plan (v2.0.0-rc.1)\n\n`;
  markdown += `| PR | Title | Author | Risk | Type | Decision | Notes |\n`;
  markdown += `|---|---|---|---|---|---|---|\n`;

  prs.slice(0, 56).forEach(pr => { // Limit to 56 as per prompt scope
      const title = pr.title;
      const number = pr.number;
      const author = pr.author.login;

      let risk = 'Low';
      let type = 'chore';
      let decision = 'Merge';
      let notes = 'Standard';

      const labels = pr.labels.map(l => l.name).join(', ');

      if (labels.includes('risk:high') || title.includes('security') || title.includes('auth')) {
          risk = 'High';
          notes = 'Requires Security Review';
      }

      if (title.startsWith('feat')) {
          type = 'Feature';
          if (risk === 'High') decision = 'Gate/Post-GA';
      } else if (title.startsWith('fix')) {
          type = 'Fix';
          decision = 'Merge (Critical)';
      }

      markdown += `| #${number} | ${title.replace(/\|/g, '-')} | ${author} | ${risk} | ${type} | ${decision} | ${notes} |\n`;
  });

  markdown += `\n## Rollback Plan\n\n- If build fails: Revert last PR batch.\n- If staging smoke test fails: Rollback to v1.9.9.\n`;

  fs.writeFileSync('ops/ga-rc1/pr-triage.md', markdown);
  console.log('pr-triage.md generated');

} catch (e) {
  console.error(e);
}
