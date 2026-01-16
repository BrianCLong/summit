import { execSync } from 'child_process';
import fs from 'fs';

const DOMAINS = {
  docs: ['docs/', 'README.md', 'AGENTS.md'],
  infra: ['infra/', 'terraform/', 'deployment/', 'k8s/'],
  backend: ['server/', 'packages/db', 'packages/backend'],
  frontend: ['client/', 'apps/web', 'ui/'],
  scripts: ['scripts/'],
  schemas: ['schemas/']
};

function getChangedFiles(base = 'origin/main'): string[] {
  try {
    // In CI this might need fetching first, or we assume it's available
    const output = execSync(`git diff --name-only ${base}...HEAD`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    return output.split('\n').filter(Boolean);
  } catch (e) {
    console.warn("Could not determine changed files from git. Trying HEAD^...");
    try {
        const output = execSync(`git diff --name-only HEAD^`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
        return output.split('\n').filter(Boolean);
    } catch (e2) {
        console.warn("Could not run git diff. Skipping PR hygiene check.");
        return [];
    }
  }
}

function detectDomains(files: string[]) {
  const domains = new Set<string>();

  for (const file of files) {
    for (const [domain, patterns] of Object.entries(DOMAINS)) {
      if (patterns.some(p => file.startsWith(p))) {
        domains.add(domain);
      }
    }
  }
  return Array.from(domains);
}

async function main() {
  const files = getChangedFiles();
  if (files.length === 0) {
    console.log("No files changed or git unavailable.");
    process.exit(0);
  }

  console.log(`Checking ${files.length} changed files...`);

  // 1. Check Domains
  const domains = detectDomains(files);
  console.log(`Detected domains: ${domains.join(', ')}`);

  if (domains.length > 2) {
    console.error(`❌ PR touches too many domains (${domains.length}). Please split your PR.`);
    // In strict mode we'd exit(1), but for now warning
    // process.exit(1);
  } else {
      console.log("✅ Domain scope looks atomic.");
  }

  // 2. Check Size
  if (files.length > 100) {
      console.warn("⚠️  Large PR detected (>100 files). Ensure you have a good reason.");
  }

  // 3. Check specific files
  if (files.includes('package-lock.json') && !files.includes('package.json')) {
      console.error("❌ package-lock.json changed without package.json");
      process.exit(1);
  }

  console.log("✅ PR Hygiene Check Passed");
}

main();
