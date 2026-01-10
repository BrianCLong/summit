import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  collectToolchain,
  collectSource,
  collectDeps,
  collectEnv,
  collectSteps,
  collectArtifacts
} from './collectors.js';
import { computeRoot } from './merkle.js';
import type { BuildProof, Layer } from './types.js';

export interface BuildOptions {
  pkgDir: string;
  outDir: string;
  commands: string[];
  pkgName: string;
}

export async function generateProof(opts: BuildOptions): Promise<string> {
  const startedAt = new Date().toISOString();

  // 1. Collect Input Layers
  const lToolchain = await collectToolchain();
  const lSource = await collectSource(opts.pkgDir);
  const lDeps = await collectDeps(opts.pkgDir);
  const lEnv = await collectEnv();
  const lSteps = await collectSteps(opts.commands);

  // 2. Execute Build (Caller should have done this, or we do it here? Spec says "Build and emit proof")
  // The CLI sketch says `codex build ./packages/server --proof`.
  // This implies we wrap the build process.

  // For V1, we assume the build command was just run OR we are running it.
  // The CLI implementation will handle running the command.
  // Here we just collect artifacts AFTER the build.

  const { layer: lArtifacts, artifacts } = await collectArtifacts(opts.outDir);

  const layers: Layer[] = [lToolchain, lSource, lDeps, lEnv, lSteps, lArtifacts];
  const rootHash = computeRoot(layers);
  const finishedAt = new Date().toISOString();

  const proof: BuildProof = {
    schema: "summit.buildproof/1",
    pkg: opts.pkgName,
    layers,
    root: rootHash,
    artifactDigests: artifacts,
    startedAt,
    finishedAt,
    tool: { codex: "0.1.0" }
  };

  // Ensure proof dir exists
  const proofDir = join(process.cwd(), '.summit/proofs', opts.pkgName);
  mkdirSync(proofDir, { recursive: true });

  const proofPath = join(proofDir, `${rootHash}.buildproof.json`);
  writeFileSync(proofPath, JSON.stringify(proof, null, 2));

  return proofPath;
}
