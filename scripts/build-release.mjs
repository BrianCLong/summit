#!/usr/bin/env node

import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const RELEASE_DIR = 'dist/release';

/**
 * Executes a command and returns the trimmed output.
 * @param {string} command - The command to execute.
 * @returns {string} The trimmed output of the command.
 */
function exec(command) {
  return execSync(command).toString().trim();
}

/**
 * Calculates the SHA-256 hash of a file.
 * @param {string} filePath - The path to the file.
 * @returns {string} The SHA-256 hash of the file.
 */
function getFileHash(filePath) {
  const fileBuffer = readFileSync(filePath);
  const hash = createHash('sha256');
  hash.update(fileBuffer);
  return hash.digest('hex');
}

/**
 * Creates a deterministic placeholder tarball with static content.
 * @param {string} dir - The directory to create the tarball in.
 * @param {string} name - The name of the tarball.
 */
function createPlaceholderTarball(dir, name) {
  const filePath = path.join(dir, name);
  const content = `Placeholder for ${name}`;
  const txtFile = name.replace('.tar.gz', '.txt');
  writeFileSync(path.join(dir, txtFile), content);

  // Use deterministic tar flags to ensure the hash is the same every time.
  const tarCommand = `tar --mtime='1970-01-01 00:00:00Z' --owner=0 --group=0 --numeric-owner -czf ${filePath} -C ${dir} ${txtFile}`;
  exec(tarCommand);

  rmSync(path.join(dir, txtFile));
}

/**
 * Main function to build the release.
 */
function buildRelease() {
  // 1. Get version and git info
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const version = `v${packageJson.version}`;
  const gitRef = exec('git rev-parse HEAD');
  const buildTimestamp = new Date().toISOString();

  // 2. Clean and create directories
  rmSync(RELEASE_DIR, { recursive: true, force: true });
  mkdirSync(RELEASE_DIR, { recursive: true });

  const artifactDirs = {
    server: path.join(RELEASE_DIR, 'server'),
    client: path.join(RELEASE_DIR, 'client'),
    cli: path.join(RELEASE_DIR, 'cli'),
    sbom: path.join(RELEASE_DIR, 'sbom'),
    provenance: path.join(RELEASE_DIR, 'provenance'),
  };

  for (const dir of Object.values(artifactDirs)) {
    mkdirSync(dir, { recursive: true });
  }

  // 3. Build artifacts (placeholders)
  createPlaceholderTarball(artifactDirs.server, 'summit-server.tar.gz');
  createPlaceholderTarball(artifactDirs.client, 'summit-client.tar.gz');
  createPlaceholderTarball(artifactDirs.cli, 'summit-cli.tar.gz');

  // 4. Generate provenance and SBOMs (placeholders)
  writeFileSync(path.join(artifactDirs.sbom, 'server.json'), JSON.stringify({ 'placeholder': true }));
  writeFileSync(path.join(artifactDirs.sbom, 'client.json'), JSON.stringify({ 'placeholder': true }));
  writeFileSync(path.join(artifactDirs.sbom, 'cli.json'), JSON.stringify({ 'placeholder': true }));
  writeFileSync(path.join(artifactDirs.provenance, 'server.json'), JSON.stringify({ 'placeholder': true }));
  writeFileSync(path.join(artifactDirs.provenance, 'client.json'), JSON.stringify({ 'placeholder': true }));
  writeFileSync(path.join(artifactDirs.provenance, 'cli.json'), JSON.stringify({ 'placeholder': true }));

  // 5. Generate manifest
  const manifest = {
    version,
    git_ref: gitRef,
    build_timestamp: buildTimestamp,
    artifacts: [
      {
        name: 'server',
        file: 'server/summit-server.tar.gz',
        hash: getFileHash(path.join(artifactDirs.server, 'summit-server.tar.gz')),
        sbom_ref: 'sbom/server.json',
        provenance_ref: 'provenance/server.json',
      },
      {
        name: 'client',
        file: 'client/summit-client.tar.gz',
        hash: getFileHash(path.join(artifactDirs.client, 'summit-client.tar.gz')),
        sbom_ref: 'sbom/client.json',
        provenance_ref: 'provenance/client.json',
      },
      {
        name: 'cli',
        file: 'cli/summit-cli.tar.gz',
        hash: getFileHash(path.join(artifactDirs.cli, 'summit-cli.tar.gz')),
        sbom_ref: 'sbom/cli.json',
        provenance_ref: 'provenance/cli.json',
      },
    ],
  };

  // 6. Validate manifest
  const schema = JSON.parse(readFileSync('docs/ga/manifest.schema.json', 'utf8'));
  const ajv = new Ajv();
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(manifest);

  if (!valid) {
    console.error('Manifest validation failed:', validate.errors);
    process.exit(1);
  }

  // 7. Write manifest
  writeFileSync(path.join(RELEASE_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

buildRelease();
