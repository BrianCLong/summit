
import * as fs from 'fs';
import * as path from 'path';

interface HealthData {
  totalScore: number;
  factorScores: {
    [key: string]: {
      score: number;
      value: number;
    };
  };
}

interface RenewalRisk {
  level: 'red' | 'yellow' | 'green';
  drivers: string[];
  mitigations: string[];
}

function computeRenewalRisk(healthData: HealthData): RenewalRisk {
  const { totalScore, factorScores } = healthData;
  const drivers: string[] = [];
  const mitigations: string[] = [];
  let level: 'red' | 'yellow' | 'green' = 'green';

  if (totalScore < 50) {
    level = 'red';
    drivers.push('Sustained low health score');
    mitigations.push('Immediate intervention required');
  } else if (totalScore < 70) {
    level = 'yellow';
    drivers.push('Moderate health score');
    mitigations.push('Proactive engagement recommended');
  }

  if (factorScores.adoption && factorScores.adoption.score < 50) {
    drivers.push('Low adoption');
    mitigations.push('Targeted training');
  }

  if (factorScores.incident_frequency && factorScores.incident_frequency.score < 50) {
    drivers.push('High incident frequency');
    mitigations.push('Proactive support');
  }

  return { level, drivers, mitigations };
}

function main() {
  const [tenantId, date] = process.argv.slice(2);
  if (!tenantId || !date) {
    console.error(`Usage: ts-node compute_renewal_risk.ts <tenant-id> <date>`);
    process.exit(1);
  }

  const healthPath = `artifacts/cs/${tenantId}/${date}/health.json`;

  if (!fs.existsSync(healthPath)) {
    console.error(`Health data for ${tenantId} on ${date} not found.`);
    process.exit(1);
  }

  const healthData: HealthData = JSON.parse(fs.readFileSync(healthPath, 'utf-8'));
  const renewalRisk = computeRenewalRisk(healthData);

  const outputDir = path.join('artifacts/cs', tenantId, date);
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(path.join(outputDir, 'renewal-risk.json'), JSON.stringify(renewalRisk, null, 2));
  fs.writeFileSync(path.join(outputDir, 'stamp.json'), JSON.stringify({ timestamp: new Date().toISOString() }, null, 2));

  console.log(`Renewal risk for ${tenantId} on ${date} is ${renewalRisk.level}`);
  console.log(`Output written to ${outputDir}`);
}

main();
