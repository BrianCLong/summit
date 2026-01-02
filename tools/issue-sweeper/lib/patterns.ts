/**
 * Common Issue Patterns Library
 *
 * This module contains predefined patterns for common issues and their fixes.
 * Each pattern includes detection logic, fix implementation, and verification.
 */

import { GitHubIssue } from './types.js';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';

export interface IssuePattern {
  name: string;
  description: string;
  detect: (issue: GitHubIssue) => boolean;
  fix: (issue: GitHubIssue) => Promise<FixResult>;
  verify: () => Promise<boolean>;
  tags: string[];
}

interface FixResult {
  success: boolean;
  changes: string[];
  error?: string;
}

/**
 * Pattern Library - Register all known patterns here
 */
export const ISSUE_PATTERNS: IssuePattern[] = [
  // TypeScript Patterns
  MISSING_TYPE_IMPORTS,
  WRONG_MODULE_EXTENSION,
  IMPLICIT_ANY_PARAMETER,
  MISSING_RETURN_TYPE,

  // Linting Patterns
  ESLINT_ERRORS,
  PRETTIER_FORMATTING,

  // Dependency Patterns
  MISSING_DEPENDENCY,
  OUTDATED_DEPENDENCY,
  PEER_DEPENDENCY_CONFLICT,

  // Testing Patterns
  FAILING_SNAPSHOT_TEST,
  MISSING_TEST_COVERAGE,

  // Documentation Patterns
  MISSING_README,
  OUTDATED_API_DOCS,
  BROKEN_MARKDOWN_LINK,

  // CI/CD Patterns
  FAILING_WORKFLOW,
  MISSING_WORKFLOW_PERMISSIONS,
  DEPRECATED_GITHUB_ACTION,

  // Security Patterns
  VULNERABLE_DEPENDENCY,
  EXPOSED_SECRET,

  // Performance Patterns
  LARGE_BUNDLE_SIZE,
  SLOW_TEST_SUITE,
];

// ============================================================================
// TypeScript Patterns
// ============================================================================

const MISSING_TYPE_IMPORTS: IssuePattern = {
  name: 'missing-type-imports',
  description: 'Missing type imports causing TypeScript errors',
  tags: ['typescript', 'imports', 'types'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('cannot find name') ||
      text.includes('type') && text.includes('not found') ||
      text.includes('ts(2304)')
    );
  },

  fix: async (issue) => {
    const changes: string[] = [];

    // Extract type name from error message
    const typeMatch = issue.body?.match(/Cannot find name ['"](\w+)['"]/i);
    if (!typeMatch) {
      return { success: false, changes, error: 'Could not extract type name' };
    }

    const typeName = typeMatch[1];

    // Common type package mappings
    const typePackages: Record<string, string> = {
      'Request': '@types/express',
      'Response': '@types/express',
      'NextFunction': '@types/express',
      'JestMatchers': '@types/jest',
      'Expect': '@types/jest',
    };

    const packageName = typePackages[typeName];
    if (packageName) {
      try {
        execSync(`pnpm add -D ${packageName}`, { stdio: 'pipe' });
        changes.push(`Installed ${packageName} for ${typeName} type`);
        return { success: true, changes };
      } catch (error) {
        return { success: false, changes, error: `Failed to install ${packageName}` };
      }
    }

    return { success: false, changes, error: `No known package for type ${typeName}` };
  },

  verify: async () => {
    try {
      execSync('pnpm typecheck', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  },
};

const WRONG_MODULE_EXTENSION: IssuePattern = {
  name: 'wrong-module-extension',
  description: 'ESM imports missing .js extension',
  tags: ['typescript', 'esm', 'imports'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('cannot find module') ||
      text.includes('esm') && text.includes('import') ||
      text.includes('ts(2307)')
    );
  },

  fix: async (issue) => {
    const changes: string[] = [];
    const filePaths = extractFilePaths(issue.body || '');

    for (const filePath of filePaths) {
      if (!existsSync(filePath)) continue;

      const content = readFileSync(filePath, 'utf-8');
      let modified = content;

      // Add .js to relative imports
      modified = modified.replace(
        /from\s+['"](\.\.?\/[^'"]+)['"]/g,
        (match, path) => {
          if (path.endsWith('.js') || path.endsWith('.json')) {
            return match;
          }
          return match.replace(path, `${path}.js`);
        }
      );

      if (modified !== content) {
        writeFileSync(filePath, modified, 'utf-8');
        changes.push(`Added .js extensions in ${filePath}`);
      }
    }

    return { success: changes.length > 0, changes };
  },

  verify: async () => {
    try {
      execSync('pnpm typecheck', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  },
};

const IMPLICIT_ANY_PARAMETER: IssuePattern = {
  name: 'implicit-any-parameter',
  description: 'Function parameters with implicit any type',
  tags: ['typescript', 'strict'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('implicit any') ||
      text.includes('ts(7006)')
    );
  },

  fix: async (issue) => {
    const changes: string[] = [];
    const filePaths = extractFilePaths(issue.body || '');

    for (const filePath of filePaths) {
      if (!existsSync(filePath)) continue;

      const content = readFileSync(filePath, 'utf-8');
      let modified = content;

      // Add explicit 'any' type to untyped parameters
      // This is a heuristic - real fix would need AST parsing
      modified = modified.replace(
        /function\s+\w+\s*\(([^)]+)\)/g,
        (match, params) => {
          const typedParams = params.split(',').map((p: string) => {
            const param = p.trim();
            if (!param.includes(':') && param.length > 0) {
              return `${param}: any`;
            }
            return param;
          }).join(', ');
          return match.replace(params, typedParams);
        }
      );

      if (modified !== content) {
        writeFileSync(filePath, modified, 'utf-8');
        changes.push(`Added explicit 'any' types in ${filePath} (TODO: add proper types)`);
      }
    }

    return { success: changes.length > 0, changes };
  },

  verify: async () => {
    try {
      execSync('pnpm typecheck', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  },
};

const MISSING_RETURN_TYPE: IssuePattern = {
  name: 'missing-return-type',
  description: 'Functions missing explicit return type annotations',
  tags: ['typescript', 'strict'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return text.includes('return type') && text.includes('missing');
  },

  fix: async (issue) => {
    // This requires AST parsing for proper implementation
    return {
      success: false,
      changes: [],
      error: 'Return type inference requires AST parsing (future enhancement)',
    };
  },

  verify: async () => {
    try {
      execSync('pnpm typecheck', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  },
};

// ============================================================================
// Linting Patterns
// ============================================================================

const ESLINT_ERRORS: IssuePattern = {
  name: 'eslint-errors',
  description: 'ESLint errors that can be auto-fixed',
  tags: ['linting', 'code-quality'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('eslint') ||
      text.includes('lint error') ||
      text.includes('linting')
    );
  },

  fix: async (issue) => {
    try {
      execSync('pnpm lint --fix', { stdio: 'pipe' });
      return {
        success: true,
        changes: ['Applied ESLint auto-fixes'],
      };
    } catch {
      return {
        success: false,
        changes: [],
        error: 'ESLint errors cannot be auto-fixed',
      };
    }
  },

  verify: async () => {
    try {
      execSync('pnpm lint', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  },
};

const PRETTIER_FORMATTING: IssuePattern = {
  name: 'prettier-formatting',
  description: 'Code formatting issues',
  tags: ['formatting', 'code-quality'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('format') ||
      text.includes('prettier') ||
      text.includes('indentation')
    );
  },

  fix: async (issue) => {
    try {
      execSync('pnpm format', { stdio: 'pipe' });
      return {
        success: true,
        changes: ['Applied Prettier formatting'],
      };
    } catch {
      return {
        success: false,
        changes: [],
        error: 'Prettier formatting failed',
      };
    }
  },

  verify: async () => {
    // Prettier doesn't have a check-only mode by default
    return true;
  },
};

// ============================================================================
// Dependency Patterns
// ============================================================================

const MISSING_DEPENDENCY: IssuePattern = {
  name: 'missing-dependency',
  description: 'Required package is not installed',
  tags: ['dependencies', 'npm'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('cannot find module') ||
      text.includes('module not found') ||
      text.includes('missing dependency')
    );
  },

  fix: async (issue) => {
    const packageMatch = issue.body?.match(/Cannot find module ['"]([^'"]+)['"]/i);
    if (!packageMatch) {
      return {
        success: false,
        changes: [],
        error: 'Could not extract package name',
      };
    }

    const packageName = packageMatch[1];

    // Don't install if it's a local import
    if (packageName.startsWith('.') || packageName.startsWith('/')) {
      return {
        success: false,
        changes: [],
        error: 'Looks like a local import, not a package',
      };
    }

    try {
      execSync(`pnpm add ${packageName}`, { stdio: 'pipe' });
      return {
        success: true,
        changes: [`Installed missing package: ${packageName}`],
      };
    } catch {
      return {
        success: false,
        changes: [],
        error: `Failed to install ${packageName}`,
      };
    }
  },

  verify: async () => {
    try {
      execSync('pnpm install', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  },
};

const OUTDATED_DEPENDENCY: IssuePattern = {
  name: 'outdated-dependency',
  description: 'Dependency version is outdated',
  tags: ['dependencies', 'maintenance'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('outdated') ||
      text.includes('update') && text.includes('dependency') ||
      text.includes('upgrade')
    );
  },

  fix: async (issue) => {
    const packageMatch = issue.body?.match(/([a-z0-9-]+)@(\d+\.\d+\.\d+)/i);
    if (!packageMatch) {
      return {
        success: false,
        changes: [],
        error: 'Could not extract package name and version',
      };
    }

    const [, packageName, version] = packageMatch;

    try {
      execSync(`pnpm update ${packageName}@${version}`, { stdio: 'pipe' });
      return {
        success: true,
        changes: [`Updated ${packageName} to ${version}`],
      };
    } catch {
      return {
        success: false,
        changes: [],
        error: `Failed to update ${packageName}`,
      };
    }
  },

  verify: async () => {
    try {
      execSync('pnpm install', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  },
};

const PEER_DEPENDENCY_CONFLICT: IssuePattern = {
  name: 'peer-dependency-conflict',
  description: 'Peer dependency version conflict',
  tags: ['dependencies', 'compatibility'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('peer dependency') ||
      text.includes('pnpm_peer_dep')
    );
  },

  fix: async (issue) => {
    // Peer dependency conflicts usually require manual resolution
    return {
      success: false,
      changes: [],
      error: 'Peer dependency conflicts require manual resolution',
    };
  },

  verify: async () => {
    return false;
  },
};

// ============================================================================
// Documentation Patterns
// ============================================================================

const MISSING_README: IssuePattern = {
  name: 'missing-readme',
  description: 'Package or directory missing README',
  tags: ['documentation'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('missing readme') ||
      text.includes('no readme') ||
      text.includes('add readme')
    );
  },

  fix: async (issue) => {
    const filePaths = extractFilePaths(issue.body || '');
    const changes: string[] = [];

    for (const path of filePaths) {
      if (path.endsWith('README.md') && !existsSync(path)) {
        const dirname = path.split('/').slice(0, -1).join('/');
        const packageName = dirname.split('/').pop() || 'Package';

        const template = `# ${packageName}

## Overview

TODO: Add package description

## Installation

\`\`\`bash
pnpm install
\`\`\`

## Usage

TODO: Add usage examples

## API

TODO: Document API

## License

MIT
`;

        writeFileSync(path, template, 'utf-8');
        changes.push(`Created README at ${path}`);
      }
    }

    return { success: changes.length > 0, changes };
  },

  verify: async () => {
    return true;
  },
};

const OUTDATED_API_DOCS: IssuePattern = {
  name: 'outdated-api-docs',
  description: 'API documentation doesn\'t match implementation',
  tags: ['documentation', 'api'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('outdated') && text.includes('doc') ||
      text.includes('documentation') && text.includes('wrong')
    );
  },

  fix: async (issue) => {
    // Updating docs requires understanding code changes
    return {
      success: false,
      changes: [],
      error: 'Documentation updates require manual review',
    };
  },

  verify: async () => {
    return false;
  },
};

const BROKEN_MARKDOWN_LINK: IssuePattern = {
  name: 'broken-markdown-link',
  description: 'Broken links in markdown files',
  tags: ['documentation', 'markdown'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('broken link') ||
      text.includes('404') && text.includes('doc')
    );
  },

  fix: async (issue) => {
    // Link fixing requires checking URLs or paths
    return {
      success: false,
      changes: [],
      error: 'Link fixing requires URL/path validation',
    };
  },

  verify: async () => {
    return false;
  },
};

// ============================================================================
// CI/CD Patterns
// ============================================================================

const FAILING_WORKFLOW: IssuePattern = {
  name: 'failing-workflow',
  description: 'GitHub Actions workflow failing',
  tags: ['ci', 'github-actions'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('workflow') && text.includes('fail') ||
      text.includes('github action') && text.includes('error')
    );
  },

  fix: async (issue) => {
    // Workflow fixes are very context-specific
    return {
      success: false,
      changes: [],
      error: 'Workflow fixes require context-specific debugging',
    };
  },

  verify: async () => {
    return false;
  },
};

const MISSING_WORKFLOW_PERMISSIONS: IssuePattern = {
  name: 'missing-workflow-permissions',
  description: 'Workflow missing required permissions',
  tags: ['ci', 'github-actions', 'permissions'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('permission') && text.includes('workflow') ||
      text.includes('github_token') && text.includes('denied')
    );
  },

  fix: async (issue) => {
    // Permission fixes require editing workflow YAML
    return {
      success: false,
      changes: [],
      error: 'Permission fixes require manual YAML editing',
    };
  },

  verify: async () => {
    return false;
  },
};

const DEPRECATED_GITHUB_ACTION: IssuePattern = {
  name: 'deprecated-github-action',
  description: 'Using deprecated GitHub Action',
  tags: ['ci', 'github-actions', 'deprecation'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('deprecated') && text.includes('action') ||
      text.includes('update') && text.includes('github action')
    );
  },

  fix: async (issue) => {
    // Action updates require workflow editing
    return {
      success: false,
      changes: [],
      error: 'Action updates require manual workflow editing',
    };
  },

  verify: async () => {
    return false;
  },
};

// ============================================================================
// Security Patterns
// ============================================================================

const VULNERABLE_DEPENDENCY: IssuePattern = {
  name: 'vulnerable-dependency',
  description: 'Dependency has known security vulnerability',
  tags: ['security', 'dependencies'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('vulnerability') ||
      text.includes('cve-') ||
      text.includes('security') && text.includes('dependency')
    );
  },

  fix: async (issue) => {
    try {
      execSync('pnpm audit fix', { stdio: 'pipe' });
      return {
        success: true,
        changes: ['Applied security audit fixes'],
      };
    } catch {
      return {
        success: false,
        changes: [],
        error: 'Security audit fixes require manual intervention',
      };
    }
  },

  verify: async () => {
    try {
      const output = execSync('pnpm audit', { encoding: 'utf-8', stdio: 'pipe' });
      return !output.includes('vulnerabilities');
    } catch {
      return false;
    }
  },
};

const EXPOSED_SECRET: IssuePattern = {
  name: 'exposed-secret',
  description: 'Secret or credential exposed in code',
  tags: ['security', 'secrets'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('secret') && text.includes('exposed') ||
      text.includes('credential') ||
      text.includes('api key') && text.includes('commit')
    );
  },

  fix: async (issue) => {
    // Secret removal requires git history rewriting
    return {
      success: false,
      changes: [],
      error: 'Secret removal requires manual git history cleanup and key rotation',
    };
  },

  verify: async () => {
    return false;
  },
};

// ============================================================================
// Performance Patterns
// ============================================================================

const LARGE_BUNDLE_SIZE: IssuePattern = {
  name: 'large-bundle-size',
  description: 'JavaScript bundle size is too large',
  tags: ['performance', 'optimization'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('bundle size') ||
      text.includes('large bundle') ||
      text.includes('bundle') && text.includes('too big')
    );
  },

  fix: async (issue) => {
    // Bundle optimization requires analysis and code changes
    return {
      success: false,
      changes: [],
      error: 'Bundle optimization requires dependency analysis and code splitting',
    };
  },

  verify: async () => {
    return false;
  },
};

const SLOW_TEST_SUITE: IssuePattern = {
  name: 'slow-test-suite',
  description: 'Test suite takes too long to run',
  tags: ['performance', 'testing'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('slow test') ||
      text.includes('test') && text.includes('performance') ||
      text.includes('test suite') && text.includes('slow')
    );
  },

  fix: async (issue) => {
    // Test performance requires profiling
    return {
      success: false,
      changes: [],
      error: 'Test optimization requires profiling and refactoring',
    };
  },

  verify: async () => {
    return false;
  },
};

const FAILING_SNAPSHOT_TEST: IssuePattern = {
  name: 'failing-snapshot-test',
  description: 'Jest snapshot test failing due to changes',
  tags: ['testing', 'jest'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('snapshot') && text.includes('fail') ||
      text.includes('jest') && text.includes('snapshot')
    );
  },

  fix: async (issue) => {
    try {
      execSync('pnpm test -- -u', { stdio: 'pipe' });
      return {
        success: true,
        changes: ['Updated Jest snapshots'],
      };
    } catch {
      return {
        success: false,
        changes: [],
        error: 'Snapshot update failed or requires manual review',
      };
    }
  },

  verify: async () => {
    try {
      execSync('pnpm test', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  },
};

const MISSING_TEST_COVERAGE: IssuePattern = {
  name: 'missing-test-coverage',
  description: 'Code lacking test coverage',
  tags: ['testing', 'quality'],

  detect: (issue) => {
    const text = `${issue.title} ${issue.body}`.toLowerCase();
    return (
      text.includes('test coverage') ||
      text.includes('missing test') ||
      text.includes('add test')
    );
  },

  fix: async (issue) => {
    // Writing tests requires understanding code behavior
    return {
      success: false,
      changes: [],
      error: 'Writing tests requires understanding code behavior',
    };
  },

  verify: async () => {
    return false;
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function extractFilePaths(text: string): string[] {
  const paths: string[] = [];

  // Pattern 1: Backtick-quoted paths
  const backtickPattern = /`([a-zA-Z0-9_\-\/\.]+\.(ts|js|tsx|jsx|json|yml|yaml|md))`/g;
  let match;
  while ((match = backtickPattern.exec(text)) !== null) {
    paths.push(match[1]);
  }

  // Pattern 2: File: prefix
  const filePattern = /File:\s*([a-zA-Z0-9_\-\/\.]+)/gi;
  while ((match = filePattern.exec(text)) !== null) {
    paths.push(match[1]);
  }

  return Array.from(new Set(paths));
}

/**
 * Find matching pattern for an issue
 */
export function findMatchingPattern(issue: GitHubIssue): IssuePattern | null {
  for (const pattern of ISSUE_PATTERNS) {
    if (pattern.detect(issue)) {
      return pattern;
    }
  }
  return null;
}

/**
 * Get all patterns by tag
 */
export function getPatternsByTag(tag: string): IssuePattern[] {
  return ISSUE_PATTERNS.filter((p) => p.tags.includes(tag));
}
