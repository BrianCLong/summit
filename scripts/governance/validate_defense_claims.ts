import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Validates that the new defense claims are present and follow the required clusters.
 */
function validateClaims() {
  const crmPath = join(process.cwd(), 'docs/ip/defense_crm_claims_v1.md');
  const simPath = join(process.cwd(), 'docs/ip/defense_simulation_apparatus_claims_v1.md');

  const crmContent = readFileSync(crmPath, 'utf8');
  const simContent = readFileSync(simPath, 'utf8');

  const clusters = [
    { name: 'Rule provenance', pattern: /rule provenance|explainability/i },
    { name: 'Credentialed approvals', pattern: /credential|approval|delegation|revocation/i },
    { name: 'Poisoning defenses', pattern: /poisoning|quarantine|robustness/i },
    { name: 'Cross-model consensus', pattern: /consensus|disagreement/i },
    { name: 'Semantic canarying', pattern: /semantic canary|harm-minimization/i },
    { name: 'DR/COOP', pattern: /disaster recovery|continuity|backup/i }
  ];

  console.log('Verifying CRM Claims (C271-C330)...');
  for (let i = 271; i <= 330; i++) {
    if (!crmContent.includes(`C${i}.`)) {
      throw new Error(`Missing CRM claim C${i}`);
    }
  }

  console.log('Verifying Simulation Claims (S271-S330)...');
  for (let i = 271; i <= 330; i++) {
    if (!simContent.includes(`S${i}.`)) {
      throw new Error(`Missing Simulation claim S${i}`);
    }
  }

  console.log('Verifying Cluster Coverage...');
  clusters.forEach(cluster => {
    if (!cluster.pattern.test(crmContent)) {
      throw new Error(`CRM claims missing coverage for cluster: ${cluster.name}`);
    }
    if (!cluster.pattern.test(simContent)) {
      throw new Error(`Simulation claims missing coverage for cluster: ${cluster.name}`);
    }
  });

  console.log('All defense claims validated successfully.');
}

try {
  validateClaims();
} catch (error) {
  console.error('Validation failed:', error.message);
  process.exit(1);
}
