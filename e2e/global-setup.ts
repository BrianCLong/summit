import { execSync } from 'node:child_process';
import { join } from 'node:path';

function runDockerCompose(args: string) {
  const composeFile = join(process.cwd(), 'e2e', 'docker-compose.yml');
  const projectName = process.env.E2E_COMPOSE_PROJECT ?? 'summit-e2e-tests';
  const skip = process.env.SKIP_E2E_DOCKER === 'true';

  if (skip) {
    console.warn('[e2e] Skipping Docker Compose management because SKIP_E2E_DOCKER=true');
    return;
  }

  const command = `docker compose -p ${projectName} -f ${composeFile} ${args}`;
  execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env,
      COMPOSE_DOCKER_CLI_BUILD: '1',
    },
  });
}

export default async function globalSetup(): Promise<void> {
  try {
    runDockerCompose('down -v --remove-orphans');
  } catch (error) {
    console.warn('[e2e] Failed to clean previous Compose environment:', (error as Error).message);
  }

  runDockerCompose('up -d --wait');
}
