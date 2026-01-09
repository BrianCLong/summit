#!/usr/bin/env node
import { execSync } from 'child_process';
import yargsParser from 'yargs-parser';

async function main() {
  const args = yargsParser(process.argv.slice(2));
  const { profile } = args;

  if (!profile) {
    console.error('Usage: ./scripts/deploy/smoke_check.mjs --profile <profile_name>');
    process.exit(1);
  }

  console.log(`Running smoke check for profile: ${profile}...`);

  try {
    // A simple smoke test: check if the main service is responding.
    // In a real scenario, this would be more sophisticated.
    execSync('curl -f http://localhost:4000/graphql', { stdio: 'ignore' });
    console.log('Smoke check passed: Service is healthy.');
  } catch (error) {
    console.error('Smoke check failed: Service is not responding.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
