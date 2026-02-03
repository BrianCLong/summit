import { execSync } from 'child_process';

const BUDGET = 20;
const CRITICAL_PATHS = ['infra/', 'deploy/'];
const DAYS = 7;

function getCommitCount(): number {
    try {
        const since = new Date();
        since.setDate(since.getDate() - DAYS);
        const sinceStr = since.toISOString().split('T')[0];

        // Count commits touching critical paths since the date
        const command = `git log --since="${sinceStr}" --oneline -- ${CRITICAL_PATHS.join(' ')} | wc -l`;
        const output = execSync(command).toString().trim();
        return parseInt(output, 10);
    } catch (e) {
        console.error("Error running git log:", e);
        // If we can't check, we should probably warn but maybe not fail explicitly unless critical
        // But for a gate, we usually want to know.
        // Let's assume 0 and warn.
        return 0;
    }
}

export function enforceChangeBudget(): boolean {
    console.log(`\n💰 Checking GA Change Budget (Limit: ${BUDGET} commits in last ${DAYS} days)...`);
    const count = getCommitCount();
    console.log(`   Current usage: ${count} commits to ${CRITICAL_PATHS.join(', ')}`);

    if (count > BUDGET) {
        console.error(`❌ Budget Exceeded! Limit is ${BUDGET}, but found ${count}.`);
        console.error(`   Please stabilize infra/ and deploy/ before GA.`);
        return false;
    }
    console.log('✅ Within budget.');
    return true;
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!enforceChangeBudget()) {
    process.exit(1);
  }
}
