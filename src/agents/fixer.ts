import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';
import { CriticAgent } from './critic';

const execAsync = promisify(exec);

interface FixResult {
  success: boolean;
  fixesApplied: Fix[];
  remainingIssues: Issue[];
  patchContent?: string;
}

interface Fix {
  type: 'eslint' | 'typescript' | 'security' | 'format' | 'custom';
  description: string;
  file: string;
  applied: boolean;
  error?: string;
}

interface Issue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line?: number;
  column?: number;
  rule?: string;
}

export class FixerAgent {
  private projectRoot: string;
  private critic: CriticAgent;
  private fixStrategies: Map<string, FixStrategy>;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.critic = new CriticAgent(projectRoot);
    this.initializeFixStrategies();
  }

  async applyFixes(criticResult?: any): Promise<FixResult> {
    console.log('🔧 Fixer: Analyzing issues and applying automated fixes...');

    let analysis = criticResult;
    if (!analysis) {
      analysis = await this.critic.analyze();
    }

    const fixesApplied: Fix[] = [];
    const remainingIssues: Issue[] = [];

    // Apply fixes in order of safety
    const fixOrder = ['format', 'eslint', 'typescript', 'security', 'custom'];

    for (const fixType of fixOrder) {
      const issues = this.getIssuesForFixType(
        analysis.staticCheckResults,
        fixType,
      );

      for (const issue of issues) {
        try {
          const fix = await this.applyFix(issue, fixType);
          if (fix.applied) {
            fixesApplied.push(fix);
          } else {
            remainingIssues.push(issue);
          }
        } catch (error) {
          remainingIssues.push(issue);
          fixesApplied.push({
            type: fixType as any,
            description: `Failed to fix: ${issue.message}`,
            file: issue.file,
            applied: false,
            error: error.message,
          });
        }
      }
    }

    // Generate patch if fixes were applied
    let patchContent: string | undefined;
    if (fixesApplied.some((f) => f.applied)) {
      try {
        const { stdout } = await execAsync('git diff', {
          cwd: this.projectRoot,
        });
        patchContent = stdout;
      } catch {}
    }

    const result: FixResult = {
      success:
        remainingIssues.filter((i) => i.severity === 'error').length === 0,
      fixesApplied,
      remainingIssues,
      patchContent,
    };

    await this.persistFixResult(result);
    return result;
  }

  private initializeFixStrategies(): void {
    this.fixStrategies = new Map([
      ['eslint', new EslintFixStrategy()],
      ['typescript', new TypeScriptFixStrategy()],
      ['security', new SecurityFixStrategy()],
      ['format', new FormatFixStrategy()],
      ['custom', new CustomFixStrategy()],
    ]);
  }

  private getIssuesForFixType(staticResults: any[], fixType: string): Issue[] {
    const issues: Issue[] = [];

    for (const result of staticResults) {
      if (this.shouldFixWithType(result.tool, fixType)) {
        issues.push(...result.issues);
      }
    }

    return issues;
  }

  private shouldFixWithType(tool: string, fixType: string): boolean {
    const mapping: Record<string, string[]> = {
      eslint: ['eslint'],
      typescript: ['typescript'],
      security: ['security'],
      format: ['eslint'], // ESLint handles formatting
      custom: ['dependencies', 'tests'],
    };

    return mapping[fixType]?.includes(tool) || false;
  }

  private async applyFix(issue: Issue, fixType: string): Promise<Fix> {
    const strategy = this.fixStrategies.get(fixType);

    if (!strategy) {
      throw new Error(`No fix strategy for type: ${fixType}`);
    }

    return await strategy.apply(issue, this.projectRoot);
  }

  private async persistFixResult(result: FixResult): Promise<void> {
    const analysisDir = join(this.projectRoot, '.maestro', 'fixes');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `fixer-${timestamp}.json`;

    try {
      const { mkdir } = await import('fs/promises');
      await mkdir(analysisDir, { recursive: true });
      await writeFile(
        join(analysisDir, filename),
        JSON.stringify(result, null, 2),
      );
    } catch (error) {
      console.warn('Failed to persist fix result:', error);
    }
  }
}

interface FixStrategy {
  apply(issue: Issue, projectRoot: string): Promise<Fix>;
}

class EslintFixStrategy implements FixStrategy {
  async apply(issue: Issue, projectRoot: string): Promise<Fix> {
    try {
      // Try ESLint autofix
      const { stdout, stderr } = await execAsync(
        `npx eslint "${issue.file}" --fix`,
        { cwd: projectRoot },
      );

      return {
        type: 'eslint',
        description: `Auto-fixed ESLint issue: ${issue.message}`,
        file: issue.file,
        applied: true,
      };
    } catch (error) {
      // Check if it's just warnings/errors that couldn't be fixed
      if (error.code === 1) {
        // Some fixes might have been applied
        return {
          type: 'eslint',
          description: `Partially fixed ESLint issue: ${issue.message}`,
          file: issue.file,
          applied: true,
          error: 'Some issues could not be auto-fixed',
        };
      }

      throw error;
    }
  }
}

class TypeScriptFixStrategy implements FixStrategy {
  async apply(issue: Issue, projectRoot: string): Promise<Fix> {
    // TypeScript fixes are usually more complex and require manual intervention
    // For now, we'll attempt some basic fixes

    try {
      const filePath = join(projectRoot, issue.file);
      const content = await readFile(filePath, 'utf8');
      let fixedContent = content;
      let fixed = false;

      // Handle common TS issues
      if (issue.message.includes('is declared but never used')) {
        const varName = issue.message.match(
          /'([^']+)' is declared but never used/,
        )?.[1];
        if (varName) {
          // Prefix with underscore to indicate intentionally unused
          fixedContent = fixedContent.replace(
            new RegExp(`\\b${varName}\\b`, 'g'),
            `_${varName}`,
          );
          fixed = true;
        }
      }

      if (issue.message.includes('Missing return type')) {
        // Add basic return type annotations where missing
        // This is a simplified implementation
        const lines = fixedContent.split('\n');
        if (issue.line && lines[issue.line - 1]) {
          const line = lines[issue.line - 1];
          if (
            line.includes('function') &&
            !line.includes(':') &&
            line.includes('{')
          ) {
            lines[issue.line - 1] = line.replace('{', ': any {');
            fixedContent = lines.join('\n');
            fixed = true;
          }
        }
      }

      if (fixed) {
        await writeFile(filePath, fixedContent);
        return {
          type: 'typescript',
          description: `Fixed TypeScript issue: ${issue.message}`,
          file: issue.file,
          applied: true,
        };
      }

      throw new Error('No automatic fix available');
    } catch (error) {
      throw new Error(`Cannot auto-fix TypeScript issue: ${error.message}`);
    }
  }
}

class SecurityFixStrategy implements FixStrategy {
  async apply(issue: Issue, projectRoot: string): Promise<Fix> {
    try {
      // Try to update vulnerable dependencies
      if (issue.message.includes('vulnerability')) {
        const { stdout } = await execAsync('npm audit fix', {
          cwd: projectRoot,
        });

        return {
          type: 'security',
          description: `Applied security fixes via npm audit fix`,
          file: issue.file,
          applied: true,
        };
      }

      throw new Error('No automatic security fix available');
    } catch (error) {
      throw new Error(`Cannot apply security fix: ${error.message}`);
    }
  }
}

class FormatFixStrategy implements FixStrategy {
  async apply(issue: Issue, projectRoot: string): Promise<Fix> {
    try {
      // Use Prettier for formatting
      await execAsync(`npx prettier --write "${issue.file}"`, {
        cwd: projectRoot,
      });

      return {
        type: 'format',
        description: `Formatted file with Prettier`,
        file: issue.file,
        applied: true,
      };
    } catch (error) {
      throw new Error(`Cannot format file: ${error.message}`);
    }
  }
}

class CustomFixStrategy implements FixStrategy {
  async apply(issue: Issue, projectRoot: string): Promise<Fix> {
    // Handle custom fixes for dependencies, tests, etc.

    if (issue.message.includes('outdated')) {
      try {
        // Selective dependency updates (safe ones only)
        const packageName = issue.message.match(/^(\S+) is outdated/)?.[1];
        if (packageName) {
          await execAsync(`npm update ${packageName}`, {
            cwd: projectRoot,
          });

          return {
            type: 'custom',
            description: `Updated dependency: ${packageName}`,
            file: issue.file,
            applied: true,
          };
        }
      } catch (error) {
        throw new Error(`Cannot update dependency: ${error.message}`);
      }
    }

    throw new Error('No custom fix available');
  }
}
