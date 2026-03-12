/**
 * @param {Object} args
 * @param {import('@octokit/rest').Octokit} args.github
 * @param {import('@actions/github').context} args.context
 * @param {import('@actions/core')} args.core
 */
module.exports = async ({ github, context, core }) => {
  const fs = require('fs');
  const path = require('path');

  // Hard boundaries:
  // - Coverage thresholds must be configurable per-package (not one global threshold)
  // - Must not fail CI for test files themselves having low coverage

  // We'll scan for coverage summaries across packages
  // pnpm workspaces usually means packages/ and apps/
  const workspaces = ['packages', 'apps', 'client', 'server'];
  let allSummaries = [];

  for (const workspace of workspaces) {
    if (!fs.existsSync(workspace)) continue;

    // For single package workspaces like client/server
    if (fs.existsSync(path.join(workspace, 'package.json'))) {
      const summaryPath = path.join(workspace, 'coverage/coverage-summary.json');
      if (fs.existsSync(summaryPath)) {
        allSummaries.push({
          pkg: workspace,
          dir: workspace,
          summary: JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
        });
      }
    } else {
      // For multi package workspaces like packages/*
      const pkgs = fs.readdirSync(workspace);
      for (const pkg of pkgs) {
        const pkgDir = path.join(workspace, pkg);
        if (!fs.statSync(pkgDir).isDirectory()) continue;

        const summaryPath = path.join(pkgDir, 'coverage/coverage-summary.json');
        if (fs.existsSync(summaryPath)) {
          allSummaries.push({
            pkg: pkg,
            dir: pkgDir,
            summary: JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
          });
        }
      }
    }
  }

  // Also check root if there is one
  if (fs.existsSync('coverage/coverage-summary.json')) {
    allSummaries.push({
      pkg: 'root',
      dir: '.',
      summary: JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'))
    });
  }

  if (allSummaries.length === 0) {
    core.warning('No coverage summaries found. Skipping coverage enforcement.');
    return;
  }

  let commentBody = '## 📊 Code Coverage Report\n\n';
  let overallFailed = false;

  for (const item of allSummaries) {
    const { pkg, dir, summary } = item;
    commentBody += `### Package: \`${pkg}\`\n\n`;
    commentBody += '| File | Statements | Branches | Functions | Lines |\n';
    commentBody += '|---|---|---|---|---|\n';

    let pkgFailed = false;

    // Get per-package thresholds
    let thresholds = { statements: 0, branches: 0, functions: 0, lines: 0 };

    const pkgJsonPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      if (pkgJson.coverageThreshold) {
        thresholds = pkgJson.coverageThreshold;
      } else if (pkgJson.jest && pkgJson.jest.coverageThreshold && pkgJson.jest.coverageThreshold.global) {
        thresholds = pkgJson.jest.coverageThreshold.global;
      }
    }

    const coveragercPath = path.join(dir, '.coveragerc');
    if (fs.existsSync(coveragercPath)) {
      // Basic ini parser for .coveragerc
      const coveragerc = fs.readFileSync(coveragercPath, 'utf8');
      const match = coveragerc.match(/fail_under\s*=\s*(\d+)/);
      if (match) {
        const val = parseInt(match[1], 10);
        thresholds = { statements: val, branches: val, functions: val, lines: val };
      }
    }

    const jestConfigPath = path.join(dir, 'jest.config.js');
    if (fs.existsSync(jestConfigPath)) {
        try {
            // Need to handle commonjs export or import. Usually it's module.exports
            const configContent = fs.readFileSync(jestConfigPath, 'utf8');
            // Very basic regex to find coverageThreshold -> global -> statements/branches/etc
            // More robust approach is to require the module if possible, but that can run arbitrary code
            // and might fail if we don't have all deps installed or if it uses ESM import syntax.
            // Let's try requiring it first in a try/catch.
            const jestConfig = require(path.resolve(jestConfigPath));
            if (jestConfig && jestConfig.coverageThreshold && jestConfig.coverageThreshold.global) {
                const globalThresh = jestConfig.coverageThreshold.global;
                if(globalThresh.statements) thresholds.statements = globalThresh.statements;
                if(globalThresh.branches) thresholds.branches = globalThresh.branches;
                if(globalThresh.functions) thresholds.functions = globalThresh.functions;
                if(globalThresh.lines) thresholds.lines = globalThresh.lines;
            }
        } catch (e) {
            core.warning(`Failed to parse ${jestConfigPath}: ${e.message}`);
        }
    }

    // Default core package threshold (e.g. 70% per mission spec)
    // "e.g., 70% line coverage for core packages"
    if (pkg.includes('core') && thresholds.lines === 0) {
      thresholds.lines = 70;
    }

    for (const [file, metrics] of Object.entries(summary)) {
      if (file === 'total') continue;

      const statements = metrics.statements.pct;
      const branches = metrics.branches.pct;
      const functions = metrics.functions.pct;
      const lines = metrics.lines.pct;

      // Check if it's a test file. If so, don't fail CI for low coverage
      const isTestFile = file.includes('.test.') || file.includes('.spec.') || file.includes('/__tests__/');

      let failedThresholds = [];
      if (!isTestFile) {
        if (thresholds.statements > 0 && statements < thresholds.statements) failedThresholds.push(`statements (${statements}% < ${thresholds.statements}%)`);
        if (thresholds.branches > 0 && branches < thresholds.branches) failedThresholds.push(`branches (${branches}% < ${thresholds.branches}%)`);
        if (thresholds.functions > 0 && functions < thresholds.functions) failedThresholds.push(`functions (${functions}% < ${thresholds.functions}%)`);
        if (thresholds.lines > 0 && lines < thresholds.lines) failedThresholds.push(`lines (${lines}% < ${thresholds.lines}%)`);
      }

      const statusIcon = failedThresholds.length > 0 ? '❌' : '✅';
      const fileDisplay = file.replace(process.cwd(), '').replace(/^\//, '');

      commentBody += `| ${statusIcon} \`${fileDisplay}\` | ${statements}% | ${branches}% | ${functions}% | ${lines}% |\n`;

      if (failedThresholds.length > 0) {
        pkgFailed = true;
        overallFailed = true;
        core.error(`Coverage failed for ${fileDisplay} in package ${pkg}. Failed thresholds: ${failedThresholds.join(', ')}`);
      }
    }

    const total = summary.total;
    if (total) {
      commentBody += `| **Total** | **${total.statements.pct}%** | **${total.branches.pct}%** | **${total.functions.pct}%** | **${total.lines.pct}%** |\n\n`;
    }

    if (pkgFailed) {
      commentBody += `> ⚠️ **Warning:** Package \`${pkg}\` did not meet the required coverage thresholds.\n\n`;
    }
  }

  // Find an existing PR comment to update, or create a new one
  if (context.issue && context.issue.number) {
    try {
      const { data: comments } = await github.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
      });

      const botComment = comments.find(c => c.user.type === 'Bot' && c.body.includes('## 📊 Code Coverage Report'));

      if (botComment) {
        await github.rest.issues.updateComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: botComment.id,
          body: commentBody
        });
      } else {
        await github.rest.issues.createComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: context.issue.number,
          body: commentBody
        });
      }
    } catch (err) {
      core.warning(`Failed to post comment: ${err.message}`);
    }
  }

  if (overallFailed) {
    core.setFailed('Code coverage fell below the required threshold(s). See the PR comment or logs for details.');
  }
};
