#!/usr/bin/env -S npx tsx

import { execSync } from 'child_process';

console.log('=== PR Queue Triage Report ===');
console.log('Generated at: ' + new Date().toISOString());
console.log('');

try {
  // Try to use gh CLI
  const prsJson = execSync('gh pr list --state open --limit 100 --json number,title,labels,mergeable', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
  const prs = JSON.parse(prsJson);

  const conflicts = prs.filter((p: any) => p.mergeable === 'CONFLICTING');
  const mergeable = prs.filter((p: any) => p.mergeable === 'MERGEABLE');

  console.log('Queue Status:');
  console.log(`  Total Open: ${prs.length}`);
  console.log(`  Conflicting: ${conflicts.length}`);
  console.log(`  Mergeable: ${mergeable.length}`);
  console.log('');

  if (conflicts.length > 0) {
    console.log('Conflicts (Action Required):');
    conflicts.forEach((p: any) => {
      console.log(`  #${p.number} ${p.title} (needs rebase)`);
    });
    console.log('');
  }

  const highPriority = prs.filter((p: any) => p.labels.some((l: any) => l.name.toLowerCase().includes('priority') || l.name.toLowerCase().includes('ga')));
  if (highPriority.length > 0) {
    console.log('High Priority Items:');
    highPriority.forEach((p: any) => {
       console.log(`  #${p.number} ${p.title}`);
    });
  }

} catch (e) {
  // Fallback if gh is missing or fails
  console.log('⚠️ GitHub CLI (gh) not found or failed. Showing mock data for verification.');
  console.log('');
  console.log('Queue Status:');
  console.log('  Total Open: 145');
  console.log('  Conflicting: 12');
  console.log('  Mergeable: 133');
  console.log('');
  console.log('Top Priorities:');
  console.log('  #15521 (GA Release Automation) - High Priority');
  console.log('  #15522 (Readiness Dashboard) - High Priority');
  console.log('');
  console.log('Conflicts:');
  console.log('  #15400 - needs rebase');
}

console.log('');
console.log('Action Items:');
console.log('  Run `make mt-triage` to label conflicting PRs.');
