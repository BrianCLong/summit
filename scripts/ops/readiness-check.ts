
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

// --- Types ---
interface PackageJson {
  name: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface WorkspaceConfig {
  packages: string[];
}

interface CheckResult {
  packagePath: string;
  packageName: string;
  checks: {
    hasLint: boolean;
    hasTest: boolean;
    hasBuild: boolean;
    hasTypecheck: boolean;
    testRunner: 'jest' | 'vitest' | 'node:test' | 'playwright' | 'none' | 'mixed';
  };
  warnings: string[];
  errors: string[];
}

// --- Configuration ---
const REQUIRED_SCRIPTS = ['lint', 'test']; // build/typecheck are contextual
const ALLOWED_TEST_RUNNERS = ['jest', 'vitest', 'playwright', 'node:test'];

// --- Helpers ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Root is two levels up from scripts/ops
const ROOT_DIR = path.resolve(__dirname, '../../');

function readJson<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.error(`Error reading JSON ${filePath}:`, e);
    return null;
  }
}

function readYaml<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return yaml.load(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch (e) {
    console.error(`Error reading YAML ${filePath}:`, e);
    return null;
  }
}

function getPackages(rootDir: string): string[] {
    const pnpmWorkspace = readYaml<{ packages: string[] }>(path.join(rootDir, 'pnpm-workspace.yaml'));
    const rootPkg = readJson<{ workspaces?: string[] }>(path.join(rootDir, 'package.json'));

    const patterns = pnpmWorkspace?.packages || rootPkg?.workspaces || [];

    const results: string[] = [];

    // Helper to walk a dir and match patterns like "packages/*"
    const expandPattern = (pattern: string) => {
        const cleanPattern = pattern.replace('/*', '');
        const targetDir = path.join(rootDir, cleanPattern);

        if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
             const items = fs.readdirSync(targetDir);
             items.forEach(item => {
                 const fullPath = path.join(targetDir, item);
                 if (fs.existsSync(path.join(fullPath, 'package.json'))) {
                     results.push(fullPath);
                 }
             });
        } else if (fs.existsSync(path.join(rootDir, pattern)) && pattern.endsWith('package.json')) {
            // Direct file reference (unlikely in workspace globs but possible)
            results.push(path.dirname(path.join(rootDir, pattern)));
        } else {
             // Handle direct directory references like "client" or "server"
             const directPath = path.join(rootDir, pattern);
             if (fs.existsSync(path.join(directPath, 'package.json'))) {
                 results.push(directPath);
             }
        }
    };

    patterns.forEach(expandPattern);
    return [...new Set(results)]; // De-dupe
}

function detectTestRunner(pkg: PackageJson): 'jest' | 'vitest' | 'node:test' | 'playwright' | 'none' | 'mixed' {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const runners = [];
    if (deps.jest) runners.push('jest');
    if (deps.vitest) runners.push('vitest');
    if (deps['@playwright/test']) runners.push('playwright');
    // node:test is harder to detect via deps, check scripts?
    // But memory says "standard pnpm test now exclusively runs node:test".
    // However, repo reality shows jest. We'll stick to deps for now.

    if (runners.length === 0) return 'none';
    if (runners.length > 1) return 'mixed';
    return runners[0] as any;
}

// --- Main Logic ---

function checkPackage(pkgPath: string): CheckResult {
    const pkgJsonPath = path.join(pkgPath, 'package.json');
    const pkg = readJson<PackageJson>(pkgJsonPath);

    if (!pkg) {
        return {
            packagePath: pkgPath,
            packageName: 'unknown',
            checks: { hasLint: false, hasTest: false, hasBuild: false, hasTypecheck: false, testRunner: 'none' },
            warnings: ['Failed to read package.json'],
            errors: []
        };
    }

    const scripts = pkg.scripts || {};
    const testRunner = detectTestRunner(pkg);
    const result: CheckResult = {
        packagePath: pkgPath,
        packageName: pkg.name || path.basename(pkgPath),
        checks: {
            hasLint: !!scripts.lint,
            hasTest: !!scripts.test,
            hasBuild: !!scripts.build,
            hasTypecheck: !!scripts.typecheck,
            testRunner
        },
        warnings: [],
        errors: []
    };

    // Rule: Must have lint
    if (!result.checks.hasLint) result.warnings.push('Missing "lint" script');

    // Rule: Must have test (unless it's a config-only package, which we can't easily guess, so warning)
    if (!result.checks.hasTest) result.warnings.push('Missing "test" script');

    // Rule: Mixed runners
    if (result.checks.testRunner === 'mixed') {
        // We might allow mixed if one is e2e (playwright) and other is unit (jest/vitest)
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        const hasPlaywright = !!deps['@playwright/test'];
        const hasUnit = !!deps.jest || !!deps.vitest;

        if (hasPlaywright && hasUnit) {
            // This is acceptable (E2E + Unit)
        } else {
             result.warnings.push(`Mixed test runners detected (potential conflict): ${Object.keys(deps).filter(k => ['jest', 'vitest', '@playwright/test'].includes(k)).join(', ')}`);
        }
    }

    return result;
}

function generateReport(results: CheckResult[]): string {
    let md = `# Operational Readiness Report\n\n`;
    md += `**Date:** ${new Date().toISOString()}\n`;
    md += `**Total Packages:** ${results.length}\n\n`;

    const errors = results.filter(r => r.errors.length > 0);
    const warnings = results.filter(r => r.warnings.length > 0);

    md += `## Summary\n`;
    md += `- ✅ Passing: ${results.length - errors.length - warnings.length}\n`;
    md += `- ⚠️ Warnings: ${warnings.length}\n`;
    md += `- ❌ Errors: ${errors.length}\n\n`;

    if (errors.length > 0) {
        md += `## ❌ Errors (Blocking)\n`;
        errors.forEach(r => {
            md += `### ${r.packageName}\n`;
            r.errors.forEach(e => md += `- ${e}\n`);
        });
        md += `\n`;
    }

    if (warnings.length > 0) {
        md += `## ⚠️ Warnings (Action Required)\n`;
        warnings.forEach(r => {
            md += `### ${r.packageName}\n`;
            r.warnings.forEach(w => md += `- ${w}\n`);
        });
        md += `\n`;
    }

    md += `## Detailed Matrix\n\n`;
    md += `| Package | Lint | Test | Build | Typecheck | Runner | Issues |\n`;
    md += `| :--- | :---: | :---: | :---: | :---: | :---: | :--- |\n`;

    results.sort((a, b) => a.packageName.localeCompare(b.packageName)).forEach(r => {
        const issues = [...r.errors, ...r.warnings].join('; ');
        md += `| ${r.packageName} | ${r.checks.hasLint ? '✅' : '❌'} | ${r.checks.hasTest ? '✅' : '❌'} | ${r.checks.hasBuild ? '✅' : '⭕'} | ${r.checks.hasTypecheck ? '✅' : '⭕'} | ${r.checks.testRunner} | ${issues} |\n`;
    });

    return md;
}

async function main() {
    const args = process.argv.slice(2);
    const writeReport = args.includes('--writeReport');
    // Support --outDir for testing
    const outDirIndex = args.indexOf('--outDir');
    const outDir = outDirIndex !== -1 ? args[outDirIndex + 1] : path.join(ROOT_DIR, 'docs', 'ops');

    console.log('🔍 Scanning workspace packages...');

    const packagePaths = getPackages(ROOT_DIR);
    console.log(`Found ${packagePaths.length} packages.`);

    const results = packagePaths.map(checkPackage);
    const report = generateReport(results);

    if (writeReport) {
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        const reportPath = path.join(outDir, 'READINESS_REPORT.md');
        fs.writeFileSync(reportPath, report);
        console.log(`📝 Report written to ${reportPath}`);
    } else {
        // console.log(report);
        console.log("Run with --writeReport to generate markdown file.");
    }

    const hasErrors = results.some(r => r.errors.length > 0);
    if (hasErrors) {
        console.error('❌ Readiness checks failed.');
        process.exit(1);
    }

    console.log('✅ Readiness checks complete.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}
