#!/usr/bin/env node
/**
 * Monorepo Audit Script
 * Scans all packages and identifies issues with scripts, dependencies, and configuration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

// Standard scripts that should be present in packages
const STANDARD_SCRIPTS = {
  app: ['build', 'dev', 'test', 'lint', 'typecheck'],
  service: ['build', 'dev', 'start', 'test', 'lint', 'typecheck'],
  library: ['build', 'test', 'lint', 'typecheck'],
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function findPackageJsonFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, .git, and other excluded directories
      if (
        !file.startsWith('.') &&
        file !== 'node_modules' &&
        file !== 'dist' &&
        file !== 'build' &&
        file !== 'coverage' &&
        file !== 'archive'
      ) {
        findPackageJsonFiles(filePath, fileList);
      }
    } else if (file === 'package.json') {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function categorizePackage(pkgPath, pkg) {
  const relativePath = path.relative(ROOT_DIR, path.dirname(pkgPath));

  if (relativePath.startsWith('apps/')) return 'app';
  if (relativePath.startsWith('services/')) return 'service';
  if (relativePath.startsWith('packages/')) return 'library';

  // Fallback: check for dev script (app) vs no dev script (library)
  if (pkg.scripts?.dev || pkg.scripts?.start) return 'app';

  return 'library';
}

function auditPackage(pkgPath) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const category = categorizePackage(pkgPath, pkg);
  const requiredScripts = STANDARD_SCRIPTS[category];
  const missingScripts = [];
  const issues = [];

  // Check for missing scripts
  requiredScripts.forEach((script) => {
    if (!pkg.scripts || !pkg.scripts[script]) {
      missingScripts.push(script);
    }
  });

  // Check for package manager consistency
  if (pkg.packageManager && !pkg.packageManager.startsWith('pnpm')) {
    issues.push(`Uses ${pkg.packageManager} instead of pnpm`);
  }

  // Check for lockfile references
  const dir = path.dirname(pkgPath);
  const hasOwnLockfile =
    fs.existsSync(path.join(dir, 'pnpm-lock.yaml')) ||
    fs.existsSync(path.join(dir, 'package-lock.json')) ||
    fs.existsSync(path.join(dir, 'yarn.lock'));

  if (hasOwnLockfile && pkgPath !== path.join(ROOT_DIR, 'package.json')) {
    issues.push('Has own lockfile (should use workspace root)');
  }

  return {
    path: path.relative(ROOT_DIR, pkgPath),
    name: pkg.name || path.basename(path.dirname(pkgPath)),
    category,
    version: pkg.version,
    scripts: Object.keys(pkg.scripts || {}),
    missingScripts,
    issues,
    private: pkg.private,
    dependencies: Object.keys(pkg.dependencies || {}).length,
    devDependencies: Object.keys(pkg.devDependencies || {}).length,
  };
}

function generateReport(packages) {
  console.log(
    `\n${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`
  );
  console.log(
    `${colors.cyan}║${colors.reset}  MONOREPO AUDIT REPORT                              ${colors.cyan}║${colors.reset}`
  );
  console.log(
    `${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}\n`
  );

  // Summary Statistics
  console.log(`${colors.blue}📊 Summary Statistics${colors.reset}`);
  console.log(`   Total packages: ${packages.length}`);
  console.log(
    `   Apps: ${packages.filter((p) => p.category === 'app').length}`
  );
  console.log(
    `   Services: ${packages.filter((p) => p.category === 'service').length}`
  );
  console.log(
    `   Libraries: ${packages.filter((p) => p.category === 'library').length}`
  );
  console.log('');

  // Packages with missing scripts
  const packagesWithMissingScripts = packages.filter(
    (p) => p.missingScripts.length > 0
  );
  console.log(`${colors.yellow}⚠️  Packages with Missing Scripts${colors.reset}`);
  console.log(
    `   ${packagesWithMissingScripts.length}/${packages.length} packages missing standard scripts\n`
  );

  if (packagesWithMissingScripts.length > 0) {
    const topOffenders = packagesWithMissingScripts.slice(0, 20);
    topOffenders.forEach((pkg) => {
      console.log(
        `   ${colors.yellow}▸${colors.reset} ${pkg.path} (${pkg.category})`
      );
      console.log(
        `     Missing: ${colors.red}${pkg.missingScripts.join(', ')}${colors.reset}`
      );
      if (pkg.scripts.length > 0) {
        console.log(`     Has: ${pkg.scripts.slice(0, 5).join(', ')}`);
      }
      console.log('');
    });

    if (packagesWithMissingScripts.length > 20) {
      console.log(
        `   ... and ${packagesWithMissingScripts.length - 20} more packages\n`
      );
    }
  }

  // Packages with issues
  const packagesWithIssues = packages.filter((p) => p.issues.length > 0);
  if (packagesWithIssues.length > 0) {
    console.log(`${colors.red}🚨 Packages with Issues${colors.reset}`);
    console.log(`   ${packagesWithIssues.length} packages have issues\n`);

    packagesWithIssues.slice(0, 10).forEach((pkg) => {
      console.log(`   ${colors.red}▸${colors.reset} ${pkg.path}`);
      pkg.issues.forEach((issue) => {
        console.log(`     - ${issue}`);
      });
      console.log('');
    });
  }

  // Well-configured packages
  const wellConfigured = packages.filter(
    (p) => p.missingScripts.length === 0 && p.issues.length === 0
  );
  console.log(`${colors.green}✓ Well-Configured Packages${colors.reset}`);
  console.log(
    `   ${wellConfigured.length}/${packages.length} packages are well-configured\n`
  );

  // Recommendations
  console.log(`${colors.cyan}💡 Recommendations${colors.reset}\n`);
  console.log(
    `   1. Normalize scripts across ${packagesWithMissingScripts.length} packages`
  );
  console.log(`   2. Remove ${packagesWithIssues.length} package-level lockfiles`);
  console.log(`   3. Configure Turborepo caching for all tasks`);
  console.log(`   4. Add missing scripts using automation script`);
  console.log('');

  return {
    total: packages.length,
    withMissingScripts: packagesWithMissingScripts.length,
    withIssues: packagesWithIssues.length,
    wellConfigured: wellConfigured.length,
  };
}

function writeDetailedReport(packages) {
  const reportPath = path.join(ROOT_DIR, 'MONOREPO_AUDIT_REPORT.json');
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: packages.length,
      apps: packages.filter((p) => p.category === 'app').length,
      services: packages.filter((p) => p.category === 'service').length,
      libraries: packages.filter((p) => p.category === 'library').length,
      withMissingScripts: packages.filter((p) => p.missingScripts.length > 0)
        .length,
      withIssues: packages.filter((p) => p.issues.length > 0).length,
    },
    packages: packages.map((p) => ({
      path: p.path,
      name: p.name,
      category: p.category,
      missingScripts: p.missingScripts,
      issues: p.issues,
      hasAllScripts: p.missingScripts.length === 0,
    })),
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(
    `${colors.green}✓${colors.reset} Detailed report written to: ${reportPath}\n`
  );
}

// Main execution
console.log(`${colors.cyan}Scanning monorepo...${colors.reset}`);
const packageFiles = findPackageJsonFiles(ROOT_DIR);
console.log(`Found ${packageFiles.length} package.json files\n`);

const packages = packageFiles.map(auditPackage);
const stats = generateReport(packages);
writeDetailedReport(packages);

// Exit with error code if there are issues
process.exit(stats.withMissingScripts > 0 ? 1 : 0);
