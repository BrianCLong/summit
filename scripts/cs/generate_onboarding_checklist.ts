
import * as fs from 'fs';
import * as path from 'path';

interface TenantConfig {
  tenantId: string;
  profile: {
    name: string;
    technicalContact: string;
  };
  tag: string;
}

function generateOnboardingChecklist(config: TenantConfig): string {
  return `
# Onboarding Checklist for ${config.profile.name}

## Tenant ID: ${config.tenantId}

### Day 0: Pre-Sales & Kick-off
- [ ] Provide technical points of contact.
- [ ] Define initial deployment scope and target environment.
- [ ] Provision a dedicated tenant.
- [ ] Assign a Customer Success Engineer.
- [ ] Schedule a kick-off meeting.

### Day 1: Initial Deployment & Configuration
- [ ] Provide security package and necessary credentials.
- [ ] Select a deployment overlay.
- [ ] Baseline SLOs.
- [ ] Deploy the initial environment.
- [ ] Configure SSO and RBAC.
- [ ] Run initial health checks.

### Day 30: Go-Live & Hand-off
- [ ] Complete user acceptance testing.
- [ ] Confirm data ingestion pipelines.
- [ ] Enable production monitoring and alerting.
- [ ] Schedule the first Quarterly Business Review (QBR).
- [ ] Transition to support.
  `;
}

function generateManifest(config: TenantConfig): string {
  const manifest = {
    tenantId: config.tenantId,
    tag: config.tag,
    generatedAt: new Date().toISOString(),
    files: [
      'onboarding-checklist.md',
      'manifest.json'
    ]
  };
  return JSON.stringify(manifest, null, 2);
}

function main() {
  const configPath = process.argv[2];
  if (!configPath || !fs.existsSync(configPath)) {
    console.error(`Usage: ts-node generate_onboarding_checklist.ts <path-to-config-file>`);
    process.exit(1);
  }

  const config: TenantConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  const outputDir = path.join('artifacts/cs', config.tenantId, config.tag);
  fs.mkdirSync(outputDir, { recursive: true });

  const checklistContent = generateOnboardingChecklist(config);
  fs.writeFileSync(path.join(outputDir, 'onboarding-checklist.md'), checklistContent);

  const manifestContent = generateManifest(config);
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), manifestContent);

  console.log(`Onboarding artifacts generated for ${config.tenantId} in ${outputDir}`);
}

main();
