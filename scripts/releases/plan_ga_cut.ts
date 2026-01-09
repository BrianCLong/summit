
// Minimal GA Gate Planner
// In reality, this would import scripts/ga-gate.js logic

import fs from 'fs';

async function main() {
  // Parse arguments: we expect json passed via stdin or file
  // But for this simple script, we'll take a file path argument for the scenario metadata
  // and the risk score json file path

  const scenarioPath = process.argv[2];
  const riskScorePath = process.argv[3];

  if (!scenarioPath || !riskScorePath) {
    console.error('Usage: npx tsx plan_ga_cut.ts <scenario-json> <risk-score-json>');
    process.exit(1);
  }

  try {
    const scenario = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
    const riskScore = JSON.parse(fs.readFileSync(riskScorePath, 'utf8'));

    // Decision Logic
    let decision = 'pass';
    let reasons: string[] = [];

    // 1. Check Risk Score
    if (riskScore.overall > 75) {
      decision = 'blocked';
      reasons.push(`Risk score too high: ${riskScore.overall}`);
    } else if (riskScore.overall > 50) {
      decision = 'requires_waiver';
      reasons.push(`Risk score elevated: ${riskScore.overall}`);
    }

    // 2. Check Change Class
    if (scenario.change_class === 'contract-affecting' || scenario.change_class === 'behavior-changing') {
      if (decision !== 'blocked' && decision !== 'requires_waiver') {
        decision = 'requires_approval';
        reasons.push(`${scenario.change_class} change requires approval`);
      }
    }

    // 3. Security Checks (simulated based on file paths)
    const hasSecurityFiles = scenario.files?.some((f: string) => f.includes('security') || f.includes('auth'));
    if (hasSecurityFiles && decision !== 'blocked') {
      if (riskScore.overall > 40) {
         decision = 'requires_waiver';
         reasons.push('Security files modified with moderate risk');
      }
    }

    console.log(JSON.stringify({
      decision,
      reasons,
      timestamp: new Date().toISOString()
    }, null, 2));

  } catch (error) {
    console.error('Error planning GA cut:', error);
    process.exit(1);
  }
}

main();
