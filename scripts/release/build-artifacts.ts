
import { execSync } from 'child_process';
import { program } from 'commander';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface Manifest {
  artifacts: {
    [filepath: string]: {
      sha256: string;
    };
  };
  metadata: {
    timestamp: string;
    git_sha: string;
    node_version: string;
    pnpm_version: string;
  };
}

const DEFAULT_OUT_DIR = 'dist';

const collectArtifacts = (workspaces: any[], outDir: string): string[] => {
  const collectedFiles: string[] = [];
  fs.mkdirSync(outDir, { recursive: true });

  for (const workspace of workspaces) {
    const distPath = path.join(workspace.path, 'dist');
    if (fs.existsSync(distPath)) {
      const packageOutDir = path.join(outDir, workspace.name);
      fs.mkdirSync(packageOutDir, { recursive: true });
      const files = fs.readdirSync(distPath);
      for (const file of files) {
        const srcFile = path.join(distPath, file);
        const destFile = path.join(packageOutDir, file);
        fs.copyFileSync(srcFile, destFile);
        collectedFiles.push(destFile);
      }
    }
  }
  return collectedFiles;
};

const main = () => {
  program
    .option('--dry-run', 'Simulate the build and packaging process')
    .option('--out-dir <dir>', 'Output directory for artifacts', DEFAULT_OUT_DIR)
    .parse(process.argv);

  const options = program.opts();
  const outDir = path.resolve(options.outDir);

  if (options.dryRun) {
    console.log('**DRY RUN**');
  }

  console.log('Starting build process...');
  if (!options.dryRun) {
    execSync('pnpm install', { stdio: 'inherit' });
    execSync('pnpm build', { stdio: 'inherit' });
  }
  console.log('Build process complete.');

  console.log('Collecting artifacts...');
  const workspaces = JSON.parse(execSync('pnpm m ls --json --depth=-1').toString());
  const artifacts = options.dryRun ? ['dry-run-artifact.txt'] : collectArtifacts(workspaces, outDir);
  console.log(`Collected ${artifacts.length} artifacts.`);

  console.log('Generating manifest and checksums...');
  const manifest: Manifest = {
    artifacts: {},
    metadata: {
      timestamp: new Date().toISOString(),
      git_sha: execSync('git rev-parse HEAD').toString().trim(),
      node_version: process.version,
      pnpm_version: execSync('pnpm -v').toString().trim(),
    },
  };

  let checksums = '';
  for (const artifact of artifacts) {
    const content = options.dryRun ? 'dry-run' : fs.readFileSync(artifact);
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
    const relativePath = path.relative(outDir, artifact);
    manifest.artifacts[relativePath] = { sha256 };
    checksums += `${sha256}  ${relativePath}\n`;
  }

  const manifestPath = path.join(outDir, 'manifest.json');
  const checksumsPath = path.join(outDir, 'checksums.txt');
  if (!options.dryRun) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    fs.writeFileSync(checksumsPath, checksums);
  }

  console.log('Manifest generated at:', manifestPath);
  console.log(JSON.stringify(manifest, null, 2));
  console.log('Checksums generated at:', checksumsPath);
  console.log(checksums);

  console.log('Artifact build process complete.');
};

main();
