#!/usr/bin/env npx tsx
/**
 * Release Runbook Generator
 *
 * Generates customized deployment runbooks based on:
 * - Release type (standard, hotfix, rollback)
 * - Target environment
 * - Deployment method (Docker, Kubernetes, Helm)
 * - Version-specific changes
 *
 * Usage:
 *   npx tsx scripts/release/generate-runbook.ts <version>
 *   pnpm release:runbook v5.3.0 --env production
 *
 * Options:
 *   --env <name>       Target environment (default: production)
 *   --type <type>      Release type: standard, hotfix, rollback (default: standard)
 *   --method <method>  Deploy method: docker, kubernetes, helm (default: helm)
 *   --output <path>    Output file path (default: stdout or artifacts/)
 *   --format <fmt>     Output format: markdown, html (default: markdown)
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

interface RunbookConfig {
  version: string;
  previousVersion?: string;
  environment: string;
  releaseType: 'standard' | 'hotfix' | 'rollback';
  deployMethod: 'docker' | 'kubernetes' | 'helm';
  commitCount: number;
  changedFiles: string[];
  breakingChanges: string[];
  migrations: boolean;
  timestamp: string;
}

function run(cmd: string, args: string[]): { success: boolean; output: string } {
  const result = spawnSync(cmd, args, { encoding: 'utf8', stdio: 'pipe' });
  return {
    success: result.status === 0,
    output: result.stdout?.trim() ?? '',
  };
}

function getPackageVersion(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

function getPreviousVersion(currentTag: string): string | undefined {
  const result = run('git', ['tag', '-l', 'v*.*.*', '--sort=-v:refname']);
  if (!result.success) return undefined;

  const tags = result.output.split('\n').filter(Boolean);
  const currentIdx = tags.indexOf(currentTag);

  if (currentIdx >= 0 && currentIdx < tags.length - 1) {
    return tags[currentIdx + 1];
  }
  return undefined;
}

function getCommitCount(fromTag: string, toTag: string): number {
  const result = run('git', ['rev-list', '--count', `${fromTag}..${toTag}`]);
  return parseInt(result.output, 10) || 0;
}

function getChangedFiles(fromTag: string, toTag: string): string[] {
  const result = run('git', ['diff', '--name-only', fromTag, toTag]);
  return result.output.split('\n').filter(Boolean);
}

function hasBreakingChanges(fromTag: string, toTag: string): string[] {
  const result = run('git', ['log', '--oneline', '--grep=BREAKING', `${fromTag}..${toTag}`]);
  return result.output.split('\n').filter(Boolean);
}

function hasMigrations(changedFiles: string[]): boolean {
  return changedFiles.some(f =>
    f.includes('migration') ||
    f.includes('migrate') ||
    f.match(/prisma\/.*\.sql/) ||
    f.match(/knex\/.*\.js/)
  );
}

function generateMarkdownRunbook(config: RunbookConfig): string {
  const typeEmoji = {
    standard: '🚀',
    hotfix: '🔥',
    rollback: '⏪',
  };

  const envEmoji = {
    development: '🔧',
    staging: '🧪',
    production: '🌐',
  };

  const sections: string[] = [];

  // Header
  sections.push(`# ${typeEmoji[config.releaseType]} Release Runbook: ${config.version}

**Generated:** ${config.timestamp}
**Environment:** ${envEmoji[config.environment as keyof typeof envEmoji] || '🔹'} ${config.environment}
**Release Type:** ${config.releaseType}
**Deploy Method:** ${config.deployMethod}
${config.previousVersion ? `**Previous Version:** ${config.previousVersion}` : ''}
${config.commitCount > 0 ? `**Commits:** ${config.commitCount}` : ''}

---`);

  // Pre-requisites
  sections.push(`## 📋 Pre-Requisites

Before starting the deployment:

- [ ] Verify you have the necessary permissions
- [ ] Ensure you're connected to the correct environment
- [ ] Check the deployment window is approved
- [ ] Notify stakeholders of the upcoming deployment
${config.migrations ? '- [ ] **IMPORTANT:** Database migrations required - coordinate with DBA' : ''}
${config.breakingChanges.length > 0 ? '- [ ] **IMPORTANT:** Breaking changes detected - review carefully' : ''}

### Access Requirements

| System | Required Access |
|--------|-----------------|
| Kubernetes | cluster-admin or deploy role |
| GitHub | Push access to main branch |
| CI/CD | Trigger workflow permissions |
| Monitoring | View dashboards |`);

  // Breaking changes warning
  if (config.breakingChanges.length > 0) {
    sections.push(`## ⚠️ Breaking Changes

The following commits contain breaking changes:

${config.breakingChanges.map(c => `- ${c}`).join('\n')}

**Action Required:** Review these changes and ensure all dependent services are updated.`);
  }

  // Pre-deployment checks
  sections.push(`## 🔍 Pre-Deployment Checks

### 1. Environment Validation

\`\`\`bash
# Validate target environment
pnpm release:validate-env ${config.environment}

# Check current deployment status
${config.deployMethod === 'helm' ? `helm status summit -n summit-${config.environment}` : ''}
${config.deployMethod === 'kubernetes' ? `kubectl get pods -n summit-${config.environment}` : ''}
${config.deployMethod === 'docker' ? `docker compose -f deploy/docker-compose.${config.environment}.yml ps` : ''}
\`\`\`

### 2. Pre-flight Check

\`\`\`bash
# Run pre-flight checklist
pnpm release:go-live:preflight

# Verify evidence bundle exists
ls -la artifacts/evidence/go-live/
\`\`\`

### 3. Database Backup

${config.migrations ? `**Migrations detected - backup is REQUIRED**

\`\`\`bash
# Create backup before deployment
pg_dump -h $DB_HOST -U $DB_USER -d summit > backup_${config.version.replace(/\./g, '_')}_$(date +%Y%m%d_%H%M%S).sql
\`\`\`` : `\`\`\`bash
# Optional backup (no migrations detected)
pg_dump -h $DB_HOST -U $DB_USER -d summit > backup_${config.version.replace(/\./g, '_')}_$(date +%Y%m%d_%H%M%S).sql
\`\`\``}`);

  // Deployment steps based on method
  if (config.deployMethod === 'helm') {
    sections.push(`## 🚢 Deployment Steps (Helm)

### Step 1: Update Helm Repository

\`\`\`bash
helm repo update
\`\`\`

### Step 2: Review Changes

\`\`\`bash
# Dry-run to see what will change
helm upgrade summit deploy/helm/intelgraph \\
  -f deploy/helm/intelgraph/values-${config.environment}.yaml \\
  --namespace summit-${config.environment} \\
  --set image.tag=${config.version} \\
  --dry-run --debug
\`\`\`

### Step 3: Deploy

\`\`\`bash
# Execute deployment
helm upgrade --install summit deploy/helm/intelgraph \\
  -f deploy/helm/intelgraph/values-${config.environment}.yaml \\
  --namespace summit-${config.environment} \\
  --set image.tag=${config.version} \\
  --wait --timeout 10m
\`\`\`

### Step 4: Verify Deployment

\`\`\`bash
# Check rollout status
kubectl rollout status deployment/summit-server -n summit-${config.environment}

# Verify pods are running
kubectl get pods -n summit-${config.environment} -l app=summit
\`\`\``);
  } else if (config.deployMethod === 'kubernetes') {
    sections.push(`## 🚢 Deployment Steps (Kubernetes)

### Step 1: Update Image Tag

\`\`\`bash
kubectl set image deployment/summit-server \\
  summit=ghcr.io/org/summit:${config.version} \\
  -n summit-${config.environment}
\`\`\`

### Step 2: Wait for Rollout

\`\`\`bash
kubectl rollout status deployment/summit-server -n summit-${config.environment}
\`\`\`

### Step 3: Verify Pods

\`\`\`bash
kubectl get pods -n summit-${config.environment} -l app=summit
\`\`\``);
  } else {
    sections.push(`## 🚢 Deployment Steps (Docker Compose)

### Step 1: Pull New Images

\`\`\`bash
cd deploy
docker compose -f docker-compose.${config.environment}.yml pull
\`\`\`

### Step 2: Deploy

\`\`\`bash
docker compose -f docker-compose.${config.environment}.yml up -d
\`\`\`

### Step 3: Verify

\`\`\`bash
docker compose -f docker-compose.${config.environment}.yml ps
docker compose -f docker-compose.${config.environment}.yml logs -f --tail=100
\`\`\``);
  }

  // Migrations
  if (config.migrations) {
    sections.push(`## 🗄️ Database Migrations

**Migrations are required for this release.**

### Run Migrations

\`\`\`bash
# Apply database migrations
pnpm db:migrate

# Verify migration status
pnpm db:migrate:status
\`\`\`

### Rollback Migrations (if needed)

\`\`\`bash
# Rollback last migration
pnpm db:knex:rollback
\`\`\``);
  }

  // Post-deployment verification
  sections.push(`## ✅ Post-Deployment Verification

### 1. Health Checks

\`\`\`bash
# Check health endpoints
curl -s https://${config.environment === 'production' ? 'api' : config.environment + '-api'}.example.com/health | jq
curl -s https://${config.environment === 'production' ? 'api' : config.environment + '-api'}.example.com/readyz
\`\`\`

### 2. Smoke Tests

\`\`\`bash
# Run smoke tests
pnpm test:smoke

# Or run against deployed environment
BASE_URL=https://${config.environment === 'production' ? 'api' : config.environment + '-api'}.example.com ./scripts/go-live/smoke-prod.sh
\`\`\`

### 3. Post-Release Check

\`\`\`bash
# Verify release artifacts
pnpm release:post-check ${config.version}
\`\`\`

### 4. Monitor Dashboards

- [ ] Check error rates in Grafana
- [ ] Verify no spike in latency
- [ ] Monitor resource utilization
- [ ] Check application logs for errors`);

  // Rollback procedure
  sections.push(`## ⏪ Rollback Procedure

If issues are detected, follow these steps to rollback:

${config.deployMethod === 'helm' ? `### Helm Rollback

\`\`\`bash
# View release history
helm history summit -n summit-${config.environment}

# Rollback to previous version
helm rollback summit -n summit-${config.environment}

# Or rollback to specific revision
helm rollback summit <revision> -n summit-${config.environment}
\`\`\`` : ''}

${config.deployMethod === 'kubernetes' ? `### Kubernetes Rollback

\`\`\`bash
# Rollback deployment
kubectl rollout undo deployment/summit-server -n summit-${config.environment}

# Or rollback to specific revision
kubectl rollout undo deployment/summit-server -n summit-${config.environment} --to-revision=<revision>
\`\`\`` : ''}

${config.deployMethod === 'docker' ? `### Docker Rollback

\`\`\`bash
# Pull previous version
docker compose -f docker-compose.${config.environment}.yml pull --policy=always

# Or specify previous tag
docker compose -f docker-compose.${config.environment}.yml up -d --force-recreate
\`\`\`` : ''}

### Automated Rollback

\`\`\`bash
# Use release rollback script
pnpm release:rollback ${config.version}
\`\`\``);

  // Communication
  sections.push(`## 📣 Communication

### Before Deployment

- [ ] Send notification to #deployments channel
- [ ] Update status page (if applicable)

### After Successful Deployment

- [ ] Announce completion in #deployments
- [ ] Update release notes in GitHub
- [ ] Send release notification

\`\`\`bash
# Send notifications
pnpm release:notify ${config.version}
\`\`\`

### If Rollback Required

- [ ] Immediately notify #incidents channel
- [ ] Update status page
- [ ] Create incident ticket
- [ ] Post-incident review scheduled`);

  // Sign-off
  sections.push(`## ✍️ Sign-Off

| Role | Name | Signature | Time |
|------|------|-----------|------|
| Deployer | | | |
| Approver | | | |
| QA Verification | | | |

---

*This runbook was auto-generated. Review and customize as needed.*
*Generated by: pnpm release:runbook ${config.version}*`);

  return sections.join('\n\n');
}

function generateHtmlRunbook(config: RunbookConfig): string {
  const markdown = generateMarkdownRunbook(config);

  // Simple markdown to HTML conversion
  let html = markdown
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/^- \[ \] (.*$)/gm, '<label><input type="checkbox"> $1</label><br>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/---/g, '<hr>');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Release Runbook: ${config.version}</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
    h1, h2, h3 { margin-top: 2rem; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; }
    pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 5px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 0.75rem; text-align: left; }
    th { background: #f4f4f4; }
    hr { margin: 2rem 0; border: none; border-top: 1px solid #ddd; }
    label { display: block; margin: 0.5rem 0; }
    @media print { body { max-width: none; } pre { white-space: pre-wrap; } }
  </style>
</head>
<body>
${html}
</body>
</html>`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let version = getPackageVersion();
  let environment = 'production';
  let releaseType: 'standard' | 'hotfix' | 'rollback' = 'standard';
  let deployMethod: 'docker' | 'kubernetes' | 'helm' = 'helm';
  let outputPath: string | undefined;
  let format = 'markdown';

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--env':
        environment = args[++i];
        break;
      case '--type':
        releaseType = args[++i] as typeof releaseType;
        break;
      case '--method':
        deployMethod = args[++i] as typeof deployMethod;
        break;
      case '--output':
        outputPath = args[++i];
        break;
      case '--format':
        format = args[++i];
        break;
      case '--help':
      case '-h':
        console.log(`
Release Runbook Generator

Usage: npx tsx scripts/release/generate-runbook.ts [version] [options]

Options:
  --env <name>       Target environment: development, staging, production (default: production)
  --type <type>      Release type: standard, hotfix, rollback (default: standard)
  --method <method>  Deploy method: docker, kubernetes, helm (default: helm)
  --output <path>    Output file path
  --format <fmt>     Output format: markdown, html (default: markdown)

Examples:
  pnpm release:runbook v5.3.0
  pnpm release:runbook v5.3.0 --env staging --method kubernetes
  pnpm release:runbook v5.3.0 --type hotfix --output runbook.md
  pnpm release:runbook v5.3.0 --format html --output runbook.html
`);
        process.exit(0);
      default:
        if (!args[i].startsWith('--')) {
          version = args[i];
        }
    }
  }

  console.log('========================================');
  console.log('  Release Runbook Generator');
  console.log('========================================\n');

  // Ensure version has v prefix for git operations
  const versionTag = version.startsWith('v') ? version : `v${version}`;
  const previousVersion = getPreviousVersion(versionTag);

  console.log(`[runbook] Version: ${versionTag}`);
  console.log(`[runbook] Environment: ${environment}`);
  console.log(`[runbook] Type: ${releaseType}`);
  console.log(`[runbook] Method: ${deployMethod}`);

  const changedFiles = previousVersion ? getChangedFiles(previousVersion, versionTag) : [];
  const commitCount = previousVersion ? getCommitCount(previousVersion, versionTag) : 0;
  const breakingChanges = previousVersion ? hasBreakingChanges(previousVersion, versionTag) : [];

  const config: RunbookConfig = {
    version: versionTag,
    previousVersion,
    environment,
    releaseType,
    deployMethod,
    commitCount,
    changedFiles,
    breakingChanges,
    migrations: hasMigrations(changedFiles),
    timestamp: new Date().toISOString(),
  };

  console.log(`[runbook] Commits: ${commitCount}`);
  console.log(`[runbook] Changed files: ${changedFiles.length}`);
  console.log(`[runbook] Breaking changes: ${breakingChanges.length}`);
  console.log(`[runbook] Migrations: ${config.migrations ? 'Yes' : 'No'}`);

  const content = format === 'html'
    ? generateHtmlRunbook(config)
    : generateMarkdownRunbook(config);

  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, content);
    console.log(`\n Runbook saved to: ${outputPath}`);
  } else {
    console.log('\n' + content);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
