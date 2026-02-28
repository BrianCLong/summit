import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { analyze, BoundaryViolation } from './react_boundary_analyzer.js';
import { validateCache, CacheViolation } from './react_cache_validator.js';

import { execSync } from 'child_process';

function getGitHash(): string {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch (error) {
    return 'unknown';
  }
}

export function generateReport(projectRoot: string, outputDir: string) {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Run analysis
  const boundaryViolations = analyze(projectRoot);
  const cacheViolations = validateCache(projectRoot);

  // report.json
  const report = {
    boundaryViolations: boundaryViolations.sort((a, b) => a.file.localeCompare(b.file)),
    cacheViolations: cacheViolations.sort((a, b) => a.file.localeCompare(b.file))
  };
  fs.writeFileSync(
    path.join(outputDir, 'report.json'),
    JSON.stringify(report, null, 2)
  );

  // metrics.json
  function findFiles(dir: string, extension: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        if (!filePath.includes('node_modules') && !filePath.includes('.git') && !filePath.includes('dist')) {
          findFiles(filePath, extension, fileList);
        }
      } else if (filePath.endsWith(extension) && !filePath.includes('.test.') && !filePath.includes('.spec.')) {
        fileList.push(filePath);
      }
    }

    return fileList;
  }

  const tsxFiles = findFiles(projectRoot, '.tsx');

  let totalAsyncRoutes = 0;
  let asyncRoutesWithSuspense = 0;

  for (const file of tsxFiles as string[]) {
      try {
          const content = fs.readFileSync(file, 'utf8');
          if (content.match(/export\s+default\s+async\s+function\s+(?:Page|Layout|Route)/)) {
              totalAsyncRoutes++;
              if (content.includes('<Suspense')) {
                  asyncRoutesWithSuspense++;
              }
          }
      } catch (e) {
          // Ignore read errors
      }
  }

  const streamingCoveragePercent = totalAsyncRoutes > 0
      ? Math.round((asyncRoutesWithSuspense / totalAsyncRoutes) * 100)
      : 100;

  const metrics = {
    boundaryViolations: boundaryViolations.length,
    cacheViolations: cacheViolations.length,
    streamingCoveragePercent
  };
  fs.writeFileSync(
    path.join(outputDir, 'metrics.json'),
    JSON.stringify(metrics, null, 2)
  );

  // stamp.json (no timestamps, commit hash only)
  const stamp = {
    commit: getGitHash(),
    rulesVersion: "1.0.0"
  };
  fs.writeFileSync(
    path.join(outputDir, 'stamp.json'),
    JSON.stringify(stamp, null, 2)
  );

  console.log(`Reports generated in ${outputDir}`);

  if (boundaryViolations.length > 0 || cacheViolations.length > 0) {
      console.error(`Found ${boundaryViolations.length} boundary violations and ${cacheViolations.length} cache/streaming violations.`);
      process.exit(1);
  } else {
      process.exit(0);
  }
}

// CLI execution
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const root = process.argv[2] || process.cwd();
  const outputDir = process.argv[3] || path.join(process.cwd(), 'reports', 'react-best-practices');
  generateReport(root, outputDir);
}
