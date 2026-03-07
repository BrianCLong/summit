import { execSync } from 'child_process';
try {
  execSync('NODE_OPTIONS="--experimental-vm-modules" npx jest --config server/jest.config.ts server/src/__tests__/marketplace_v2.test.ts', { stdio: 'inherit' });
} catch (e) {
  process.exit(1);
}
