import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const BOUNDARY_CONFIG_PATH = process.env.BOUNDARY_CONFIG_PATH || 'boundary_config.yaml';

interface Boundary {
  name: string;
  pattern: string;
  allowed_dependencies: string[];
}

interface BoundaryConfig {
  boundaries: Boundary[];
}

interface PackageNode {
  name: string;
  version: string;
  path: string;
  private: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

// Simple YAML parser for boundary config
function parseYaml(yamlContent: string): any {
  const result: any = { boundaries: [] };
  let currentBoundary: any = null;
  let inAllowedDeps = false;

  const lines = yamlContent.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.split('#')[0].trimEnd();
    if (!line.trim()) continue;

    if (line === 'boundaries:') continue;

    const matchBoundary = line.match(/^  - name: (.+)$/);
    if (matchBoundary) {
      if (currentBoundary) {
        result.boundaries.push(currentBoundary);
      }
      currentBoundary = {
        name: matchBoundary[1].trim().replace(/^['"]|['"]$/g, ''),
        pattern: '',
        allowed_dependencies: []
      };
      inAllowedDeps = false;
      continue;
    }

    if (currentBoundary) {
      const matchPattern = line.match(/^    pattern: (.+)$/);
      if (matchPattern) {
        currentBoundary.pattern = matchPattern[1].trim().replace(/^['"]|['"]$/g, '');
        continue;
      }

      if (line.match(/^    allowed_dependencies:$/)) {
        inAllowedDeps = true;
        continue;
      }

      if (inAllowedDeps) {
        const matchAllowedDep = line.match(/^      - (.+)$/);
        if (matchAllowedDep) {
          currentBoundary.allowed_dependencies.push(matchAllowedDep[1].trim().replace(/^['"]|['"]$/g, ''));
        }
      }
    }
  }

  if (currentBoundary) {
    result.boundaries.push(currentBoundary);
  }

  return result;
}

// Simple glob matching
function minimatchLite(filePath: string, pattern: string): boolean {
  let regexStr = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.__GLOB__.')
    .replace(/\*/g, '[^/]*')
    .replace(/\.__GLOB__\./g, '.*');

  if (!regexStr.startsWith('^')) {
    regexStr = '^' + regexStr;
  }
  if (!regexStr.endsWith('$')) {
    regexStr = regexStr + '$';
  }

  const regex = new RegExp(regexStr);
  return regex.test(filePath) || regex.test(filePath + '/');
}

function loadConfig(): BoundaryConfig {
  try {
    const fileContents = fs.readFileSync(BOUNDARY_CONFIG_PATH, 'utf8');
    return parseYaml(fileContents);
  } catch (e) {
    console.error(`Error reading config from ${BOUNDARY_CONFIG_PATH}:`, e);
    process.exit(1);
  }
}

function getPackageDeps(): PackageNode[] {
  console.log('Fetching workspace packages from pnpm...');
  try {
    const output = execSync('pnpm ls -r --depth -1 --json', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    const pkgs: PackageNode[] = JSON.parse(output);
    return pkgs;
  } catch (e) {
    console.error('Error fetching pnpm list:', e);
    process.exit(1);
  }
}

function main() {
  const config = loadConfig();
  const rootDir = process.cwd();
  const pkgs = getPackageDeps();

  const pkgPathMap = new Map<string, string>();
  for (const pkg of pkgs) {
    const relativePath = path.relative(rootDir, pkg.path).replace(/\\/g, '/');
    pkgPathMap.set(pkg.name, relativePath);
  }

  let violationsCount = 0;
  let report = '# Package Boundary Violations Report\n\n';

  for (const pkg of pkgs) {
    const pkgRelativePath = path.relative(rootDir, pkg.path).replace(/\\/g, '/');

    const boundary = config.boundaries.find(b => minimatchLite(pkgRelativePath, b.pattern));
    if (!boundary) continue;

    const pkgJsonPath = path.join(pkg.path, 'package.json');
    if (!fs.existsSync(pkgJsonPath)) continue;

    let pkgJson: PackageNode;
    try {
      pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    } catch (e) {
      console.error(`Error reading ${pkgJsonPath}`);
      continue;
    }

    const allDeps = {
      ...(pkgJson.dependencies || {}),
      ...(pkgJson.devDependencies || {}),
      ...(pkgJson.peerDependencies || {})
    };

    for (const depName of Object.keys(allDeps)) {
      const depRelativePath = pkgPathMap.get(depName);
      if (!depRelativePath) continue;

      const isAllowed = boundary.allowed_dependencies.some(allowedPattern =>
        minimatchLite(depRelativePath, allowedPattern)
      );

      if (!isAllowed) {
        violationsCount++;
        const violationMsg = `- **Violation:** Package \`${pkg.name}\` (in \`${pkgRelativePath}\`, boundary: \`${boundary.name}\`) depends on \`${depName}\` (in \`${depRelativePath}\`), which is not allowed.`;
        console.error(violationMsg);
        report += violationMsg + '\n';
      }
    }
  }

  if (violationsCount > 0) {
    console.error(`\nFound ${violationsCount} boundary violations.`);
    fs.writeFileSync('boundary_violations_report.md', report);
    console.log('Wrote detailed report to boundary_violations_report.md');
    process.exit(1);
  } else {
    console.log('No boundary violations found.');
  }
}

main();
