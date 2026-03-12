#!/usr/bin/env node

/**
 * S-AOS CLI Tool
 *
 * Command-line interface for S-AOS compliance workflows.
 * Provides helpers for commits, PRs, evidence, and validation.
 *
 * Usage: node scripts/s-aos.mjs <command> [options]
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================================
// Commands
// ============================================================================

const commands = {
  /**
   * Install git hooks
   */
  async 'install-hooks'(args) {
    log('\n━━━ Installing S-AOS Git Hooks ━━━\n', 'blue');

    const force = args.includes('--force');

    try {
      const { stdout } = await execAsync(`./scripts/install-git-hooks.sh ${force ? '--force' : ''}`);
      console.log(stdout);
      log('✅ Git hooks installed successfully', 'green');
    } catch (error) {
      log('❌ Failed to install hooks', 'red');
      console.error(error.message);
      process.exit(1);
    }
  },

  /**
   * Validate commit message
   */
  async 'check-commit'(args) {
    log('\n━━━ Checking Last Commit Message ━━━\n', 'blue');

    try {
      // Get last commit message
      const { stdout: message } = await execAsync('git log -1 --pretty=%B');

      // Write to temp file
      const tempFile = '/tmp/commit-msg-check';
      await fs.writeFile(tempFile, message);

      // Run commit-msg hook
      const { stdout } = await execAsync(`./scripts/hooks/commit-msg ${tempFile}`);
      console.log(stdout);
    } catch (error) {
      console.log(error.stdout || error.message);
      process.exit(1);
    }
  },

  /**
   * Run compliance checks
   */
  async 'check-compliance'(args) {
    log('\n━━━ Running S-AOS Compliance Checks ━━━\n', 'blue');

    try {
      const { stdout } = await execAsync('node scripts/verify-s-aos-compliance.mjs');
      console.log(stdout);
      log('\n✅ Compliance checks passed', 'green');
    } catch (error) {
      console.log(error.stdout || error.message);
      log('\n❌ Compliance checks failed', 'red');
      process.exit(1);
    }
  },

  /**
   * Verify audit trail
   */
  async 'check-audit'(args) {
    log('\n━━━ Verifying Audit Trail ━━━\n', 'blue');

    try {
      const { stdout } = await execAsync('node services/repoos/immutable-audit-logger.mjs verify');
      console.log(stdout);
    } catch (error) {
      console.log(error.stdout || error.message);
      process.exit(1);
    }
  },

  /**
   * Run integration tests
   */
  async 'test'(args) {
    log('\n━━━ Running S-AOS Integration Tests ━━━\n', 'blue');

    try {
      const { stdout } = await execAsync('node services/repoos/__tests__/s-aos-integration.test.mjs');
      console.log(stdout);
    } catch (error) {
      console.log(error.stdout || error.message);
      process.exit(1);
    }
  },

  /**
   * Generate commit message template
   */
  async 'template'(args) {
    const type = args[0] || 'feat';
    const scope = args[1] || 'scope';

    log('\n━━━ Commit Message Template ━━━\n', 'blue');

    const template = `${type}(${scope}): Brief description (max 72 chars)

What Changed:
- Specific change 1
- Specific change 2

Why:
Explain the motivation for this change. What problem does it solve?
What benefit does it provide?

Verification:
- [ ] Tests added/updated
- [ ] Manual testing completed
- [ ] CI checks pass

Evidence:
- Test results: [link or summary]
- Metrics: [before/after]
- Screenshots: [if applicable]

Risk Assessment: ${['auth', 'security', 'database', 'api'].includes(scope) ? 'REQUIRED for ' + scope : '(Optional)'}
${['auth', 'security', 'database', 'api'].includes(scope) ? `- Impact: [HIGH/MEDIUM/LOW]
- Blast radius: [who/what is affected]
- Rollback plan: [how to revert if needed]
- Testing in staging: [yes/no]` : ''}`;

    console.log(template);
    log('\n💡 Copy this template or use: git config --local commit.template .gitmessage', 'cyan');
  },

  /**
   * Score a PR or commit
   */
  async 'score'(args) {
    log('\n━━━ S-AOS Scoring ━━━\n', 'blue');

    if (args.includes('--help')) {
      console.log('Usage: s-aos score [--commit <hash>] [--pr <number>]');
      console.log('\nScores a commit or PR against S-AOS compliance standards');
      return;
    }

    // Placeholder - would need actual scoring logic
    log('⚠️  Scoring feature coming soon', 'yellow');
    log('For now, see docs/governance/S-AOS_COMPLIANCE_SCORECARD.md', 'cyan');
  },

  /**
   * Generate PR checklist
   */
  async 'pr-checklist'(args) {
    log('\n━━━ S-AOS PR Checklist ━━━\n', 'blue');

    const checklist = `## S-AOS Compliance Checklist

### Required
- [ ] Atomic scope (ONE purpose per PR)
- [ ] Evidence artifacts included
- [ ] Verification steps completed
- [ ] Security/governance requirements addressed

### Assumption Ledger
**Assumptions**:
- List key assumptions here

**Ambiguities**:
- Note any unclear requirements

**Tradeoffs**:
- Document design tradeoffs

**Stop Conditions**:
- When would you ask the user instead of proceeding?

### Verification Plan
- [ ] Step 1: [describe verification step]
- [ ] Step 2: [describe verification step]
- [ ] Step 3: [describe verification step]

### Evidence
- Test results: [link or summary]
- Metrics: [before/after comparison]
- Screenshots: [if applicable]
- Logs: [relevant excerpts]

### Risk Assessment (for high-impact changes)
- **Impact**: [HIGH/MEDIUM/LOW]
- **Blast radius**: [who/what is affected]
- **Rollback plan**: [how to revert]
- **Testing**: [staging/production plan]
`;

    console.log(checklist);
    log('\n💡 Copy this into your PR description', 'cyan');
  },

  /**
   * List available examples
   */
  async 'examples'(args) {
    log('\n━━━ S-AOS Examples ━━━\n', 'blue');

    const examples = {
      'Commit Messages': 'docs/governance/S-AOS_EXAMPLES_GOOD_VS_BAD.md',
      'PR Structure': 'docs/governance/S-AOS_EXAMPLES_GOOD_VS_BAD.md',
      'Evidence Artifacts': 'docs/governance/examples/evidence/README.md',
      'Entropy Report': 'docs/governance/examples/evidence/entropy-report-example.json',
      'Resurrection Report': 'docs/governance/examples/evidence/resurrection-report-example.json',
      'Audit Log': 'docs/governance/examples/evidence/audit-log-example.json',
    };

    for (const [name, file] of Object.entries(examples)) {
      log(`  ${name}:`, 'cyan');
      log(`    ${file}`, 'reset');
    }

    log('\n💡 Open any file to see examples', 'cyan');
  },

  /**
   * Show documentation links
   */
  async 'docs'(args) {
    log('\n━━━ S-AOS Documentation ━━━\n', 'blue');

    const docs = {
      'Quick Start': 'docs/governance/QUICK_START_IMPLEMENTATION.md',
      'Migration Guide': 'docs/governance/S-AOS_MIGRATION_GUIDE.md',
      'Compliance Scorecard': 'docs/governance/S-AOS_COMPLIANCE_SCORECARD.md',
      'Good vs Bad Examples': 'docs/governance/S-AOS_EXAMPLES_GOOD_VS_BAD.md',
      'Evidence Contract Spec': 'docs/governance/EVIDENCE_CONTRACT_SPEC.md',
      'Implementation Complete': 'docs/governance/S-AOS_IMPLEMENTATION_COMPLETE.md',
      'Board Review Package': 'docs/governance/BOARD_REVIEW_PACKAGE_PR_STACK.md',
    };

    for (const [name, file] of Object.entries(docs)) {
      log(`  ${name}:`, 'cyan');
      log(`    ${file}`, 'reset');
    }

    log('\n💡 Start with Quick Start for implementation guide', 'cyan');
  },

  /**
   * Show status
   */
  async 'status'(args) {
    log('\n━━━ S-AOS Status ━━━\n', 'blue');

    // Check git hooks
    const hooksInstalled = await Promise.all([
      fs.access('.git/hooks/pre-commit').then(() => true).catch(() => false),
      fs.access('.git/hooks/commit-msg').then(() => true).catch(() => false),
    ]);

    log('Git Hooks:', 'cyan');
    log(`  pre-commit: ${hooksInstalled[0] ? '✅ Installed' : '❌ Not installed'}`, hooksInstalled[0] ? 'green' : 'red');
    log(`  commit-msg: ${hooksInstalled[1] ? '✅ Installed' : '❌ Not installed'}`, hooksInstalled[1] ? 'green' : 'red');

    // Check git template
    try {
      const { stdout } = await execAsync('git config --local commit.template');
      const template = stdout.trim();
      log(`\nCommit Template: ${template || 'Not configured'}`, template ? 'green' : 'yellow');
    } catch {
      log('\nCommit Template: Not configured', 'yellow');
    }

    // Check audit trail
    const auditExists = await fs.access('artifacts/repoos/entropy-actions/audit.json')
      .then(() => true)
      .catch(() => false);

    log(`\nAudit Trail: ${auditExists ? '✅ Exists' : '⚠️  Not found'}`, auditExists ? 'green' : 'yellow');

    if (auditExists) {
      try {
        const audit = JSON.parse(await fs.readFile('artifacts/repoos/entropy-actions/audit.json', 'utf-8'));
        log(`  Entries: ${audit.length}`, 'reset');
      } catch {}
    }

    // Check environment
    log('\nEnvironment:', 'cyan');
    const hasEnv = await fs.access('.env').then(() => true).catch(() => false);
    log(`  .env file: ${hasEnv ? '✅ Found' : '⚠️  Not found'}`, hasEnv ? 'green' : 'yellow');

    if (hasEnv) {
      const env = await fs.readFile('.env', 'utf-8');
      const hasAuditSecret = env.includes('AUDIT_LOG_SECRET=') && !env.includes('AUDIT_LOG_SECRET=replace_me');
      log(`  AUDIT_LOG_SECRET: ${hasAuditSecret ? '✅ Configured' : '⚠️  Not set'}`, hasAuditSecret ? 'green' : 'yellow');

      const hasSlack = env.includes('SLACK_BOT_TOKEN=') && !env.includes('SLACK_BOT_TOKEN=xoxb-your');
      log(`  Slack configured: ${hasSlack ? '✅ Yes' : '❌ No (optional)'}`, hasSlack ? 'green' : 'reset');
    }

    log('\n💡 Run `s-aos install-hooks` to install git hooks', 'cyan');
  },

  /**
   * Show help
   */
  async 'help'(args) {
    log('\n━━━ S-AOS CLI Tool ━━━\n', 'blue');

    console.log('Usage: node scripts/s-aos.mjs <command> [options]\n');

    console.log('Commands:\n');

    const commandHelp = {
      'install-hooks': 'Install pre-commit and commit-msg hooks',
      'check-commit': 'Validate last commit message',
      'check-compliance': 'Run full compliance checks',
      'check-audit': 'Verify audit trail signatures',
      'test': 'Run integration tests',
      'template [type] [scope]': 'Generate commit message template',
      'pr-checklist': 'Generate PR description checklist',
      'score': 'Score a commit or PR (coming soon)',
      'examples': 'List available examples',
      'docs': 'List documentation',
      'status': 'Show S-AOS configuration status',
      'help': 'Show this help message',
    };

    for (const [cmd, desc] of Object.entries(commandHelp)) {
      log(`  ${cmd.padEnd(30)}`, 'cyan');
      log(`    ${desc}`, 'reset');
    }

    console.log('\nExamples:\n');
    console.log('  node scripts/s-aos.mjs install-hooks');
    console.log('  node scripts/s-aos.mjs check-commit');
    console.log('  node scripts/s-aos.mjs template feat api');
    console.log('  node scripts/s-aos.mjs status');

    log('\n💡 For more help, see: docs/governance/S-AOS_IMPLEMENTATION_COMPLETE.md', 'cyan');
  },
};

// ============================================================================
// Main
// ============================================================================

async function main() {
  const [,, command, ...args] = process.argv;

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    await commands.help([]);
    return;
  }

  const handler = commands[command];

  if (!handler) {
    log(`❌ Unknown command: ${command}`, 'red');
    log('Run `s-aos help` for available commands', 'yellow');
    process.exit(1);
  }

  try {
    await handler(args);
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
