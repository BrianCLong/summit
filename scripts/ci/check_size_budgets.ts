import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';
import { glob } from 'glob';

// Configuration interface
interface SizeBudgets {
  docker: {
    image_max_mb: number;
    layer_max_mb: number;
  };
  context: {
    max_mb: number;
    max_file_count: number;
    excluded_patterns: string[];
  };
  artifacts: {
    dist_max_mb: number;
    evidence_max_mb: number;
  };
  paths: {
    max_length: number;
    report_top_n: number;
  };
}

interface FileStat {
  path: string;
  size: number;
}

const CONFIG_PATH = path.join(process.cwd(), 'ci/size-budgets.yml');

function loadConfig(): SizeBudgets {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Config file not found: ${CONFIG_PATH}`);
    process.exit(1);
  }
  return yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8')) as SizeBudgets;
}

function getDirSize(dirPath: string, excludedPatterns: string[]): { size: number; count: number; files: FileStat[] } {
  let totalSize = 0;
  let fileCount = 0;
  const files: FileStat[] = [];

  function traverse(currentPath: string) {
    const relativePath = path.relative(dirPath, currentPath);

    // Check exclusions
    if (excludedPatterns.some(p => relativePath.split(path.sep).includes(p))) {
      return;
    }

    try {
      const stats = fs.statSync(currentPath);
      if (stats.isDirectory()) {
        const entries = fs.readdirSync(currentPath);
        for (const entry of entries) {
          traverse(path.join(currentPath, entry));
        }
      } else {
        totalSize += stats.size;
        fileCount++;
        files.push({ path: relativePath, size: stats.size });
      }
    } catch (e) {
      // ignore
    }
  }

  if (fs.existsSync(dirPath)) {
    traverse(dirPath);
  }

  return { size: totalSize, count: fileCount, files };
}

function checkDockerImage(imageName: string, config: SizeBudgets['docker']): boolean {
  try {
    const output = execSync(`docker inspect ${imageName} --format='{{.Size}}'`).toString().trim();
    const sizeBytes = parseInt(output, 10);
    const sizeMb = sizeBytes / (1024 * 1024);

    console.log(`Docker Image: ${imageName}`);
    console.log(`  Size: ${sizeMb.toFixed(2)} MB (Limit: ${config.image_max_mb} MB)`);

    if (sizeMb > config.image_max_mb) {
      console.error(`  ❌ Image size exceeds budget!`);
      return false;
    }
    console.log(`  ✅ Image size within budget.`);
    return true;
  } catch (error) {
    console.error(`  ⚠️ Could not inspect Docker image: ${imageName}`);
    return false; // Fail safe
  }
}

async function run() {
  console.log('🔍 Starting Build & Release Size Budget Check...');
  const config = loadConfig();
  let failed = false;

  // 1. Check Build Context (Simulated)
  console.log('\n📂 Checking Build Context...');
  // Read .dockerignore to simulate context
  const dockerignorePath = path.join(process.cwd(), '.dockerignore');
  const ignorePatterns = fs.existsSync(dockerignorePath)
    ? fs.readFileSync(dockerignorePath, 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('#'))
    : [];

  // Add hardcoded excludes from config
  ignorePatterns.push(...config.context.excluded_patterns);

  // Filter out empty lines
  const cleanPatterns = ignorePatterns.filter(p => p.length > 0);

  console.log(`  Loaded ${cleanPatterns.length} ignore patterns.`);

  const files = await glob('**/*', {
    ignore: cleanPatterns,
    dot: true,
    nodir: true,
    follow: false
  });

  let totalContextSize = 0;
  const contextFiles: FileStat[] = [];
  const longPaths: string[] = [];

  for (const f of files) {
    try {
      const stats = fs.statSync(f);
      totalContextSize += stats.size;
      contextFiles.push({ path: f, size: stats.size });

      if (f.length > config.paths.max_length) {
        longPaths.push(f);
      }
    } catch (e) {
      // ignore
    }
  }

  const contextSizeMb = totalContextSize / (1024 * 1024);
  console.log(`  Context Files: ${files.length} (Limit: ${config.context.max_file_count})`);
  console.log(`  Context Size: ${contextSizeMb.toFixed(2)} MB (Limit: ${config.context.max_mb} MB)`);

  if (files.length > config.context.max_file_count) {
    console.error(`  ❌ Too many files in build context!`);
    failed = true;
  }
  if (contextSizeMb > config.context.max_mb) {
    console.error(`  ❌ Build context size exceeds budget!`);
    failed = true;
  }

  // Top largest files
  console.log(`\n  Top ${config.paths.report_top_n} Largest Files in Context:`);
  contextFiles.sort((a, b) => b.size - a.size);
  contextFiles.slice(0, config.paths.report_top_n).forEach(f => {
    console.log(`    ${(f.size / 1024 / 1024).toFixed(2)} MB - ${f.path}`);
  });

  // 2. Path Length Check
  console.log(`\n📏 Checking Path Lengths...`);
  if (longPaths.length > 0) {
    console.error(`  ❌ Found ${longPaths.length} paths exceeding ${config.paths.max_length} chars!`);
    console.log(`  Worst offenders:`);
    longPaths.sort((a, b) => b.length - a.length);
    longPaths.slice(0, 10).forEach(p => console.log(`    [${p.length}] ${p}`));
    failed = true;
  } else {
    console.log(`  ✅ All paths within limit.`);
  }

  // 3. Artifact Check (Dist)
  // This depends on what was built. We'll check standard locations.
  console.log(`\n📦 Checking Artifacts...`);
  const distPaths = ['server/dist', 'client/dist', 'apps/web/dist'];
  for (const dist of distPaths) {
    if (fs.existsSync(dist)) {
      const stats = getDirSize(dist, []);
      const sizeMb = stats.size / (1024 * 1024);
      console.log(`  ${dist}: ${sizeMb.toFixed(2)} MB`);
      if (sizeMb > config.artifacts.dist_max_mb) {
         console.warn(`  ⚠️ ${dist} exceeds specific artifact budget (warning only for now)`);
      }
    }
  }

  // 4. Docker Image Check
  // We assume the image name is passed as env var or arg, or we try to guess 'summit-server' or similar
  const imageName = process.env.IMAGE_NAME || 'intelgraph-platform'; // Default from docker-build.yml often
  // In docker-build.yml it builds ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
  // We can try to check specific known images if they exist locally
  console.log(`\n🐳 Checking Docker Images...`);

  // Try to find images built recently? Or just check specific tags if provided.
  // For this script, we'll check if an argument is provided.
  const targetImage = process.argv[2];
  if (targetImage) {
    if (!checkDockerImage(targetImage, config.docker)) {
      failed = true;
    }
  } else {
    console.log("  ℹ️ No Docker image specified to check. Pass image name as argument.");
  }

  // Generate Report
  const report = {
    context: {
      size_mb: contextSizeMb,
      file_count: files.length,
      largest_files: contextFiles.slice(0, 20)
    },
    paths: {
      longest: longPaths.slice(0, 20)
    },
    verdict: failed ? 'FAILED' : 'PASSED'
  };

  fs.writeFileSync('build-size-report.json', JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to build-size-report.json`);

  if (failed) {
    console.error(`\n❌ Checks FAILED`);
    process.exit(1);
  } else {
    console.log(`\n✅ All Checks PASSED`);
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
