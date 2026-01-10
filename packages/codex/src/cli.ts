#!/usr/bin/env node
import { Command } from 'commander';
import { resolve, basename, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import chalk from 'chalk';
import { generateProof } from './proof/builder.js';
import { verifyProof } from './proof/verifier.js';

const program = new Command();

program
  .name('codex')
  .description('Codex CLI for Summit build provenance and verification')
  .version('0.1.0');

program
  .command('build')
  .description('Build a package and emit a build proof')
  .argument('<path>', 'Path to the package directory')
  .option('--proof', 'Generate build proof', false)
  .option('--out <dir>', 'Output directory (relative to package)', 'dist')
  .option('--cmd <command>', 'Build command to run', 'pnpm build')
  .action(async (pkgPath, options) => {
    const fullPkgPath = resolve(pkgPath);
    const fullOutPath = join(fullPkgPath, options.out);

    if (!existsSync(fullPkgPath)) {
      console.error(chalk.red(`Package not found at ${fullPkgPath}`));
      process.exit(1);
    }

    // Attempt to get package name from package.json
    let pkgName = basename(fullPkgPath);
    const pkgJsonPath = join(fullPkgPath, 'package.json');
    if (existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
        pkgName = pkg.name || pkgName;
      } catch (e) {}
    }

    console.log(chalk.blue(`Building ${pkgName}...`));
    const startTime = Date.now();

    try {
      // Run the build command
      execSync(options.cmd, { stdio: 'inherit', cwd: fullPkgPath });
    } catch (e) {
      console.error(chalk.red('Build failed'));
      process.exit(1);
    }

    if (options.proof) {
      console.log(chalk.blue('Generating build proof...'));
      try {
        const proofPath = await generateProof({
          pkgDir: fullPkgPath,
          outDir: fullOutPath,
          commands: [options.cmd],
          pkgName
        });
        console.log(chalk.green(`Proof generated at: ${proofPath}`));
      } catch (e) {
        console.error(chalk.red(`Failed to generate proof: ${e}`));
        process.exit(1);
      }
    }

    console.log(chalk.green(`Done in ${((Date.now() - startTime) / 1000).toFixed(2)}s`));
  });

program
  .command('verify')
  .description('Verify a build proof against artifacts')
  .argument('<proofPath>', 'Path to the .buildproof.json file')
  .option('--out <dir>', 'Directory containing artifacts to verify', '.')
  .action(async (proofPath, options) => {
    const fullProofPath = resolve(proofPath);
    const fullOutPath = resolve(options.out); // The user might pass the dist dir directly or we infer it

    // If options.out is '.', and we are inside a package, maybe we should look for 'dist' or match the proof?
    // The spec says: codex verify .summit/proofs/server/<hash>.buildproof.json
    // It implies we need to know where the artifacts are.
    // The proof has `artifactDigests` with paths relative to output dir.
    // So we need to point to the output dir.

    // However, if we run this from root, we might not know where artifacts are for a specific proof unless provided.
    // For now, let's assume the user provides the correct artifact root dir via --out if it's not CWD.
    // But usually one verifies `dist` folder.

    // Let's try to be smart. If --out is default ('.'), and we are at repo root,
    // we might need to look at proof.pkg to find the package path?
    // But we don't know the package path mapping easily.

    // Let's stick to explicit --out for now, or assume CWD is the artifact root.

    console.log(chalk.blue(`Verifying proof ${basename(fullProofPath)}...`));

    const result = await verifyProof(fullProofPath, fullOutPath);

    if (result.success) {
      console.log(chalk.green('✅ Verification Successful'));
      console.log(chalk.dim(`Root: ${result.rootMatches ? 'MATCH' : 'MISMATCH'}`));
      console.log(chalk.dim(`Artifacts: ${result.artifactsMatch ? 'MATCH' : 'MISMATCH'}`));
    } else {
      console.error(chalk.red('❌ Verification Failed'));
      result.errors.forEach(e => console.error(chalk.red(`  - ${e}`)));
      process.exit(1);
    }
  });

program.parse();
