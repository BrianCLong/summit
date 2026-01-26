import fs from 'fs';
import path from 'path';
import { ConstraintSystem } from '../../server/src/autonomous/constraint-system.js';

// Ensure evidence directory exists
const EVIDENCE_DIR = path.resolve(process.cwd(), 'evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}
const EVENT_LOG_FILE = path.resolve(EVIDENCE_DIR, 'release_abort_events.json');

async function main() {
  const system = new ConstraintSystem(console);

  // Mock Context - In reality, this would fetch from Prometheus/Jira
  const context = {
    errorBudgetBurn: process.env.MOCK_ERROR_BUDGET ? parseFloat(process.env.MOCK_ERROR_BUDGET) : 0.05, // 5% default
    isBlackoutWindow: process.env.MOCK_BLACKOUT === 'true',
    dependencyAgeDays: process.env.MOCK_DEP_AGE ? parseInt(process.env.MOCK_DEP_AGE) : 30
  };

  console.log('Evaluating Release Constraints against context:', context);

  const result = system.evaluateRelease(context);

  if (!result.compliant) {
    console.error('❌ Release Constraints Violated:');
    result.violations.forEach(v => {
      console.error(` - ${v.message}`);
    });

    // Log the abort event
    const event = {
      timestamp: new Date().toISOString(),
      action: 'RELEASE_ABORTED',
      violations: result.violations,
      context
    };

    let events = [];
    if (fs.existsSync(EVENT_LOG_FILE)) {
      try {
        events = JSON.parse(fs.readFileSync(EVENT_LOG_FILE, 'utf8'));
      } catch (e) {
        // ignore malformed file
      }
    }
    events.push(event);
    fs.writeFileSync(EVENT_LOG_FILE, JSON.stringify(events, null, 2));

    console.log(`\nEvent logged to ${EVENT_LOG_FILE}`);

    // In strict mode, we would exit(1).
    // For this turn, if we are simulating failure, we exit 0 but report success in "preventing bad deploy".
    if (process.env.SIMULATE_FAILURE) {
        console.log('✅ Gate correctly blocked the bad deploy. (Exiting 0 for demo purposes)');
        process.exit(0);
    }
    process.exit(1);
  }

  console.log('✅ Release Constraints Satisfied.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
