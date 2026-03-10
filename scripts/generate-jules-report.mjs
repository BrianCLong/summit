import fs from 'fs';
import path from 'path';

// Parse PRs
let duplicatePRs = false;
let julesPrs = [];
try {
  const prs = JSON.parse(fs.readFileSync('prs.json', 'utf8'));
  julesPrs = julesPrs.concat(prs.filter(pr => (pr.author && pr.author.login && pr.author.login.toLowerCase() === 'jules') || (pr.labels && pr.labels.some(l => l.name && l.name.toLowerCase() === 'jules'))));
} catch(e) {}
try {
  const prOpen = JSON.parse(fs.readFileSync('pr-open.json', 'utf8'));
  julesPrs = julesPrs.concat(prOpen.filter(pr => (pr.author && pr.author.login && pr.author.login.toLowerCase() === 'jules') || (pr.labels && pr.labels.some(l => l.name && l.name.toLowerCase() === 'jules'))));
} catch(e) {}

const titles = julesPrs.map(pr => pr.title);
if (titles.length !== new Set(titles).size) {
  duplicatePRs = true;
}

// Parse Agent Activity
let activeSessions = [];
let scopeDrift = false;
try {
  const activity = fs.readFileSync('AGENT_ACTIVITY.md', 'utf8');
  const lines = activity.split('\n');
  for (const line of lines) {
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length > 5 && parts[4] === 'Jules' && (parts[5] === 'in-progress' || parts[5] === 'ready-for-review')) {
        const session = {
          task_id: parts[1],
          branch: parts[2],
          pr: parts[3],
          agent: parts[4],
          status: parts[5],
          notes: parts[6]
        };
        activeSessions.push(session);

        // Scope drift check: The task requires scheduled Jules sessions to only match:
        // monitoring, benchmark expansion, adapters, leaderboard, research
        const validCategories = ['monitoring', 'benchmark expansion', 'adapters', 'leaderboard', 'research'];
        const isMatch = validCategories.some(cat => session.notes.toLowerCase().includes(cat) || session.branch.toLowerCase().includes(cat));

        if (!isMatch) {
          scopeDrift = true;
        }
      }
    }
  }
} catch (e) {}

// Parse violations
let deterministicViolations = false;
const evalsDir = 'artifacts/ai-evals';
const violations = [];

if (fs.existsSync(evalsDir)) {
  const files = fs.readdirSync(evalsDir);
  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const content = fs.readFileSync(path.join(evalsDir, file), 'utf8');
        const data = JSON.parse(content);
        if (data.timestamp) {
          deterministicViolations = true;
          violations.push({ file, field: 'timestamp' });
        }
      } catch(e) {}
    }
  }
}

// Generate report
const report = {
  active_sessions: activeSessions,
  scope_drift_detected: scopeDrift,
  duplicate_prs_detected: duplicatePRs,
  deterministic_violations: violations,
  daily_summary: `Generated daily report. Active sessions: ${activeSessions.length}. Scope drift: ${scopeDrift}. Duplicate PRs: ${duplicatePRs}. Violations: ${violations.length}.`
};

fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/jules-orchestration-report.json', JSON.stringify(report, null, 2));

console.log("Successfully generated artifacts/jules-orchestration-report.json");
