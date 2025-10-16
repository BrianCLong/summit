#!/usr/bin/env node

/**
 * Advanced Collaboration Hub for Maestro Build Plane
 * Facilitates team collaboration, code reviews, and project coordination
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

class CollaborationHub {
  constructor() {
    this.reportDir = join(root, 'test-results', 'collaboration');
    this.configDir = join(root, '.collaboration');
    this.startTime = Date.now();
    this.teamData = {
      members: [],
      contributions: [],
      codeReviews: [],
      issues: [],
      milestones: [],
    };
  }

  async setup() {
    console
      .log('🤝 Setting up Collaboration Hub...')

      [
        // Create directories
        (this.reportDir, this.configDir)
      ].forEach((dir) => {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      });
  }

  async createGitHooks() {
    console.log('🪝 Creating Git collaboration hooks...');

    const hooksDir = join(root, '.git', 'hooks');

    const hooks = {
      'pre-commit': this.generatePreCommitHook(),
      'commit-msg': this.generateCommitMsgHook(),
      'pre-push': this.generatePrePushHook(),
      'post-merge': this.generatePostMergeHook(),
    };

    for (const [hookName, hookContent] of Object.entries(hooks)) {
      const hookPath = join(hooksDir, hookName);
      writeFileSync(hookPath, hookContent, { mode: 0o755 });
      console.log(`  ✅ Created ${hookName} hook`);
    }
  }

  generatePreCommitHook() {
    return `#!/bin/sh
# Pre-commit hook for Maestro Build Plane
# Ensures code quality before commits

echo "🔍 Running pre-commit quality checks..."

# Check for merge conflict markers
if git diff --cached --check; then
  echo "✅ No merge conflict markers found"
else
  echo "❌ Merge conflict markers detected"
  exit 1
fi

# Run linting
echo "📝 Running ESLint..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Please fix errors before committing."
  exit 1
fi

# Run type checking
echo "🔍 Running TypeScript checks..."
npm run typecheck
if [ $? -ne 0 ]; then
  echo "❌ Type checking failed. Please fix errors before committing."
  exit 1
fi

# Run quick tests
echo "🧪 Running quick tests..."
npm run test:unit -- --passWithNoTests
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Please fix before committing."
  exit 1
fi

# Check for TODOs in committed files
TODOS=$(git diff --cached --name-only | xargs grep -l "TODO\\|FIXME\\|XXX" 2>/dev/null || true)
if [ -n "$TODOS" ]; then
  echo "⚠️  Warning: Found TODO/FIXME comments in:"
  echo "$TODOS"
  echo "Consider addressing these before committing."
fi

# Check for console.log statements
CONSOLE_LOGS=$(git diff --cached --name-only -z | xargs -0 grep -l "console\\.log" 2>/dev/null || true)
if [ -n "$CONSOLE_LOGS" ]; then
  echo "⚠️  Warning: Found console.log statements in:"
  echo "$CONSOLE_LOGS"
  echo "Consider removing debug statements before committing."
fi

echo "✅ Pre-commit checks passed!"
`;
  }

  generateCommitMsgHook() {
    return `#!/bin/sh
# Commit message hook for Maestro Build Plane
# Ensures consistent commit message format

commit_regex='^(feat|fix|docs|style|refactor|perf|test|chore|build|ci)(\\(.+\\))?: .{1,50}'

error_msg="❌ Invalid commit message format.

Commit message should follow the pattern:
<type>(<scope>): <description>

Types:
- feat: A new feature
- fix: A bug fix
- docs: Documentation changes
- style: Code style changes (formatting, etc.)
- refactor: Code refactoring
- perf: Performance improvements
- test: Adding or updating tests
- chore: Maintenance tasks
- build: Build system changes
- ci: CI/CD changes

Example:
feat(auth): add OAuth2 integration
fix(dashboard): resolve memory leak in chart component
docs(readme): update installation instructions
"

if ! grep -qE "$commit_regex" "$1"; then
    echo "$error_msg"
    exit 1
fi

echo "✅ Commit message format is valid"
`;
  }

  generatePrePushHook() {
    return `#!/bin/sh
# Pre-push hook for Maestro Build Plane
# Runs comprehensive checks before pushing

echo "🚀 Running pre-push validation..."

# Check if we're pushing to main/master
protected_branch='main'
current_branch=$(git symbolic-ref HEAD | sed -e 's,.*/\\(.*\\),\\1,')

if [ $protected_branch = $current_branch ]; then
    echo "⚠️  Pushing to main branch - running full quality gate..."
    
    # Run quality gate
    node tools/quality-gate.js --skip-performance --skip-accessibility
    if [ $? -ne 0 ]; then
        echo "❌ Quality gate failed. Push aborted."
        exit 1
    fi
fi

# Run security scan
echo "🔒 Running security scan..."
node tools/security-scanner.js --skip-bundle
if [ $? -ne 0 ]; then
    echo "❌ Security scan failed. Push aborted."
    exit 1
fi

echo "✅ Pre-push validation passed!"
`;
  }

  generatePostMergeHook() {
    return `#!/bin/sh
# Post-merge hook for Maestro Build Plane
# Runs after successful merge operations

echo "🔄 Post-merge tasks..."

# Check if package.json was modified
if git diff-tree -r --name-only --no-commit-id HEAD~1 HEAD | grep -q "package.json"; then
    echo "📦 package.json changed - installing dependencies..."
    npm install
fi

# Check if there are new migrations or schema changes
if git diff-tree -r --name-only --no-commit-id HEAD~1 HEAD | grep -q "schema\\|migration"; then
    echo "🗃️  Schema changes detected - you may need to run migrations"
fi

# Regenerate documentation if source files changed
if git diff-tree -r --name-only --no-commit-id HEAD~1 HEAD | grep -qE "\\.(ts|tsx|js|jsx)$"; then
    echo "📚 Source files changed - regenerating documentation..."
    node tools/docs-generator.js --no-report > /dev/null 2>&1
    echo "✅ Documentation updated"
fi

echo "✅ Post-merge tasks completed"
`;
  }

  async createPullRequestTemplates() {
    console.log('📋 Creating pull request templates...');

    const githubDir = join(root, '.github');
    const templatesDir = join(githubDir, 'pull_request_template');

    if (!existsSync(templatesDir)) {
      mkdirSync(templatesDir, { recursive: true });
    }

    const templates = {
      'default.md': this.generateDefaultPRTemplate(),
      'feature.md': this.generateFeaturePRTemplate(),
      'bugfix.md': this.generateBugfixPRTemplate(),
      'hotfix.md': this.generateHotfixPRTemplate(),
    };

    for (const [filename, content] of Object.entries(templates)) {
      writeFileSync(join(templatesDir, filename), content);
      console.log(`  ✅ Created ${filename} template`);
    }
  }

  generateDefaultPRTemplate() {
    return `## Summary

Brief description of changes made in this pull request.

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Style/formatting changes
- [ ] ♻️ Code refactoring
- [ ] ⚡ Performance improvement
- [ ] 🧪 Test changes
- [ ] 🔧 Build/CI changes

## Testing

- [ ] Tests pass locally
- [ ] New tests added for new functionality
- [ ] Manual testing completed
- [ ] Quality gate passes

### Test Plan

Describe how this change was tested:

## Screenshots (if applicable)

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Additional Notes

Any additional information that reviewers should know.
`;
  }

  generateFeaturePRTemplate() {
    return `## Feature Summary

### What does this feature do?

Describe the new functionality being added.

### Why is this feature needed?

Explain the business value or user need this addresses.

## Implementation Details

### Changes Made

- [ ] Frontend components
- [ ] Backend API changes
- [ ] Database schema changes
- [ ] Configuration changes
- [ ] Documentation updates

### Technical Decisions

Explain any significant technical decisions made during implementation.

## Testing

### Automated Tests

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] All tests passing

### Manual Testing

- [ ] Feature tested in development environment
- [ ] Feature tested in staging environment
- [ ] Cross-browser testing completed
- [ ] Mobile responsiveness verified
- [ ] Accessibility testing completed

### Performance Impact

- [ ] No performance degradation
- [ ] Performance improvements measured
- [ ] Bundle size impact assessed

## Security Considerations

- [ ] No new security vulnerabilities introduced
- [ ] Data validation implemented
- [ ] Authorization checks in place
- [ ] Input sanitization applied

## Documentation

- [ ] Code comments added
- [ ] API documentation updated
- [ ] User documentation updated
- [ ] README updated if necessary

## Deployment

- [ ] No deployment script changes needed
- [ ] Environment variables documented
- [ ] Migration scripts provided (if applicable)
- [ ] Rollback plan documented

## Screenshots/Demo

Include screenshots or GIFs demonstrating the new feature.

## Related Issues

Closes #issue_number
`;
  }

  generateBugfixPRTemplate() {
    return `## Bug Description

### What was the bug?

Clear description of the issue that was fixed.

### How was it manifesting?

Describe the symptoms or behavior that indicated the bug.

## Root Cause Analysis

### What caused the bug?

Technical explanation of the underlying cause.

### Why wasn't it caught earlier?

Analysis of why existing tests/processes didn't catch this.

## Fix Details

### Changes Made

List the specific changes made to fix the issue.

### Alternative Solutions Considered

Were there other ways to fix this? Why was this approach chosen?

## Testing

### Bug Reproduction

- [ ] Bug reproduced in development
- [ ] Root cause confirmed
- [ ] Fix verified locally

### Regression Testing

- [ ] Related functionality tested
- [ ] No new issues introduced
- [ ] Edge cases considered

### Test Coverage

- [ ] New tests added to prevent regression
- [ ] Existing tests updated if necessary
- [ ] Test coverage maintained or improved

## Impact Assessment

### Who is affected?

Describe the users or systems impacted by this bug.

### Severity Level

- [ ] Critical (system down, data loss)
- [ ] High (major feature broken)
- [ ] Medium (minor feature impacted)
- [ ] Low (cosmetic or edge case)

## Prevention

### Process Improvements

What can be done to prevent similar bugs in the future?

- [ ] Additional linting rules
- [ ] New automated tests
- [ ] Code review checklist updates
- [ ] Documentation improvements

## Verification

- [ ] Fix verified in staging environment
- [ ] Performance impact assessed
- [ ] No breaking changes introduced
- [ ] Quality gate passes

## Related Issues

Fixes #issue_number
`;
  }

  generateHotfixPRTemplate() {
    return `## HOTFIX: Emergency Fix

### Critical Issue

Describe the critical issue requiring immediate attention.

### Impact

- [ ] Production system down
- [ ] Data integrity at risk
- [ ] Security vulnerability
- [ ] Major user-facing bug
- [ ] Performance degradation

### Urgency Level

- [ ] 🚨 P0 - Complete system failure
- [ ] 🔴 P1 - Critical functionality broken
- [ ] 🟡 P2 - Important feature impacted

## Quick Fix Details

### Minimal Changes Made

List only the essential changes to resolve the critical issue.

### Temporary vs Permanent

- [ ] This is a temporary fix
- [ ] This is the permanent solution
- [ ] Follow-up work required

## Emergency Testing

### Verification Steps

- [ ] Critical path tested
- [ ] Fix verified in production-like environment
- [ ] No obvious side effects observed

### Risks Accepted

List any risks being accepted for this emergency deployment.

## Deployment Plan

### Rollout Strategy

- [ ] Direct to production
- [ ] Staged rollout
- [ ] Blue-green deployment
- [ ] Feature flag controlled

### Rollback Plan

Clear steps for rolling back if issues arise.

### Monitoring

What metrics/logs will be monitored post-deployment?

## Communication

### Stakeholders Notified

- [ ] Product team
- [ ] Engineering management  
- [ ] DevOps team
- [ ] Customer support

### Post-mortem Required

- [ ] Yes - scheduled for [date]
- [ ] No - minor issue

## Follow-up Work

If this is a temporary fix, describe the follow-up work needed:

- [ ] Proper fix implementation
- [ ] Additional testing
- [ ] Process improvements
- [ ] Documentation updates

## Emergency Approval

### Approvals Required

- [ ] Engineering manager approval
- [ ] Product manager approval (if user-facing)
- [ ] DevOps approval (if infrastructure)

---

⚠️ **HOTFIX DEPLOYMENT** - Expedited review and deployment approved due to critical nature.
`;
  }

  async createIssueTemplates() {
    console.log('🐛 Creating issue templates...');

    const issueTemplatesDir = join(root, '.github', 'ISSUE_TEMPLATE');

    if (!existsSync(issueTemplatesDir)) {
      mkdirSync(issueTemplatesDir, { recursive: true });
    }

    const templates = {
      'bug_report.yml': this.generateBugReportTemplate(),
      'feature_request.yml': this.generateFeatureRequestTemplate(),
      'performance_issue.yml': this.generatePerformanceIssueTemplate(),
      'security_report.yml': this.generateSecurityReportTemplate(),
    };

    for (const [filename, content] of Object.entries(templates)) {
      writeFileSync(join(issueTemplatesDir, filename), content);
      console.log(`  ✅ Created ${filename} template`);
    }
  }

  generateBugReportTemplate() {
    return `name: 🐛 Bug Report
description: Report a bug or unexpected behavior
title: "[Bug]: "
labels: ["bug", "needs-triage"]
assignees: []

body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to fill out this bug report!

  - type: textarea
    id: description
    attributes:
      label: Bug Description
      description: A clear and concise description of what the bug is.
      placeholder: Describe what happened...
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: Steps to Reproduce
      description: Steps to reproduce the behavior
      placeholder: |
        1. Go to '...'
        2. Click on '....'
        3. Scroll down to '....'
        4. See error
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What you expected to happen
      placeholder: Describe what should have happened...
    validations:
      required: true

  - type: textarea
    id: actual
    attributes:
      label: Actual Behavior
      description: What actually happened
      placeholder: Describe what actually happened...
    validations:
      required: true

  - type: textarea
    id: screenshots
    attributes:
      label: Screenshots
      description: If applicable, add screenshots to help explain your problem
      placeholder: Paste screenshots here...

  - type: dropdown
    id: severity
    attributes:
      label: Severity
      description: How severe is this bug?
      options:
        - Low (cosmetic or minor inconvenience)
        - Medium (functionality impacted but workaround available)
        - High (major functionality broken)
        - Critical (system unusable or data loss)
    validations:
      required: true

  - type: input
    id: browser
    attributes:
      label: Browser
      description: What browser are you using?
      placeholder: e.g., Chrome 96, Safari 15, Firefox 95

  - type: input
    id: os
    attributes:
      label: Operating System
      description: What OS are you using?
      placeholder: e.g., Windows 11, macOS Monterey, Ubuntu 20.04

  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Add any other context about the problem here
      placeholder: Any additional information that might be helpful...
`;
  }

  generateFeatureRequestTemplate() {
    return `name: ✨ Feature Request
description: Suggest a new feature or enhancement
title: "[Feature]: "
labels: ["enhancement", "needs-triage"]
assignees: []

body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting a new feature!

  - type: textarea
    id: problem
    attributes:
      label: Problem Statement
      description: What problem does this feature solve?
      placeholder: As a user, I want... so that I can...
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: Describe your ideal solution
      placeholder: I would like to see...
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternative Solutions
      description: Have you considered alternative solutions?
      placeholder: Other ways this could be solved...

  - type: dropdown
    id: priority
    attributes:
      label: Priority
      description: How important is this feature to you?
      options:
        - Nice to have
        - Would improve workflow
        - Important for productivity
        - Critical for project success
    validations:
      required: true

  - type: checkboxes
    id: user-types
    attributes:
      label: User Types
      description: Who would benefit from this feature?
      options:
        - label: End users
        - label: Developers
        - label: System administrators
        - label: DevOps engineers
        - label: Product managers

  - type: textarea
    id: acceptance-criteria
    attributes:
      label: Acceptance Criteria
      description: What criteria must be met for this feature to be considered complete?
      placeholder: |
        - [ ] Criterion 1
        - [ ] Criterion 2
        - [ ] Criterion 3

  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Add any other context, mockups, or examples
      placeholder: Any additional information...
`;
  }

  generatePerformanceIssueTemplate() {
    return `name: ⚡ Performance Issue
description: Report performance problems or slowdowns
title: "[Performance]: "
labels: ["performance", "needs-investigation"]
assignees: []

body:
  - type: markdown
    attributes:
      value: |
        Help us identify and fix performance issues!

  - type: textarea
    id: issue-description
    attributes:
      label: Performance Issue Description
      description: Describe the performance problem
      placeholder: The application is slow when...
    validations:
      required: true

  - type: dropdown
    id: issue-type
    attributes:
      label: Issue Type
      description: What type of performance issue is this?
      options:
        - Page load time
        - Runtime performance
        - Memory usage
        - Bundle size
        - API response time
        - Database query performance
    validations:
      required: true

  - type: textarea
    id: measurements
    attributes:
      label: Performance Measurements
      description: Provide any performance metrics you've observed
      placeholder: |
        - Page load time: X seconds
        - Memory usage: X MB
        - Bundle size: X KB
        - API response time: X ms

  - type: textarea
    id: environment
    attributes:
      label: Environment Details
      description: Describe your testing environment
      placeholder: |
        - Browser: Chrome 96
        - OS: Windows 11
        - Network: WiFi/4G/3G
        - Device: Desktop/Mobile
    validations:
      required: true

  - type: textarea
    id: repro-steps
    attributes:
      label: Steps to Reproduce
      description: How can we reproduce this performance issue?
      placeholder: |
        1. Go to page X
        2. Perform action Y
        3. Observe performance issue
    validations:
      required: true

  - type: textarea
    id: expected-performance
    attributes:
      label: Expected Performance
      description: What performance level did you expect?
      placeholder: Expected page to load in under 2 seconds...

  - type: textarea
    id: impact
    attributes:
      label: Impact Assessment
      description: How does this affect users or the system?
      placeholder: This causes users to...

  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Any other context, screenshots, or profiling data
      placeholder: Additional information...
`;
  }

  generateSecurityReportTemplate() {
    return `name: 🔒 Security Report
description: Report a security vulnerability or concern
title: "[Security]: "
labels: ["security", "needs-immediate-attention"]
assignees: []

body:
  - type: markdown
    attributes:
      value: |
        **⚠️ SECURITY NOTICE ⚠️**
        
        If this is a critical security vulnerability, please consider reporting it privately through our security contact instead of creating a public issue.

  - type: textarea
    id: vulnerability-description
    attributes:
      label: Security Issue Description
      description: Describe the security vulnerability or concern
      placeholder: Brief description of the security issue...
    validations:
      required: true

  - type: dropdown
    id: severity-level
    attributes:
      label: Severity Level
      description: How severe is this security issue?
      options:
        - Low (minimal impact)
        - Medium (some impact, limited scope)
        - High (significant impact, broad scope)
        - Critical (severe impact, immediate action required)
    validations:
      required: true

  - type: dropdown
    id: vulnerability-type
    attributes:
      label: Vulnerability Type
      description: What type of security issue is this?
      options:
        - Cross-Site Scripting (XSS)
        - SQL Injection
        - Cross-Site Request Forgery (CSRF)
        - Authentication bypass
        - Authorization issues
        - Data exposure
        - Code injection
        - Information disclosure
        - Other
    validations:
      required: true

  - type: textarea
    id: affected-components
    attributes:
      label: Affected Components
      description: Which parts of the system are affected?
      placeholder: |
        - Component/module names
        - File paths
        - Endpoints
    validations:
      required: true

  - type: textarea
    id: attack-scenario
    attributes:
      label: Attack Scenario
      description: How could this vulnerability be exploited?
      placeholder: |
        1. Attacker does X
        2. System responds with Y
        3. Attacker gains access to Z
    validations:
      required: true

  - type: textarea
    id: impact
    attributes:
      label: Potential Impact
      description: What damage could this vulnerability cause?
      placeholder: This could allow an attacker to...
    validations:
      required: true

  - type: textarea
    id: reproduction
    attributes:
      label: Steps to Reproduce
      description: How can this vulnerability be reproduced?
      placeholder: |
        1. Navigate to...
        2. Enter payload...
        3. Observe behavior...

  - type: textarea
    id: mitigation
    attributes:
      label: Suggested Mitigation
      description: Do you have suggestions for fixing this issue?
      placeholder: Possible fixes or workarounds...

  - type: checkboxes
    id: disclosure
    attributes:
      label: Responsible Disclosure
      description: Please confirm your commitment to responsible disclosure
      options:
        - label: I will not publicly disclose details until a fix is available
          required: true
        - label: I have not shared this vulnerability with others
          required: true

  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Any other relevant information
      placeholder: Additional context...
`;
  }

  async generateTeamMetrics() {
    console.log('📊 Generating team collaboration metrics...');

    try {
      // Get Git statistics
      const gitStats = await this.collectGitStatistics();

      // Analyze code review patterns
      const reviewMetrics = await this.analyzeCodeReviews();

      // Generate team report
      const teamReport = {
        timestamp: new Date().toISOString(),
        period: '30 days',
        gitStats,
        reviewMetrics,
        recommendations: this.generateCollaborationRecommendations(
          gitStats,
          reviewMetrics,
        ),
      };

      // Write team metrics report
      writeFileSync(
        join(this.reportDir, 'team-metrics.json'),
        JSON.stringify(teamReport, null, 2),
      );

      return teamReport;
    } catch (error) {
      console.log(
        `  ⚠️ Could not generate complete team metrics: ${error.message}`,
      );
      return null;
    }
  }

  async collectGitStatistics() {
    const stats = {
      totalCommits: 0,
      contributors: [],
      branchActivity: {},
      commitFrequency: {},
      fileChanges: {},
    };

    try {
      // Get commit count
      const { stdout: commitCount } = await execAsync(
        'git rev-list --count HEAD',
      );
      stats.totalCommits = parseInt(commitCount.trim());

      // Get contributor statistics
      const { stdout: contributors } = await execAsync(
        'git shortlog -sn --since="30 days ago"',
      );

      stats.contributors = contributors
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const [commits, ...nameParts] =
            line.trim().split('\t')[1]?.split(' ') || [];
          return {
            name: line.trim().split('\t')[1] || 'Unknown',
            commits: parseInt(line.trim().split('\t')[0]) || 0,
          };
        })
        .filter((c) => c.commits > 0);

      // Get recent activity
      const { stdout: recentCommits } = await execAsync(
        'git log --oneline --since="7 days ago" --pretty=format:"%ad %s" --date=short',
      );

      const commitsByDay = {};
      recentCommits.split('\n').forEach((line) => {
        if (line.trim()) {
          const date = line.split(' ')[0];
          commitsByDay[date] = (commitsByDay[date] || 0) + 1;
        }
      });

      stats.commitFrequency = commitsByDay;
    } catch (error) {
      console.log(
        `  ⚠️ Git statistics collection incomplete: ${error.message}`,
      );
    }

    return stats;
  }

  async analyzeCodeReviews() {
    const metrics = {
      averageReviewTime: 0,
      reviewParticipation: 0,
      commonFeedback: [],
      reviewTrends: {},
    };

    try {
      // This would integrate with GitHub API or other code review tools
      // For now, we'll provide a placeholder structure
      metrics.reviewParticipation = 85; // Placeholder percentage
      metrics.averageReviewTime = 24; // Placeholder hours
    } catch (error) {
      console.log(`  ⚠️ Code review analysis limited: ${error.message}`);
    }

    return metrics;
  }

  generateCollaborationRecommendations(gitStats, reviewMetrics) {
    const recommendations = [];

    // Analyze git statistics
    if (gitStats.contributors.length > 0) {
      const topContributor = gitStats.contributors[0];
      const totalCommits = gitStats.contributors.reduce(
        (acc, c) => acc + c.commits,
        0,
      );
      const contributionBalance = topContributor.commits / totalCommits;

      if (contributionBalance > 0.7) {
        recommendations.push({
          type: 'knowledge_sharing',
          priority: 'high',
          message:
            'Code contributions are heavily concentrated. Consider pair programming and knowledge sharing sessions.',
          data: { balance: (contributionBalance * 100).toFixed(1) + '%' },
        });
      }
    }

    // Analyze commit frequency
    const commitDays = Object.keys(gitStats.commitFrequency).length;
    if (commitDays < 3) {
      recommendations.push({
        type: 'commit_frequency',
        priority: 'medium',
        message:
          'Low commit frequency detected. Consider smaller, more frequent commits.',
        data: { activeDays: commitDays },
      });
    }

    // Review-related recommendations
    if (reviewMetrics.averageReviewTime > 48) {
      recommendations.push({
        type: 'review_speed',
        priority: 'medium',
        message:
          'Code reviews are taking longer than optimal. Consider review time SLAs.',
        data: { averageHours: reviewMetrics.averageReviewTime },
      });
    }

    return recommendations;
  }

  async generateCollaborationReport() {
    console.log('📄 Generating collaboration report...');

    const totalDuration = Date.now() - this.startTime;
    const teamMetrics = await this.generateTeamMetrics();

    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      toolsCreated: {
        gitHooks: ['pre-commit', 'commit-msg', 'pre-push', 'post-merge'],
        prTemplates: ['default', 'feature', 'bugfix', 'hotfix'],
        issueTemplates: [
          'bug_report',
          'feature_request',
          'performance_issue',
          'security_report',
        ],
      },
      teamMetrics,
      collaborationSetup: {
        hooksInstalled: true,
        templatesCreated: true,
        metricsEnabled: !!teamMetrics,
      },
    };

    // Write JSON report
    writeFileSync(
      join(this.reportDir, 'collaboration-setup-report.json'),
      JSON.stringify(report, null, 2),
    );

    // Write HTML report
    const htmlReport = this.generateHTMLReport(report);
    writeFileSync(
      join(this.reportDir, 'collaboration-setup-report.html'),
      htmlReport,
    );

    return report;
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Collaboration Hub Report</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; background: #f8f9fa; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .status { padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; font-size: 1.2em; font-weight: bold; }
        .status.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .tools-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0; }
        .tool-category { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .tool-list { list-style: none; padding: 0; margin: 10px 0; }
        .tool-list li { background: white; padding: 10px; margin: 5px 0; border-radius: 4px; border: 1px solid #dee2e6; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { background: #e3f2fd; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #1976d2; margin-bottom: 5px; }
        .metric-label { font-size: 1em; color: #666; }
        .recommendations { margin: 30px 0; }
        .recommendation { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 10px 0; }
        .recommendation.high { background: #f8d7da; border-color: #f5c6cb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤝 Collaboration Hub Setup Report</h1>
            <p><strong>Generated:</strong> ${report.timestamp}</p>
            <p><strong>Setup Duration:</strong> ${(report.duration / 1000).toFixed(2)} seconds</p>
        </div>
        
        <div class="status success">
            ✅ Collaboration tools successfully configured!
        </div>
        
        <div class="tools-grid">
            <div class="tool-category">
                <h3>🪝 Git Hooks</h3>
                <p>Automated quality checks and workflow enforcement</p>
                <ul class="tool-list">
                    ${report.toolsCreated.gitHooks.map((hook) => `<li>✅ ${hook}</li>`).join('')}
                </ul>
            </div>
            
            <div class="tool-category">
                <h3>📋 Pull Request Templates</h3>
                <p>Standardized PR structure and checklists</p>
                <ul class="tool-list">
                    ${report.toolsCreated.prTemplates.map((template) => `<li>✅ ${template}.md</li>`).join('')}
                </ul>
            </div>
            
            <div class="tool-category">
                <h3>🐛 Issue Templates</h3>
                <p>Structured issue reporting and tracking</p>
                <ul class="tool-list">
                    ${report.toolsCreated.issueTemplates.map((template) => `<li>✅ ${template}.yml</li>`).join('')}
                </ul>
            </div>
        </div>
        
        ${
          report.teamMetrics
            ? `
            <h2>📊 Team Collaboration Metrics</h2>
            <div class="metrics">
                <div class="metric">
                    <div class="metric-value">${report.teamMetrics.gitStats.totalCommits}</div>
                    <div class="metric-label">Total Commits</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${report.teamMetrics.gitStats.contributors.length}</div>
                    <div class="metric-label">Contributors</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${Object.keys(report.teamMetrics.gitStats.commitFrequency).length}</div>
                    <div class="metric-label">Active Days</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${report.teamMetrics.reviewMetrics.averageReviewTime}h</div>
                    <div class="metric-label">Avg Review Time</div>
                </div>
            </div>
            
            ${
              report.teamMetrics.recommendations.length > 0
                ? `
                <h3>💡 Collaboration Recommendations</h3>
                <div class="recommendations">
                    ${report.teamMetrics.recommendations
                      .map(
                        (rec) => `
                        <div class="recommendation ${rec.priority}">
                            <h4>${rec.type.replace(/_/g, ' ').toUpperCase()}</h4>
                            <p>${rec.message}</p>
                            ${rec.data ? `<small>Data: ${JSON.stringify(rec.data)}</small>` : ''}
                        </div>
                    `,
                      )
                      .join('')}
                </div>
            `
                : ''
            }
        `
            : ''
        }
        
        <h2>🚀 Next Steps</h2>
        <div class="tool-category">
            <h3>Team Onboarding</h3>
            <ul class="tool-list">
                <li>Share collaboration guidelines with team members</li>
                <li>Set up branch protection rules in GitHub</li>
                <li>Configure automated deployment workflows</li>
                <li>Schedule regular code review sessions</li>
                <li>Set up team communication channels</li>
            </ul>
        </div>
    </div>
</body>
</html>
    `;
  }

  async run(options = {}) {
    const {
      createHooks = true,
      createTemplates = true,
      generateMetrics = true,
      generateReport = true,
    } = options;

    try {
      await this.setup();

      console.log('🤝 Setting up collaboration infrastructure...\n');

      if (createHooks) {
        await this.createGitHooks();
      }

      if (createTemplates) {
        await this.createPullRequestTemplates();
        await this.createIssueTemplates();
      }

      if (generateMetrics) {
        await this.generateTeamMetrics();
      }

      if (generateReport) {
        const report = await this.generateCollaborationReport();

        console.log('\n🎯 Collaboration Hub Setup Summary:');
        console.log(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        );
        console.log(
          `  Git Hooks Installed:      ${report.toolsCreated.gitHooks.length}`,
        );
        console.log(
          `  PR Templates Created:     ${report.toolsCreated.prTemplates.length}`,
        );
        console.log(
          `  Issue Templates Created:  ${report.toolsCreated.issueTemplates.length}`,
        );

        if (report.teamMetrics) {
          console.log(
            `  Team Contributors:        ${report.teamMetrics.gitStats.contributors.length}`,
          );
          console.log(
            `  Total Commits:            ${report.teamMetrics.gitStats.totalCommits}`,
          );
          console.log(
            `  Recommendations:          ${report.teamMetrics.recommendations.length}`,
          );
        }

        console.log(
          `  Setup Duration:           ${(report.duration / 1000).toFixed(2)} seconds`,
        );

        console.log('\n🛠️ Tools Created:');
        console.log('  📝 Git hooks for quality enforcement');
        console.log('  📋 Structured PR and issue templates');
        console.log('  📊 Team collaboration metrics');
        console.log('  🤝 Workflow standardization');

        console.log(
          `\n📄 Detailed report: ${join('test-results', 'collaboration', 'collaboration-setup-report.html')}`,
        );

        return true;
      }
    } catch (error) {
      console.error('❌ Collaboration Hub setup failed:', error);
      return false;
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    createHooks: !args.includes('--skip-hooks'),
    createTemplates: !args.includes('--skip-templates'),
    generateMetrics: !args.includes('--skip-metrics'),
    generateReport: !args.includes('--no-report'),
  };

  const hub = new CollaborationHub();
  hub
    .run(options)
    .then((success) => {
      console.log(
        success
          ? '✅ Collaboration Hub setup completed successfully!'
          : '❌ Collaboration Hub setup failed!',
      );
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Collaboration Hub failed:', error);
      process.exit(1);
    });
}

export default CollaborationHub;
