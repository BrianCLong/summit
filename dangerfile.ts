import { danger, warn, fail, message, markdown } from 'danger';

/**
 * Danger.js Automated Code Review
 *
 * This file implements automated code review checks for pull requests.
 * It enforces code quality standards, best practices, and provides helpful feedback.
 */

// ============================================================================
// Configuration
// ============================================================================

const LARGE_PR_THRESHOLD = 500;
const LARGE_FILE_THRESHOLD = 400;
const MAX_COMMIT_MESSAGE_LENGTH = 72;
const MIN_DESCRIPTION_LENGTH = 50;

// ============================================================================
// PR Size and Scope Checks
// ============================================================================

const pr = danger.github.pr;
const modified = danger.git.modified_files;
const created = danger.git.created_files;
const deleted = danger.git.deleted_files;
const allFiles = [...modified, ...created];

// Check PR size
const additions = pr.additions || 0;
const deletions = pr.deletions || 0;
const totalChanges = additions + deletions;

if (totalChanges > LARGE_PR_THRESHOLD) {
  warn(
    `This PR is quite large (${totalChanges} lines changed). ` +
    `Consider breaking it into smaller PRs for easier review. ` +
    `Target: < ${LARGE_PR_THRESHOLD} lines.`
  );
}

// ============================================================================
// PR Description Checks
// ============================================================================

const hasDescription = pr.body && pr.body.length > MIN_DESCRIPTION_LENGTH;

if (!hasDescription) {
  fail(
    `Please add a detailed PR description (minimum ${MIN_DESCRIPTION_LENGTH} characters). ` +
    `Include:\n` +
    `- What changes were made\n` +
    `- Why these changes were needed\n` +
    `- How to test the changes\n` +
    `- Any breaking changes or migration notes`
  );
}

// Check for linked issues
if (!/#[0-9]+/.test(pr.body || '')) {
  warn('Consider linking a related issue (e.g., #123) in the PR description.');
}

// Check for required sections
const requiredSections = ['## Summary', '## Test Plan'];
const missingSections = requiredSections.filter(
  (section) => !pr.body?.includes(section)
);

if (missingSections.length > 0) {
  warn(
    `PR description is missing recommended sections:\n` +
    missingSections.map((s) => `- ${s}`).join('\n')
  );
}

// ============================================================================
// Code Quality Checks
// ============================================================================

// Check for TODO/FIXME additions
const todosAdded = allFiles.some((file) => {
  const diff = danger.git.diffForFile(file);
  return diff && diff.added && /TODO|FIXME|HACK|XXX/.test(diff.added);
});

if (todosAdded) {
  message(
    `📝 New TODOs/FIXMEs added. Consider creating GitHub issues to track these.`
  );
}

// Check for console.log additions (non-test files)
const consoleLogsAdded = allFiles
  .filter((file) => !file.includes('.test.') && !file.includes('.spec.'))
  .some((file) => {
    const diff = danger.git.diffForFile(file);
    return diff && diff.added && /console\.(log|debug|info)/.test(diff.added);
  });

if (consoleLogsAdded) {
  warn(
    `🔍 console.log/debug/info statements added. ` +
    `Use proper logging (Winston/Pino) instead of console statements.`
  );
}

// Check for debugger statements
const debuggerAdded = allFiles.some((file) => {
  const diff = danger.git.diffForFile(file);
  return diff && diff.added && /debugger/.test(diff.added);
});

if (debuggerAdded) {
  fail(`🐛 debugger statements found. Remove debugger statements before merging.`);
}

// ============================================================================
// Security Checks
// ============================================================================

// Check for potential secrets
const potentialSecrets = allFiles.some((file) => {
  const diff = danger.git.diffForFile(file);
  return (
    diff &&
    diff.added &&
    /(password|secret|api[_-]?key|token|credential)/i.test(diff.added)
  );
});

if (potentialSecrets) {
  warn(
    `🔐 Potential secrets or credentials detected. ` +
    `Ensure no actual secrets are committed. Use environment variables.`
  );
}

// Check for eval() usage
const evalUsage = allFiles.some((file) => {
  const diff = danger.git.diffForFile(file);
  return diff && diff.added && /\beval\(/.test(diff.added);
});

if (evalUsage) {
  fail(
    `⚠️ eval() usage detected. eval() is a security risk. Find an alternative approach.`
  );
}

// ============================================================================
// Test Coverage Checks
// ============================================================================

const hasTestChanges = allFiles.some(
  (file) => file.includes('.test.') || file.includes('.spec.')
);

const hasSourceChanges = allFiles.some(
  (file) =>
    (file.endsWith('.ts') ||
      file.endsWith('.tsx') ||
      file.endsWith('.js') ||
      file.endsWith('.jsx')) &&
    !file.includes('.test.') &&
    !file.includes('.spec.') &&
    !file.includes('__tests__')
);

if (hasSourceChanges && !hasTestChanges) {
  warn(
    `🧪 This PR modifies source code but doesn't include test changes. ` +
    `Consider adding tests to maintain code coverage.`
  );
}

// ============================================================================
// Documentation Checks
// ============================================================================

const hasDocChanges = allFiles.some(
  (file) => file.endsWith('.md') || file.includes('docs/')
);

const hasMajorChanges = totalChanges > 200;

if (hasMajorChanges && !hasDocChanges) {
  message(
    `📚 This is a significant PR. Consider updating documentation in the \`docs/\` directory ` +
    `or README files to reflect these changes.`
  );
}

// Check for CLAUDE.md updates when adding new tools/workflows
const hasToolingChanges = allFiles.some(
  (file) =>
    file.includes('package.json') ||
    file.includes('.github/workflows/') ||
    file.includes('Makefile')
);

if (hasToolingChanges && !modified.includes('CLAUDE.md')) {
  message(
    `🤖 You've modified tooling/workflows. Consider updating CLAUDE.md ` +
    `to keep AI assistant context current.`
  );
}

// ============================================================================
// Dependency Checks
// ============================================================================

const hasPackageJsonChanges = modified.includes('package.json');
const hasPnpmLockChanges = modified.includes('pnpm-lock.yaml');

if (hasPackageJsonChanges && !hasPnpmLockChanges) {
  fail(
    `📦 package.json was modified but pnpm-lock.yaml was not updated. ` +
    `Run \`pnpm install\` to update the lockfile.`
  );
}

// ============================================================================
// GraphQL Schema Changes
// ============================================================================

const hasSchemaChanges = allFiles.some((file) => file.endsWith('.graphql'));

if (hasSchemaChanges) {
  message(
    `🔄 GraphQL schema changes detected. Remember to:\n` +
    `- Run \`pnpm graphql:schema:check\` to check for breaking changes\n` +
    `- Run \`pnpm graphql:codegen\` to regenerate types\n` +
    `- Update persisted queries if needed: \`pnpm persisted:build\``
  );
}

// ============================================================================
// Database Migration Checks
// ============================================================================

const hasMigrationChanges = allFiles.some(
  (file) => file.includes('migrations/') || file.includes('prisma/schema.prisma')
);

if (hasMigrationChanges) {
  message(
    `🗄️ Database migration detected. Ensure:\n` +
    `- Migration is reversible\n` +
    `- Migration is tested locally\n` +
    `- Data migration plan is documented if needed\n` +
    `- Backup plan exists for production deployment`
  );
}

// ============================================================================
// Final Summary
// ============================================================================

markdown(`
## 📊 PR Statistics

- **Total Changes**: ${totalChanges} lines (${additions} additions, ${deletions} deletions)
- **Files Modified**: ${modified.length}
- **Files Created**: ${created.length}
- **Files Deleted**: ${deleted.length}

---

*Automated review by Danger.js* 🤖
`);
