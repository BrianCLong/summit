#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const labelPalette = {
  schema: {
    color: 'F97316',
    description: 'Database and data-modeling changes that affect schemas or migrations.',
  },
  infra: {
    color: '2563EB',
    description: 'Infrastructure, deployment, and CI/CD pipeline modifications.',
  },
  api: {
    color: '10B981',
    description: 'API surface changes that impact contracts, routes, or service interfaces.',
  },
  safety: {
    color: 'EF4444',
    description: 'Security, authz/authn, policy, or guardrail modifications.',
  },
};

const tierRules = {
  schema: [
    { pattern: /(^|\/)db\//i, reason: 'Database folder changed' },
    { pattern: /(^|\/)database\//i, reason: 'Database assets updated' },
    { pattern: /(^|\/)migrations?\//i, reason: 'Migration files modified' },
    { pattern: /schema\.(prisma|sql|ya?ml|json|graphql)$/i, reason: 'Schema definition updated' },
    { pattern: /\.sql$/i, reason: 'SQL file modified' },
    { pattern: /prisma\//i, reason: 'Prisma schema or migration touched' },
  ],
  infra: [
    { pattern: /(^|\/)infra\//i, reason: 'Infrastructure folder changed' },
    { pattern: /(^|\/)ops\//i, reason: 'Operations or SRE assets changed' },
    { pattern: /(^|\/)deploy(ment)?s?\//i, reason: 'Deployment configuration changed' },
    { pattern: /charts\//i, reason: 'Helm chart updated' },
    { pattern: /helm\//i, reason: 'Helm assets modified' },
    { pattern: /k8s\//i, reason: 'Kubernetes manifest touched' },
    { pattern: /kubernetes\//i, reason: 'Kubernetes configuration updated' },
    { pattern: /terraform\//i, reason: 'Terraform code changed' },
    { pattern: /(^|\/)iac\//i, reason: 'Infrastructure-as-code updated' },
    { pattern: /Dockerfile/i, reason: 'Container build definition changed' },
    { pattern: /docker-compose\.ya?ml/i, reason: 'Docker Compose definition changed' },
    { pattern: /(^|\/)\.github\/workflows\//i, reason: 'CI/CD workflow changed' },
  ],
  api: [
    { pattern: /(^|\/)api\//i, reason: 'API module changed' },
    { pattern: /(^|\/)server\/(src|app)\/(api|routes|controllers)/i, reason: 'Server API layer changed' },
    { pattern: /(^|\/)services?\/.*(api|routes|controllers)/i, reason: 'Service endpoint changed' },
    { pattern: /openapi\.(ya?ml|json)$/i, reason: 'OpenAPI contract changed' },
    { pattern: /swagger\.(ya?ml|json)$/i, reason: 'Swagger definition changed' },
    { pattern: /graphql\//i, reason: 'GraphQL schema or resolvers changed' },
    { pattern: /schema\.graphql$/i, reason: 'GraphQL schema changed' },
    { pattern: /proto\//i, reason: 'Protocol Buffers updated' },
    { pattern: /\.proto$/i, reason: 'Protocol Buffer definition changed' },
    { pattern: /(^|\/)sdk\//i, reason: 'SDK contract changed' },
  ],
  safety: [
    { pattern: /(^|\/)security\//i, reason: 'Security assets changed' },
    { pattern: /(^|\/)auth(entication|orization)?\//i, reason: 'AuthN/AuthZ logic modified' },
    { pattern: /(^|\/)iam\//i, reason: 'IAM configuration updated' },
    { pattern: /(^|\/)policy\//i, reason: 'Policy or governance updated' },
    { pattern: /\.rego$/i, reason: 'OPA/Rego policy changed' },
    { pattern: /(^|\/)rbac\//i, reason: 'RBAC rules adjusted' },
    { pattern: /(^|\/)permissions?\//i, reason: 'Permission model changed' },
    { pattern: /(^|\/)compliance\//i, reason: 'Compliance artefacts updated' },
    { pattern: /(^|\/)audit\//i, reason: 'Audit or logging guardrails changed' },
    { pattern: /secret/i, reason: 'Secret management touched' },
    { pattern: /(crypto|encrypt|decrypt)/i, reason: 'Cryptography logic changed' },
    { pattern: /guardrails?/i, reason: 'Safety guardrails modified' },
  ],
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getChangedFiles(baseRef, headRef) {
  try {
    const diffCmd = `git diff --name-only ${baseRef}..${headRef}`;
    const output = execSync(diffCmd, { encoding: 'utf8' });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    throw new Error(`Unable to read changed files: ${error.message}`);
  }
}

function classifyRiskTiers(files) {
  const matches = {};

  files.forEach((filePath) => {
    Object.entries(tierRules).forEach(([tier, rules]) => {
      rules.forEach((rule) => {
        if (rule.pattern.test(filePath)) {
          if (!matches[tier]) {
            matches[tier] = new Map();
          }

          const filesForReason = matches[tier].get(rule.reason) ?? new Set();
          filesForReason.add(filePath);
          matches[tier].set(rule.reason, filesForReason);
        }
      });
    });
  });

  return Object.fromEntries(
    Object.entries(matches).map(([tier, reasons]) => [
      tier,
      Array.from(reasons.entries()).map(([reason, reasonFiles]) => {
        const uniqueFiles = Array.from(reasonFiles);
        const fileText = uniqueFiles.length === 1 ? uniqueFiles[0] : uniqueFiles.join(', ');
        return `${reason} (${fileText})`;
      }),
    ]),
  );
}

function writeOutput(key, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  const sanitizedValue = String(value).replace(/\r?\n/g, ' ');
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${sanitizedValue}\n`);
}

function ensureLabels(tiers, env) {
  tiers.forEach((tier) => {
    const config = labelPalette[tier];
    if (!config) return;

    execSync(
      `gh label create "risk-tier:${tier}" --color "${config.color}" --description "${config.description}" --force`,
      {
        stdio: 'inherit',
        env,
      },
    );
  });
}

function applyLabels(prNumber, tiers, env) {
  if (!tiers.length) {
    console.log('No risk tiers detected; skipping label application.');
    return;
  }

  ensureLabels(tiers, env);
  const labelArgs = tiers.map((tier) => `--add-label "risk-tier:${tier}"`).join(' ');
  execSync(`gh pr edit ${prNumber} ${labelArgs}`, { stdio: 'inherit', env });
}

function buildCommentBody(matches, files) {
  const tiers = Object.keys(matches);
  const lines = ['🧭 **PR risk tiers**', ''];

  if (tiers.length) {
    tiers
      .sort()
      .forEach((tier) => {
        const reasons = matches[tier];
        const preview = reasons.slice(0, 5);
        const extraCount = Math.max(reasons.length - preview.length, 0);
        const detail = preview
          .map((reason) => `  - ${reason}`)
          .concat(extraCount ? [`  - …and ${extraCount} more`] : []);
        lines.push(`- ${tier}:`);
        lines.push(...detail);
      });
  } else {
    lines.push('- No schema/infra/API/safety risk tiers matched based on file paths.');
  }

  lines.push('', `Analyzed ${files.length} changed file(s).`);
  return lines.join('\n');
}

function postComment(prNumber, matches, files, env) {
  const commentPath = path.join(process.cwd(), 'pr-risk-tiers.md');
  fs.writeFileSync(commentPath, buildCommentBody(matches, files));

  execSync(`gh pr comment ${prNumber} --body-file ${commentPath}`, {
    stdio: 'inherit',
    env,
  });
}

function normalizeEnv() {
  const prNumber = requireEnv('PR_NUMBER');
  const baseRef = requireEnv('BASE_REF');
  const headRef = requireEnv('HEAD_REF');
  const githubToken = requireEnv('GH_TOKEN');
  const repository = requireEnv('GITHUB_REPOSITORY');

  const ghEnv = { ...process.env, GH_TOKEN: githubToken, GITHUB_REPOSITORY: repository };

  return { prNumber, baseRef, headRef, env: ghEnv };
}

function run() {
  const { prNumber, baseRef, headRef, env } = normalizeEnv();
  const changedFiles = getChangedFiles(baseRef, headRef);

  console.log('🗂️ Changed files considered for risk tiers:');
  changedFiles.forEach((file) => console.log(`- ${file}`));

  const matches = classifyRiskTiers(changedFiles);
  const tiers = Object.keys(matches).sort();
  const tierList = tiers.length ? tiers.join(',') : 'none';

  console.log(`🎯 Risk tiers detected: ${tierList}`);
  writeOutput('risk_tiers', tierList);
  writeOutput('risk_tier_count', tiers.length.toString());

  applyLabels(prNumber, tiers, env);
  postComment(prNumber, matches, changedFiles, env);
}

if (require.main === module) {
  run();
}

module.exports = {
  tierRules,
  classifyRiskTiers,
  buildCommentBody,
};
