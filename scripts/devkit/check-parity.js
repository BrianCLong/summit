#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const rootCompose = path.resolve(__dirname, '..', '..', 'docker-compose.yml');
const devcontainerCompose = path.resolve(__dirname, '..', '..', '.devcontainer', 'docker-compose.yml');
const requiredServices = [
  'api',
  'ui',
  'worker',
  'postgres',
  'redis',
  'neo4j',
  'opa',
  'otel-collector',
  'mock-services'
];

function execCompose(args) {
  try {
    return execSync(['docker', 'compose', '-f', args.file, ...args.rest].join(' '), {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8'
    });
  } catch (error) {
    try {
      return execSync(['docker-compose', '-f', args.file, ...args.rest].join(' '), {
        stdio: ['ignore', 'pipe', 'ignore'],
        encoding: 'utf8'
      });
    } catch (fallbackError) {
      throw error;
    }
  }
}

function readServices(composeFile) {
  const output = execCompose({ file: composeFile, rest: ['config', '--services'] });
  return new Set(output.split('\n').map((line) => line.trim()).filter(Boolean));
}

function diffServices(source, target) {
  return requiredServices.filter((service) => !target.has(service) && source.has(service));
}

try {
  const rootServices = readServices(rootCompose);
  const devServices = readServices(devcontainerCompose);

  const missingInRoot = diffServices(devServices, rootServices);
  const missingInDev = diffServices(rootServices, devServices);

  if (missingInRoot.length === 0 && missingInDev.length === 0) {
    console.log('✅ Dev kit parity check passed. Core services match across compose files.');
    process.exit(0);
  }

  console.error('❌ Dev kit parity mismatch detected.');
  if (missingInRoot.length) {
    console.error('  Missing in root docker-compose.yml:', missingInRoot.join(', '));
  }
  if (missingInDev.length) {
    console.error('  Missing in .devcontainer/docker-compose.yml:', missingInDev.join(', '));
  }
  process.exit(1);
} catch (error) {
  console.error('❌ Unable to run parity check:', error.message);
  console.error('Ensure Docker is installed and accessible, then retry.');
  process.exit(2);
}

