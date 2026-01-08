#!/usr/bin/env npx tsx
/**
 * verify_runtime.ts
 *
 * Fast-fail runtime verification script for CI and local development.
 * Validates test runner configuration consistency, module resolution,
 * and ESM/CJS compatibility across the monorepo.
 *
 * Usage:
 *   npx tsx scripts/verification/verify_runtime.ts
 *   pnpm verify:runtime
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - One or more checks failed
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, "..", "..");

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string[];
}

const results: CheckResult[] = [];

function log(msg: string): void {
  console.log(msg);
}

function section(title: string): void {
  log(`\n${"=".repeat(60)}`);
  log(`  ${title}`);
  log("=".repeat(60));
}

function check(name: string, passed: boolean, message: string, details?: string[]): void {
  results.push({ name, passed, message, details });
  const icon = passed ? "\u2705" : "\u274C";
  log(`${icon} ${name}: ${message}`);
  if (details && details.length > 0 && !passed) {
    details.forEach((d) => log(`   - ${d}`));
  }
}

// ============================================================================
// Check 1: Node and Package Manager Versions
// ============================================================================
function checkVersions(): void {
  section("Runtime Versions");

  try {
    const nodeVersion = execSync("node --version", { encoding: "utf8" }).trim();
    const nodeMatch = nodeVersion.match(/v(\d+)\.(\d+)/);
    const nodeMajor = nodeMatch ? parseInt(nodeMatch[1], 10) : 0;

    check(
      "Node.js Version",
      nodeMajor >= 18,
      `${nodeVersion} (required: >=18.18)`,
      nodeMajor < 18 ? ["Upgrade Node.js to v18.18 or later"] : undefined
    );
  } catch {
    check("Node.js Version", false, "Failed to detect Node.js version");
  }

  try {
    const pnpmVersion = execSync("pnpm --version", { encoding: "utf8" }).trim();
    const pnpmMatch = pnpmVersion.match(/^(\d+)/);
    const pnpmMajor = pnpmMatch ? parseInt(pnpmMatch[1], 10) : 0;

    check(
      "pnpm Version",
      pnpmMajor >= 9,
      `v${pnpmVersion} (required: >=9.0.0)`,
      pnpmMajor < 9 ? ["Upgrade pnpm: npm install -g pnpm@latest"] : undefined
    );
  } catch {
    check("pnpm Version", false, "pnpm not installed or not in PATH", [
      "Install pnpm: npm install -g pnpm",
    ]);
  }
}

// ============================================================================
// Check 2: Lockfile and Install Mode
// ============================================================================
function checkLockfile(): void {
  section("Lockfile Verification");

  const lockfilePath = join(ROOT_DIR, "pnpm-lock.yaml");
  const lockfileExists = existsSync(lockfilePath);

  check(
    "pnpm-lock.yaml exists",
    lockfileExists,
    lockfileExists ? "Present" : "Missing",
    lockfileExists ? undefined : ["Run: pnpm install to generate lockfile"]
  );

  if (lockfileExists) {
    const npmrcPath = join(ROOT_DIR, ".npmrc");
    if (existsSync(npmrcPath)) {
      const npmrc = readFileSync(npmrcPath, "utf8");
      // Check for hoisted node linker (common source of resolution issues)
      const hasHoisted = npmrc.includes("nodeLinker=hoisted");
      check("Node linker mode", true, hasHoisted ? "hoisted (default)" : "pnpm default", undefined);
    }
  }
}

// ============================================================================
// Check 3: Runner Config Consistency
// ============================================================================
interface PackageRunnerInfo {
  path: string;
  name: string;
  hasJestConfig: boolean;
  hasVitestConfig: boolean;
  testScript: string | null;
  usesJest: boolean;
  usesVitest: boolean;
  usesNodeTest: boolean;
  hasDualRunners: boolean;
}

function findPackages(): string[] {
  const packages: string[] = [];
  const workspaceDirs = ["client", "server", "packages", "services", "apps", "tools", "sdk"];

  for (const dir of workspaceDirs) {
    const fullPath = join(ROOT_DIR, dir);
    if (!existsSync(fullPath)) continue;

    // Check if the directory itself is a package
    if (existsSync(join(fullPath, "package.json"))) {
      packages.push(fullPath);
    }

    // Check subdirectories
    try {
      const entries = readdirSync(fullPath);
      for (const entry of entries) {
        const entryPath = join(fullPath, entry);
        if (statSync(entryPath).isDirectory()) {
          if (existsSync(join(entryPath, "package.json"))) {
            packages.push(entryPath);
          }
        }
      }
    } catch {
      // Skip unreadable directories
    }
  }

  return packages;
}

function analyzePackageRunner(pkgPath: string): PackageRunnerInfo | null {
  const pkgJsonPath = join(pkgPath, "package.json");
  if (!existsSync(pkgJsonPath)) return null;

  try {
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
    const testScript = pkgJson.scripts?.test || null;

    const hasJestConfig =
      existsSync(join(pkgPath, "jest.config.js")) ||
      existsSync(join(pkgPath, "jest.config.cjs")) ||
      existsSync(join(pkgPath, "jest.config.ts")) ||
      existsSync(join(pkgPath, "jest.config.mjs"));

    const hasVitestConfig =
      existsSync(join(pkgPath, "vitest.config.ts")) ||
      existsSync(join(pkgPath, "vitest.config.js")) ||
      existsSync(join(pkgPath, "vitest.config.mjs"));

    const usesJest = testScript?.includes("jest") || false;
    const usesVitest = testScript?.includes("vitest") || false;
    const usesNodeTest =
      testScript?.includes("node --test") || testScript?.includes("node:test") || false;

    // Detect dual runner pattern (problematic)
    const hasDualRunners =
      (usesJest && usesVitest) || (hasJestConfig && hasVitestConfig && usesJest && usesVitest);

    return {
      path: pkgPath.replace(ROOT_DIR + "/", ""),
      name: pkgJson.name || "unknown",
      hasJestConfig,
      hasVitestConfig,
      testScript,
      usesJest,
      usesVitest,
      usesNodeTest,
      hasDualRunners,
    };
  } catch {
    return null;
  }
}

function checkRunnerConfigs(): void {
  section("Runner Configuration Consistency");

  const packages = findPackages();
  const dualRunnerPackages: string[] = [];
  const orphanConfigPackages: string[] = [];

  let jestCount = 0;
  let vitestCount = 0;
  let nodeTestCount = 0;

  for (const pkgPath of packages) {
    const info = analyzePackageRunner(pkgPath);
    if (!info || !info.testScript) continue;

    if (info.usesJest) jestCount++;
    if (info.usesVitest) vitestCount++;
    if (info.usesNodeTest) nodeTestCount++;

    if (info.hasDualRunners) {
      dualRunnerPackages.push(info.path);
    }

    // Check for orphan configs (config exists but not used in test script)
    if (info.hasVitestConfig && info.usesJest && !info.usesVitest) {
      orphanConfigPackages.push(`${info.path}: vitest.config.* exists but test uses jest`);
    }
    if (info.hasJestConfig && info.usesVitest && !info.usesJest) {
      orphanConfigPackages.push(`${info.path}: jest.config.* exists but test uses vitest`);
    }
  }

  log(
    `\nRunner distribution: Jest=${jestCount}, Vitest=${vitestCount}, node:test=${nodeTestCount}`
  );

  check(
    "No dual-runner packages",
    dualRunnerPackages.length === 0,
    dualRunnerPackages.length === 0
      ? "All packages use single runner"
      : `${dualRunnerPackages.length} package(s) use multiple runners`,
    dualRunnerPackages.length > 0
      ? [...dualRunnerPackages, "", "FIX: Choose one runner per package"]
      : undefined
  );

  check(
    "No orphan runner configs",
    orphanConfigPackages.length === 0,
    orphanConfigPackages.length === 0
      ? "All configs are in use"
      : `${orphanConfigPackages.length} orphan config(s) found`,
    orphanConfigPackages.length > 0
      ? [...orphanConfigPackages, "", "FIX: Remove unused config files"]
      : undefined
  );
}

// ============================================================================
// Check 4: Critical Module Resolution
// ============================================================================
function checkModuleResolution(): void {
  section("Module Resolution Probes");

  // Common problematic modules that often cause ERR_MODULE_NOT_FOUND
  const criticalModules = [
    { name: "zod", required: true },
    { name: "pino", required: false },
    { name: "prom-client", required: false },
    { name: "ioredis", required: false },
    { name: "neo4j-driver", required: false },
  ];

  for (const mod of criticalModules) {
    try {
      // Try to resolve the module from root
      const result = execSync(`node -e "require.resolve('${mod.name}')"`, {
        encoding: "utf8",
        cwd: ROOT_DIR,
        stdio: ["pipe", "pipe", "pipe"],
      });
      check(`Module: ${mod.name}`, true, "Resolvable");
    } catch (e) {
      const passed = !mod.required;
      check(
        `Module: ${mod.name}`,
        passed,
        passed ? "Not installed (optional)" : "MISSING - required dependency",
        passed ? undefined : [`Install: pnpm add ${mod.name}`]
      );
    }
  }

  // Check for ESM resolution in key packages
  const esmCheck = `
    import('zod').then(() => console.log('ok')).catch(e => {
      console.error(e.code);
      process.exit(1);
    });
  `;

  try {
    execSync(`node --input-type=module -e "${esmCheck}"`, {
      encoding: "utf8",
      cwd: ROOT_DIR,
      stdio: ["pipe", "pipe", "pipe"],
    });
    check("ESM dynamic import (zod)", true, "Works");
  } catch {
    check("ESM dynamic import (zod)", false, "Failed", [
      "ESM resolution may be broken",
      "Check node_modules and reinstall if needed",
    ]);
  }
}

// ============================================================================
// Check 5: Root Package Type
// ============================================================================
function checkPackageType(): void {
  section("ESM Configuration");

  const rootPkgPath = join(ROOT_DIR, "package.json");
  try {
    const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf8"));
    const isEsm = rootPkg.type === "module";

    check(
      "Root package type",
      isEsm,
      isEsm ? '"module" (ESM)' : `"${rootPkg.type || "commonjs"}" - should be "module"`,
      isEsm ? undefined : ['Set "type": "module" in root package.json']
    );

    // Check that jest config uses .cjs
    const jestConfigCjs = existsSync(join(ROOT_DIR, "jest.config.cjs"));
    const jestConfigJs = existsSync(join(ROOT_DIR, "jest.config.js"));
    const jestConfigTs = existsSync(join(ROOT_DIR, "jest.config.ts"));

    if (isEsm) {
      check(
        "Jest config extension",
        jestConfigCjs && !jestConfigJs,
        jestConfigCjs ? "Uses .cjs (correct for ESM)" : "Should use .cjs for ESM compatibility",
        !jestConfigCjs ? ["Rename jest.config.js to jest.config.cjs"] : undefined
      );
    }
  } catch {
    check("Root package.json", false, "Could not read root package.json");
  }
}

// ============================================================================
// Check 6: ESM/CJS Config Compatibility
// ============================================================================
function checkConfigCompatibility(): void {
  section("Config Compatibility");

  const packages = findPackages();
  const incompatibleConfigs: string[] = [];

  for (const pkgPath of packages) {
    const pkgJsonPath = join(pkgPath, "package.json");
    if (!existsSync(pkgJsonPath)) continue;

    try {
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
      const isEsm = pkgJson.type === "module";
      const relativePath = pkgPath.replace(ROOT_DIR + "/", "");

      // In ESM packages, .js files are treated as ESM, so jest configs need .cjs
      if (isEsm) {
        const hasJsConfig = existsSync(join(pkgPath, "jest.config.js"));
        const hasCjsConfig = existsSync(join(pkgPath, "jest.config.cjs"));

        if (hasJsConfig && !hasCjsConfig) {
          incompatibleConfigs.push(
            `${relativePath}: ESM package has jest.config.js (should be .cjs)`
          );
        }
      }
    } catch {
      // Skip packages with invalid package.json
    }
  }

  check(
    "ESM/CJS config compatibility",
    incompatibleConfigs.length === 0,
    incompatibleConfigs.length === 0
      ? "All configs use correct extensions"
      : `${incompatibleConfigs.length} incompatible config(s)`,
    incompatibleConfigs.length > 0
      ? [...incompatibleConfigs, "", "FIX: Rename .js to .cjs in ESM packages"]
      : undefined
  );
}

// ============================================================================
// Check 7: Test Setup Files
// ============================================================================
function checkTestSetupFiles(): void {
  section("Test Setup Files");

  // Check key setup files exist
  const setupFiles = [
    { path: "server/tests/setup/jest.setup.cjs", required: true },
    { path: "server/tests/setup/globalSetup.cjs", required: true },
    { path: "server/tests/setup/globalTeardown.cjs", required: true },
  ];

  let allExist = true;
  const missingFiles: string[] = [];

  for (const file of setupFiles) {
    const fullPath = join(ROOT_DIR, file.path);
    const exists = existsSync(fullPath);

    if (!exists && file.required) {
      allExist = false;
      missingFiles.push(file.path);
    }
  }

  check(
    "Test setup files exist",
    allExist,
    allExist ? "All required setup files present" : `Missing ${missingFiles.length} file(s)`,
    missingFiles.length > 0 ? missingFiles : undefined
  );
}

// ============================================================================
// Check 8: Transform Patterns
// ============================================================================
function checkTransformPatterns(): void {
  section("Transform Configuration");

  // Check that transformIgnorePatterns is configured for ESM packages
  const jestConfigPath = join(ROOT_DIR, "jest.config.cjs");
  if (!existsSync(jestConfigPath)) {
    check("Transform patterns", false, "jest.config.cjs not found");
    return;
  }

  try {
    const configContent = readFileSync(jestConfigPath, "utf8");

    // Check for transformIgnorePatterns
    const hasTransformIgnore = configContent.includes("transformIgnorePatterns");
    check(
      "transformIgnorePatterns configured",
      hasTransformIgnore,
      hasTransformIgnore ? "Present" : "Missing - may cause ESM import issues",
      hasTransformIgnore ? undefined : ["Add transformIgnorePatterns to handle ESM-only packages"]
    );

    // Check for moduleNameMapper for .js extensions
    const hasJsMapper = configContent.includes(".js$");
    check(
      "JS extension mapper",
      hasJsMapper,
      hasJsMapper ? "Configured" : "Missing - may cause ESM resolution issues",
      hasJsMapper ? undefined : ['Add moduleNameMapper: { "^(.*)\\.js$": "$1" }']
    );
  } catch {
    check("Transform patterns", false, "Could not read jest.config.cjs");
  }
}

// ============================================================================
// Main
// ============================================================================
async function main(): Promise<void> {
  log("\n" + "=".repeat(60));
  log("  IntelGraph Runtime Verification");
  log("  " + new Date().toISOString());
  log("=".repeat(60));

  checkVersions();
  checkLockfile();
  checkPackageType();
  checkConfigCompatibility();
  checkTestSetupFiles();
  checkTransformPatterns();
  checkRunnerConfigs();
  checkModuleResolution();

  // Summary
  section("Summary");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  log(`\nResults: ${passed}/${total} checks passed`);

  if (failed > 0) {
    log(`\n\u274C ${failed} check(s) FAILED:\n`);
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        log(`  - ${r.name}: ${r.message}`);
        if (r.details) {
          r.details.forEach((d) => log(`      ${d}`));
        }
      });
    log("\nSee docs/ops/TEST_RUNTIME.md for resolution guidance.");
    process.exit(1);
  }

  log("\n\u2705 All runtime checks passed!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Verification script failed:", err);
  process.exit(1);
});
