// PR Merge-Green Orchestrator Configuration for IntelGraph Platform
// Tailored to this specific repository structure and requirements

module.exports = {
  // Repository-specific configuration
  REPO: process.env.REPO || 'BrianCLong/intelgraph-platform', // Updated to actual repo name
  BASE_BRANCH: process.env.BASE_BRANCH || 'main',
  REQUIRED_CHECKS: process.env.REQUIRED_CHECKS
    ? process.env.REQUIRED_CHECKS.split(',')
    : [
        'CI - Comprehensive Gates / setup',
        'CI - Comprehensive Gates / lint-and-typecheck',
        'CI - Comprehensive Gates / unit-integration-tests',
        'CI - Comprehensive Gates / security-gates',
        'CI - Comprehensive Gates / build-and-attestation',
        'CI - Comprehensive Gates / merge-readiness',
      ],
  INCLUDE_LABELS: process.env.INCLUDE_LABELS
    ? process.env.INCLUDE_LABELS.split(',')
    : ['bug', 'security', 'hotfix', 'priority'],
  EXCLUDE_LABELS: process.env.EXCLUDE_LABELS
    ? process.env.EXCLUDE_LABELS.split(',')
    : ['wip', 'draft', 'do-not-merge'],
  MAX_PR_COUNT: parseInt(process.env.MAX_PR_COUNT) || 50,
  DRY_RUN: process.env.DRY_RUN === 'true' || true, // Default to true for safety
  AUTO_FIX: process.env.AUTO_FIX === 'true' || true,
  CONCURRENCY: parseInt(process.env.CONCURRENCY) || 3,
  TIMEBOX_MIN: parseInt(process.env.TIMEBOX_MIN) || 20,

  // Repository-specific settings
  PACKAGE_MANAGER: 'pnpm',
  BUILD_COMMAND: 'pnpm run build',
  TEST_COMMAND: 'pnpm run test:ci',
  LINT_COMMAND: 'pnpm run lint',
  TYPECHECK_COMMAND: 'pnpm run typecheck',
  SECURITY_COMMAND: 'pnpm audit && npx trivy fs .',

  // Repository-specific paths and files that need special attention
  SENSITIVE_PATHS: [
    'server/src/',
    'packages/security/',
    'packages/permissions/',
    'docker-compose*.yml',
    'Dockerfile*',
    'k8s/',
    'helm/',
    '.github/workflows/',
    'SECURITY.md',
  ],

  // Risk scoring weights specific to this repository
  PRIORITY_WEIGHTS: {
    is_blocker_label: 5, // Critical issues blocking releases
    impacts_ci_or_security: 4, // Changes to CI or security components
    base_branch_behind_50: 3, // PR is behind main by many commits
    has_failing_checks: 3, // PR has failing required checks
    small_diff: 2, // Small changes that are easier to review
    recent_activity: 2, // Recently updated PRs
    docs_or_test_improvement: 1, // Documentation and test improvements
    draft_status: -3, // Draft PRs
    needs_author_input: -2, // PRs awaiting author response
    wip_label: -2, // Work-in-progress PRs
  },
};
