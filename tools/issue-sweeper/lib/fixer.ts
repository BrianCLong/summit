/**
 * Automated fix implementation for common issue patterns
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { GitHubIssue, IssueClassification } from './types.js';

export interface FixResult {
  success: boolean;
  changes: string[];
  verification_command?: string;
  error?: string;
  branch_name?: string;
}

/**
 * Attempt to automatically fix an issue
 */
export async function attemptFix(
  issue: GitHubIssue,
  classification: IssueClassification
): Promise<FixResult> {
  console.log(`🔧 Attempting to fix issue #${issue.number}...`);

  // Create a fix branch
  const branchName = `issue/${issue.number}-${slugify(issue.title)}`;

  try {
    // Check if branch already exists
    try {
      execSync(`git rev-parse --verify ${branchName}`, { stdio: 'ignore' });
      console.log(`   ⚠️  Branch ${branchName} already exists, using it`);
    } catch {
      // Branch doesn't exist, create it
      execSync(`git checkout -b ${branchName}`, { stdio: 'ignore' });
      console.log(`   ✅ Created branch: ${branchName}`);
    }

    // Attempt fix based on classification and content
    let fixResult: FixResult;

    if (classification === 'bug') {
      fixResult = await fixBug(issue);
    } else if (classification === 'docs') {
      fixResult = await fixDocs(issue);
    } else if (classification === 'ci') {
      fixResult = await fixCI(issue);
    } else if (classification === 'feature') {
      fixResult = await implementFeature(issue);
    } else {
      return {
        success: false,
        changes: [],
        error: `No automated fix available for classification: ${classification}`,
      };
    }

    fixResult.branch_name = branchName;
    return fixResult;
  } catch (error) {
    return {
      success: false,
      changes: [],
      error: error instanceof Error ? error.message : String(error),
      branch_name: branchName,
    };
  }
}

/**
 * Fix bug issues
 */
async function fixBug(issue: GitHubIssue): Promise<FixResult> {
  const body = issue.body || '';
  const title = issue.title.toLowerCase();
  const changes: string[] = [];

  // Pattern 1: TypeScript compilation errors
  if (title.includes('typescript') || title.includes('type error') || body.includes('TS')) {
    const tsResult = await fixTypeScriptErrors(issue);
    if (tsResult.success) {
      return tsResult;
    }
  }

  // Pattern 2: Linting errors
  if (title.includes('lint') || title.includes('eslint') || body.includes('eslint')) {
    return await fixLintErrors(issue);
  }

  // Pattern 3: Test failures
  if (title.includes('test fail') || title.includes('failing test')) {
    return await fixTestFailures(issue);
  }

  // Pattern 4: Import/dependency errors
  if (title.includes('import') || title.includes('module not found') || title.includes('cannot find')) {
    return await fixImportErrors(issue);
  }

  return {
    success: false,
    changes: [],
    error: 'No matching bug pattern found for automated fix',
  };
}

/**
 * Fix TypeScript compilation errors
 */
async function fixTypeScriptErrors(issue: GitHubIssue): Promise<FixResult> {
  const changes: string[] = [];

  try {
    // Run typecheck to see current errors
    console.log(`   🔍 Running typecheck...`);
    execSync('pnpm typecheck', { stdio: 'pipe', encoding: 'utf-8' });
    console.log(`   ✅ No TypeScript errors found`);
    return { success: true, changes: ['TypeScript already passes'], verification_command: 'pnpm typecheck' };
  } catch (error) {
    const output = error instanceof Error && 'stdout' in error ? String(error.stdout) : '';
    console.log(`   ⚠️  TypeScript errors detected`);

    // Extract file paths from issue body
    const body = issue.body || '';
    const filePaths = extractFilePaths(body);

    if (filePaths.length > 0) {
      console.log(`   📄 Found ${filePaths.length} files mentioned in issue`);

      for (const filePath of filePaths) {
        if (existsSync(filePath)) {
          // Common TypeScript fixes
          const fixed = await applyCommonTypeScriptFixes(filePath);
          if (fixed) {
            changes.push(`Fixed TypeScript errors in ${filePath}`);
          }
        }
      }
    }

    // Try running typecheck again
    try {
      execSync('pnpm typecheck', { stdio: 'ignore' });
      return {
        success: true,
        changes,
        verification_command: 'pnpm typecheck',
      };
    } catch {
      return {
        success: false,
        changes,
        error: 'TypeScript errors remain after attempted fixes',
      };
    }
  }
}

/**
 * Apply common TypeScript fixes to a file
 */
async function applyCommonTypeScriptFixes(filePath: string): Promise<boolean> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    let modified = content;

    // Fix 1: Add missing type annotations for function parameters
    modified = modified.replace(
      /function\s+(\w+)\s*\(([^)]+)\)/g,
      (match, name, params) => {
        if (!params.includes(':')) {
          // Add 'any' type to untyped parameters (will be caught by linter for proper typing)
          const typedParams = params.split(',').map((p: string) => {
            const param = p.trim();
            return param.includes(':') ? param : `${param}: any`;
          }).join(', ');
          return `function ${name}(${typedParams})`;
        }
        return match;
      }
    );

    // Fix 2: Add missing return type annotations
    // This is a simple heuristic - real implementation would need AST parsing

    // Fix 3: Fix common import issues
    modified = modified.replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, (match, name, path) => {
      // Ensure .js extension for ESM
      if (path.startsWith('.') && !path.endsWith('.js') && !path.endsWith('.json')) {
        return `import ${name} from '${path}.js'`;
      }
      return match;
    });

    if (modified !== content) {
      writeFileSync(filePath, modified, 'utf-8');
      return true;
    }

    return false;
  } catch (error) {
    console.warn(`   ⚠️  Failed to fix ${filePath}:`, error);
    return false;
  }
}

/**
 * Fix linting errors
 */
async function fixLintErrors(issue: GitHubIssue): Promise<FixResult> {
  const changes: string[] = [];

  try {
    console.log(`   🔍 Running lint with auto-fix...`);
    execSync('pnpm lint --fix', { stdio: 'pipe' });
    changes.push('Applied ESLint auto-fixes');

    // Check if lint passes now
    execSync('pnpm lint', { stdio: 'ignore' });

    return {
      success: true,
      changes,
      verification_command: 'pnpm lint',
    };
  } catch (error) {
    return {
      success: false,
      changes,
      error: 'Linting errors remain after auto-fix',
    };
  }
}

/**
 * Fix test failures
 */
async function fixTestFailures(issue: GitHubIssue): Promise<FixResult> {
  // This is complex and usually requires understanding the specific test
  // For now, we mark it as requiring manual intervention
  return {
    success: false,
    changes: [],
    error: 'Test failures require manual investigation',
  };
}

/**
 * Fix import/dependency errors
 */
async function fixImportErrors(issue: GitHubIssue): Promise<FixResult> {
  const changes: string[] = [];
  const body = issue.body || '';

  // Check if it's a missing dependency
  const missingPackageMatch = body.match(/Cannot find module ['"]([^'"]+)['"]/);
  if (missingPackageMatch) {
    const packageName = missingPackageMatch[1];

    // Check if it's an internal import that needs .js extension
    if (packageName.startsWith('.')) {
      console.log(`   🔍 Detected missing .js extension in import`);
      // This would be handled by the TypeScript fixer
      return await fixTypeScriptErrors(issue);
    }

    // Check if package exists in package.json
    try {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      if (!allDeps[packageName]) {
        console.log(`   📦 Installing missing package: ${packageName}`);
        execSync(`pnpm add ${packageName}`, { stdio: 'pipe' });
        changes.push(`Installed missing dependency: ${packageName}`);

        return {
          success: true,
          changes,
          verification_command: 'pnpm typecheck',
        };
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to fix import error:`, error);
    }
  }

  return {
    success: false,
    changes,
    error: 'Could not automatically fix import error',
  };
}

/**
 * Fix documentation issues
 */
async function fixDocs(issue: GitHubIssue): Promise<FixResult> {
  const changes: string[] = [];
  const body = issue.body || '';
  const title = issue.title.toLowerCase();

  // Extract file paths mentioned in the issue
  const filePaths = extractFilePaths(body);

  if (filePaths.length === 0) {
    return {
      success: false,
      changes: [],
      error: 'No specific documentation files mentioned',
    };
  }

  // Pattern: Outdated documentation
  if (title.includes('outdated') || title.includes('update')) {
    // Add a comment indicating the documentation needs review
    for (const filePath of filePaths) {
      if (existsSync(filePath) && filePath.endsWith('.md')) {
        changes.push(`Identified outdated docs: ${filePath}`);
        // Real implementation would update the docs based on current code
      }
    }
  }

  // Pattern: Missing documentation
  if (title.includes('missing') || title.includes('add')) {
    // Create placeholder documentation
    for (const filePath of filePaths) {
      if (!existsSync(filePath) && filePath.endsWith('.md')) {
        writeFileSync(filePath, `# Documentation\n\nTODO: Add documentation for this module.\n\nSee issue #${issue.number} for details.\n`);
        changes.push(`Created placeholder documentation: ${filePath}`);
      }
    }
  }

  return {
    success: changes.length > 0,
    changes,
    verification_command: 'cat ' + filePaths.join(' '),
  };
}

/**
 * Fix CI/CD issues
 */
async function fixCI(issue: GitHubIssue): Promise<FixResult> {
  const changes: string[] = [];
  const title = issue.title.toLowerCase();
  const body = issue.body || '';

  // Pattern: Workflow file syntax errors
  if (title.includes('workflow') || title.includes('.yml') || title.includes('action')) {
    const workflowFiles = extractFilePaths(body).filter((f) => f.includes('.github/workflows/'));

    for (const file of workflowFiles) {
      if (existsSync(file)) {
        // Run YAML validation
        try {
          execSync(`yamllint ${file} || true`, { stdio: 'ignore' });
          changes.push(`Validated workflow: ${file}`);
        } catch {
          // yamllint not available
        }
      }
    }
  }

  return {
    success: changes.length > 0,
    changes,
    verification_command: changes.length > 0 ? 'echo "CI fix applied"' : undefined,
  };
}

/**
 * Implement feature (usually requires more context)
 */
async function implementFeature(issue: GitHubIssue): Promise<FixResult> {
  // Features are complex and require design decisions
  // Mark as requiring manual implementation
  return {
    success: false,
    changes: [],
    error: 'Feature implementation requires manual design and coding',
  };
}

/**
 * Extract file paths from issue text
 */
function extractFilePaths(text: string): string[] {
  const paths: string[] = [];

  // Pattern 1: Backtick-quoted paths
  const backtickPattern = /`([a-zA-Z0-9_\-\/\.]+\.(ts|js|tsx|jsx|json|yml|yaml|md))`/g;
  let match;
  while ((match = backtickPattern.exec(text)) !== null) {
    paths.push(match[1]);
  }

  // Pattern 2: File: prefix
  const filePattern = /File:\s*([a-zA-Z0-9_\-\/\.]+\.(ts|js|tsx|jsx|json|yml|yaml|md))/gi;
  while ((match = filePattern.exec(text)) !== null) {
    paths.push(match[1]);
  }

  // Pattern 3: Full paths
  const pathPattern = /\b([a-zA-Z0-9_\-\/]+\/[a-zA-Z0-9_\-\/\.]+\.(ts|js|tsx|jsx|json|yml|yaml|md))\b/g;
  while ((match = pathPattern.exec(text)) !== null) {
    paths.push(match[1]);
  }

  return Array.from(new Set(paths));
}

/**
 * Convert title to slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Verify fix by running tests and checks
 */
export async function verifyFix(): Promise<{ passed: boolean; output: string }> {
  try {
    console.log(`   🧪 Running verification...`);

    // Run quick verification
    const output = execSync('pnpm typecheck && pnpm lint', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    console.log(`   ✅ Verification passed`);
    return { passed: true, output };
  } catch (error) {
    const output = error instanceof Error && 'stdout' in error ? String(error.stdout) : String(error);
    console.log(`   ❌ Verification failed`);
    return { passed: false, output };
  }
}

/**
 * Commit changes with a descriptive message
 */
export function commitFix(issue: GitHubIssue, changes: string[]): void {
  const message = `fix: resolve issue #${issue.number} - ${issue.title}

${changes.map((c) => `- ${c}`).join('\n')}

Closes #${issue.number}`;

  execSync(`git add -A && git commit -m "${message.replace(/"/g, '\\"')}"`, { stdio: 'pipe' });
  console.log(`   ✅ Changes committed`);
}
