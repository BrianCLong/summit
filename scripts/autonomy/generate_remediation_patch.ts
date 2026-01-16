import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ALLOWED_CLASSES = [
  'policy_alignment',
  'doc_link_fix',
  'required_checks_update',
  'schema_validation_fix'
];

async function main() {
  const args = process.argv.slice(2);
  const typeArg = args.find(a => a.startsWith('--type='));
  const targetArg = args.find(a => a.startsWith('--target='));
  const outputArg = args.find(a => a.startsWith('--output='));

  if (!typeArg || !targetArg) {
    console.error('Usage: tsx scripts/autonomy/generate_remediation_patch.ts --type=<class> --target=<file> [--output=<file>]');
    process.exit(1);
  }

  const type = typeArg.split('=')[1];
  const target = targetArg.split('=')[1];
  const output = outputArg ? outputArg.split('=')[1] : null;

  if (!ALLOWED_CLASSES.includes(type)) {
    console.error(`Error: Remediation class '${type}' is not allowed. Allowed: ${ALLOWED_CLASSES.join(', ')}`);
    process.exit(1);
  }

  console.log(`Generating remediation patch for ${type} on ${target}...`);

  // Create a temporary copy of the target file to apply changes
  const tempTarget = `${target}.temp`;
  fs.copyFileSync(target, tempTarget);

  try {
    // Apply changes based on type
    let changed = false;
    const content = fs.readFileSync(tempTarget, 'utf8');

    if (type === 'doc_link_fix') {
      // Dummy implementation: replace http:// with https://
      if (content.includes('http://')) {
        const newContent = content.replace(/http:\/\//g, 'https://');
        fs.writeFileSync(tempTarget, newContent);
        changed = true;
      }
    } else if (type === 'policy_alignment') {
        // Dummy: Append a newline if missing
        if (!content.endsWith('\n')) {
            fs.writeFileSync(tempTarget, content + '\n');
            changed = true;
        }
    }
    // Add other handlers here

    if (!changed) {
      console.log('No changes needed.');
      fs.unlinkSync(tempTarget);
      return;
    }

    // Generate diff
    // We use diff command.
    try {
        // diff -u original modified
        const diff = execSync(`diff -u ${target} ${tempTarget} || true`, { encoding: 'utf-8' });

        if (output) {
            fs.writeFileSync(output, diff);
            console.log(`Patch written to ${output}`);
        } else {
            console.log(diff);
        }
    } catch (e) {
        console.error('Error generating diff:', e);
    }

  } finally {
    if (fs.existsSync(tempTarget)) {
      fs.unlinkSync(tempTarget);
    }
  }
}

main();
