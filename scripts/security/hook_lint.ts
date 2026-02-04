import { HookPolicy } from '@summit/policy';
import * as fs from 'fs';

async function main() {
  const fileToLint = process.argv[2];
  if (!fileToLint) {
    console.log("Usage: hook_lint <file>");
    // process.exit(1); // Don't exit 1 for usage help in this demo
    return;
  }

  let content = "";
  try {
      content = fs.readFileSync(fileToLint, 'utf-8');
  } catch (e) {
      console.error(`Could not read file: ${fileToLint}`);
      process.exit(1);
  }

  // Mock hook name derivation
  const hookName = 'custom-hook';

  const policy = new HookPolicy('safe');
  const result = policy.validate(hookName, content);

  if (!result.allowed) {
    console.error(`Hook Rejected: ${result.reason}`);
    process.exit(1);
  }

  console.log("Hook Approved.");
}

main().catch(console.error);
