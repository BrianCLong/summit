import { execSync } from 'node:child_process';
import { join } from 'node:path';

export default async function globalTeardown(): Promise<void> {
  if (process.env.SKIP_E2E_DOCKER === 'true') {
    console.warn('[e2e] Skipping Docker Compose teardown because SKIP_E2E_DOCKER=true');
    return;
  }

  const composeFile = join(process.cwd(), 'e2e', 'docker-compose.yml');
  const projectName = process.env.E2E_COMPOSE_PROJECT ?? 'summit-e2e-tests';
  try {
    execSync(`docker compose -p ${projectName} -f ${composeFile} down -v --remove-orphans`, {
      stdio: 'inherit',
    });
  } catch (error) {
    console.warn('[e2e] Failed to tear down Docker Compose environment:', (error as Error).message);
  }
}
