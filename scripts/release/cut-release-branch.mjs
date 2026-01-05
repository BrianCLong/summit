#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { execSync } from 'node:child_process';
import { exit, argv } from 'node:process';

// Handle pnpm passing '--' as an argument
const args = argv.slice(2).filter(arg => arg !== '--');

const { values } = parseArgs({
  args,
  options: {
    from: { type: 'string' },
    series: { type: 'string' },
    remote: { type: 'string', default: 'origin' },
    push: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
});

if (!values.from) {
  console.error('Error: --from <tag|sha> is required');
  exit(1);
}

if (!values.series) {
  console.error('Error: --series <X.Y> is required');
  exit(1);
}

if (!/^\d+\.\d+$/.test(values.series)) {
  console.error('Error: --series must be in format X.Y (e.g., 0.3)');
  exit(1);
}

const branchName = `release/${values.series}`;

const run = (cmd) => {
  console.log(`> ${cmd}`);
  if (!values['dry-run']) {
    return execSync(cmd, { encoding: 'utf-8' }).trim();
  }
  return '';
};

// 1. Resolve `from` to a commit SHA
let sha;
try {
  // Even in dry-run we want to verify the 'from' exists
  // Use ^{commit} to resolve annotated tags to their commit SHA
  sha = execSync(`git rev-parse "${values.from}^{commit}"`, { encoding: 'utf-8' }).trim();
  console.log(`Resolved ${values.from} to ${sha}`);
} catch (e) {
  // Fallback: if it's already a commit SHA or simple ref, the ^{commit} syntax might fail (though usually it works for commits too)
  // But strictly speaking, git rev-parse <sha>^{commit} works even if <sha> is a commit.
  // However, let's just catch and try without suffix if needed, or assume the first failed because the ref didn't exist.
  // Actually, let's try a simpler approach: try with ^{commit} first.
  try {
     sha = execSync(`git rev-parse "${values.from}"`, { encoding: 'utf-8' }).trim();
     console.log(`Resolved ${values.from} to ${sha} (warning: treated as direct ref, not dereferenced tag)`);
  } catch (e2) {
     console.error(`Error: Could not resolve ref ${values.from}`);
     exit(1);
  }
}

// Check if branch exists
let branchExists = false;
try {
    execSync(`git show-ref --verify refs/heads/${branchName}`, { stdio: 'ignore' });
    branchExists = true;
} catch (e) {
    branchExists = false;
}

if (branchExists) {
    const branchSha = execSync(`git rev-parse refs/heads/${branchName}`, { encoding: 'utf-8' }).trim();
    if (branchSha !== sha) {
        console.error(`Error: Branch ${branchName} already exists and points to a different commit (${branchSha}).`);
        console.error(`If you intend to reset it, please do so manually.`);
        exit(1);
    }
    console.log(`Branch ${branchName} already exists and points to the correct SHA.`);
} else {
    // 3. Create/fast-forward local branch to that SHA
    run(`git branch ${branchName} ${sha}`);
    console.log(`Created branch ${branchName} at ${sha}`);
}

// 4. Print next steps
console.log('\n✅ Branch ready!');
if (!values.push) {
    console.log(`\nTo push manually:`);
    console.log(`  git push ${values.remote} ${branchName}`);
}

console.log(`\nBackport Process:`);
console.log(`  1. Create PR to 'main'`);
console.log(`  2. Add labels: 'backport/needed', 'backport/release-${values.series}'`);
console.log(`  3. Merge PR`);
console.log(`  4. Cherry-pick commit to '${branchName}'`);

// 5. If --push and not dry-run, push branch to remote.
if (values.push) {
    if (values['dry-run']) {
        console.log(`\n[Dry Run] Would push ${branchName} to ${values.remote}`);
    } else {
        try {
            run(`git push ${values.remote} ${branchName}`);
            console.log(`Pushed ${branchName} to ${values.remote}`);
        } catch (e) {
            console.error(`Error pushing branch: ${e.message}`);
            exit(1);
        }
    }
}
