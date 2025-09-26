import { existsSync } from 'node:fs';
import path from 'node:path';
import { runCommand, commandExists } from '../utils/exec.js';

async function resolveDockerCompose() {
  if (await commandExists('docker')) {
    return { command: 'docker', args: ['compose'] };
  }

  if (await commandExists('docker-compose')) {
    return { command: 'docker-compose', args: [] };
  }

  throw new Error('Docker CLI not found. Please install Docker to use this command.');
}

async function ensureKubectl() {
  if (!(await commandExists('kubectl'))) {
    throw new Error('kubectl not found. Install Kubernetes tooling or pass --k8s=false to use Docker.');
  }
}

export async function runUp(options) {
  if (options.k8s) {
    await ensureKubectl();
    const manifestPath = path.resolve(process.cwd(), options.kubeManifest ?? 'deploy/k8s');

    if (!existsSync(manifestPath)) {
      throw new Error(`Kubernetes manifest not found at ${manifestPath}`);
    }

    const args = [];
    if (options.context) {
      args.push('--context', options.context);
    }
    args.push('apply', '-f', manifestPath);
    if (options.namespace) {
      args.push('-n', options.namespace);
    }

    console.log(`Applying Kubernetes manifests from ${manifestPath}`);
    await runCommand('kubectl', args);
    console.log('Kubernetes resources applied successfully.');
    return;
  }

  const composeFile = path.resolve(process.cwd(), options.composeFile ?? 'docker-compose.yml');

  if (!existsSync(composeFile)) {
    throw new Error(`Docker compose file not found at ${composeFile}`);
  }

  const services = (options.services ?? '')
    .split(',')
    .map((service) => service.trim())
    .filter(Boolean);

  const detach = options.detach !== false;

  const { command, args: baseArgs } = await resolveDockerCompose();
  const args = [...baseArgs, '-f', composeFile, 'up'];

  if (options.build) {
    args.push('--build');
  }

  if (detach) {
    args.push('-d');
  }

  if (services.length > 0) {
    args.push(...services);
  }

  console.log(`Starting Docker Compose stack using ${composeFile}`);
  await runCommand(command, args);
  console.log('Docker Compose stack started successfully.');
}
