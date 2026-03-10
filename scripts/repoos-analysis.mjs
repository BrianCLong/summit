#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs/promises';

const concernPatterns = {
  'security': /security|auth|cve|vulnerability/i,
  'performance': /perf|performance|optimize/i,
  'ai-governance': /ai|ml|model|governance/i,
  'graph': /graph|neo4j|cypher/i,
  'mobile': /mobile|ios|android/i,
  'cicd': /ci.*cd|github|workflow/i,
  'frontend': /frontend|ui|react/i,
  'backend': /backend|api|server/i
};

function detectConcerns(pr) {
  const text = `${pr.title} ${pr.headRefName}`.toLowerCase();
  const concerns = [];
  for (const [concern, pattern] of Object.entries(concernPatterns)) {
    if (pattern.test(text)) concerns.push(concern);
  }
  return concerns.length > 0 ? concerns : ['general'];
}

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║           RepoOS PR ANALYSIS & DEPLOYMENT                    ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const prs = JSON.parse(execSync('gh pr list --limit 100 --json number,title,headRefName,createdAt,author --state open', { encoding: 'utf8' }));

const concernMap = new Map();
const prAnalysis = [];

for (const pr of prs) {
  const concerns = detectConcerns(pr);
  const age = Math.round((Date.now() - new Date(pr.createdAt)) / 86400000);
  
  for (const concern of concerns) {
    if (!concernMap.has(concern)) concernMap.set(concern, []);
    concernMap.get(concern).push(pr.number);
  }
  
  prAnalysis.push({ number: pr.number, title: pr.title, concerns, age });
}

const report = {
  timestamp: new Date().toISOString(),
  totalPRs: prs.length,
  concerns: Object.fromEntries(Array.from(concernMap.entries()).map(([c, p]) => [c, p.length])),
  ageDistribution: {
    fresh: prAnalysis.filter(p => p.age <= 1).length,
    recent: prAnalysis.filter(p => p.age <= 7).length,
    aging: prAnalysis.filter(p => p.age <= 30).length,
    stale: prAnalysis.filter(p => p.age > 30).length
  },
  prDetails: prAnalysis
};

await fs.mkdir('artifacts', { recursive: true });
await fs.writeFile('artifacts/repoos-analysis.json', JSON.stringify(report, null, 2));

console.log(`Total PRs: ${report.totalPRs}\n`);
console.log('Top Concerns:');
Array.from(concernMap.entries()).sort((a,b) => b[1].length - a[1].length).slice(0,8).forEach(([c,p]) => {
  console.log(`  ${c.padEnd(20)} ${p.length} PRs`);
});
console.log(`\n✓ Report saved: artifacts/repoos-analysis.json\n`);
