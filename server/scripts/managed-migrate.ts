#!/usr/bin/env node
import { execSync } from 'child_process';

const args = process.argv.slice(2);
const command = args[0] || 'up';

console.log(`Running migration: ${command}`);

try {
  // Use prisma migrate deploy for production/CI environments
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('Migration successful');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}
