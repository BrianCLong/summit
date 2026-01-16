
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

interface TrustDashboard {
  customerName: string;
  tenantId: string;
  generatedAt: string;
  healthScore: HealthData;
  renewalRisk: RenewalRisk;
}

function generateMarkdownDashboard(dashboard: TrustDashboard): string {
  return `
# Customer Trust Dashboard for ${dashboard.customerName}

**Tenant ID:** ${dashboard.tenantId}
**Generated At:** ${dashboard.generatedAt}

## Health Score: ${dashboard.healthScore.totalScore}

| Factor | Score | Value |
|---|---|---|
${Object.entries(dashboard.healthScore.factorScores).map(([name, { score, value }]) => `| ${name} | ${score} | ${value} |`).join('\n')}

## Renewal Risk: ${dashboard.renewalRisk.level}

**Drivers:**
${dashboard.renewalRisk.drivers.map(driver => `- ${driver}`).join('\n')}

**Mitigations:**
${dashboard.renewalRisk.mitigations.map(mitigation => `- ${mitigation}`).join('\n')}
  `;
}

function main() {
  const [tenantId, customerName, date] = process.argv.slice(2);

  if (!tenantId || !customerName || !date) {
    console.error(`Usage: ts-node generate_trust_dashboard.ts <tenant-id> <customer-name> <date>`);
    process.exit(1);
  }

  const healthPath = `artifacts/cs/${tenantId}/${date}/health.json`;
  const renewalRiskPath = `artifacts/cs/${tenantId}/${date}/renewal-risk.json`;

  if (!fs.existsSync(healthPath) || !fs.existsSync(renewalRiskPath)) {
    console.error(`Data for ${tenantId} on ${date} not found.`);
    process.exit(1);
  }

  const healthData: HealthData = JSON.parse(fs.readFileSync(healthPath, 'utf-8'));
  const renewalRisk: RenewalRisk = JSON.parse(fs.readFileSync(renewalRiskPath, 'utf-8'));

  const dashboard: TrustDashboard = {
    customerName,
    tenantId,
    generatedAt: new Date().toISOString(),
    healthScore: healthData,
    renewalRisk,
  };

  const markdownContent = generateMarkdownDashboard(dashboard);

  const outputDir = path.join('artifacts/cs', tenantId, date);
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(path.join(outputDir, 'trust-dashboard.md'), markdownContent);
  fs.writeFileSync(path.join(outputDir, 'trust-dashboard.json'), JSON.stringify(dashboard, null, 2));
  fs.writeFileSync(path.join(outputDir, 'stamp.json'), JSON.stringify({ timestamp: new Date().toISOString() }, null, 2));

  console.log(`Trust dashboard for ${tenantId} on ${date} generated.`);
  console.log(`Output written to ${outputDir}`);
}

main();
