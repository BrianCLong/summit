/**
 * Context injector - automatically inject codebase context into prompts
 */

import simpleGit from 'simple-git';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { TemplateContext } from '../core/types.js';

export interface CodebaseContext {
  git?: {
    branch: string;
    commit: string;
    author: string;
    status: string;
    remoteUrl?: string;
  };
  project?: {
    name: string;
    version: string;
    stack: string[];
  };
  environment?: {
    node: string;
    pnpm?: string;
    os: string;
  };
  ci?: {
    status: string;
    lastRun?: string;
  };
}

export class ContextInjector {
  private cwd: string;

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd;
  }

  /**
   * Inject codebase context into template context
   */
  async inject(context: TemplateContext): Promise<TemplateContext> {
    const codebaseContext = await this.getCodebaseContext();

    return {
      ...context,
      _context: codebaseContext,
      // Also add flattened versions for easy access
      gitBranch: codebaseContext.git?.branch,
      gitCommit: codebaseContext.git?.commit,
      projectName: codebaseContext.project?.name,
      projectVersion: codebaseContext.project?.version,
    };
  }

  /**
   * Get comprehensive codebase context
   */
  async getCodebaseContext(): Promise<CodebaseContext> {
    const context: CodebaseContext = {};

    // Git context
    try {
      context.git = await this.getGitContext();
    } catch (error) {
      // Not a git repo or git not available
    }

    // Project context
    try {
      context.project = await this.getProjectContext();
    } catch (error) {
      // No package.json or not a Node project
    }

    // Environment context
    context.environment = this.getEnvironmentContext();

    // CI context
    try {
      context.ci = await this.getCIContext();
    } catch (error) {
      // CI not available
    }

    return context;
  }

  private async getGitContext() {
    const git = simpleGit(this.cwd);

    const [
      branch,
      commit,
      author,
      status,
      remotes,
    ] = await Promise.all([
      git.revparse(['--abbrev-ref', 'HEAD']),
      git.revparse(['HEAD']),
      git.raw(['log', '-1', '--format=%an <%ae>']),
      git.status(),
      git.getRemotes(true),
    ]);

    const origin = remotes.find(r => r.name === 'origin');

    return {
      branch: branch.trim(),
      commit: commit.trim(),
      author: author.trim(),
      status: status.files.length > 0 ? 'modified' : 'clean',
      remoteUrl: origin?.refs.fetch,
    };
  }

  private async getProjectContext() {
    const packageJsonPath = join(this.cwd, 'package.json');

    if (!existsSync(packageJsonPath)) {
      throw new Error('No package.json found');
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    // Detect stack from dependencies
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const stack: string[] = [];
    if (allDeps.react) stack.push('React');
    if (allDeps.vue) stack.push('Vue');
    if (allDeps['@angular/core']) stack.push('Angular');
    if (allDeps.typescript) stack.push('TypeScript');
    if (allDeps.express) stack.push('Express');
    if (allDeps['apollo-server']) stack.push('Apollo Server');
    if (allDeps.graphql) stack.push('GraphQL');
    if (allDeps['neo4j-driver']) stack.push('Neo4j');
    if (allDeps.pg || allDeps.prisma) stack.push('PostgreSQL');
    if (allDeps.redis) stack.push('Redis');

    return {
      name: packageJson.name || 'unknown',
      version: packageJson.version || '0.0.0',
      stack,
    };
  }

  private getEnvironmentContext() {
    const nodeVersion = process.version;

    let pnpmVersion: string | undefined;
    try {
      pnpmVersion = execSync('pnpm --version', { encoding: 'utf-8' }).trim();
    } catch {
      // pnpm not available
    }

    return {
      node: nodeVersion,
      pnpm: pnpmVersion,
      os: `${process.platform} ${process.arch}`,
    };
  }

  private async getCIContext() {
    // Check for common CI environment variables
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

    if (!isCI) {
      return {
        status: 'not in CI',
      };
    }

    // GitHub Actions
    if (process.env.GITHUB_ACTIONS) {
      return {
        status: 'running',
        lastRun: process.env.GITHUB_RUN_NUMBER,
      };
    }

    return {
      status: 'unknown CI',
    };
  }

  /**
   * Get a summary of the current codebase state
   */
  async getSummary(): Promise<string> {
    const context = await this.getCodebaseContext();

    const lines: string[] = [];

    if (context.git) {
      lines.push(`Branch: ${context.git.branch}`);
      lines.push(`Commit: ${context.git.commit.substring(0, 8)}`);
      lines.push(`Status: ${context.git.status}`);
    }

    if (context.project) {
      lines.push(`Project: ${context.project.name} v${context.project.version}`);
      if (context.project.stack.length > 0) {
        lines.push(`Stack: ${context.project.stack.join(', ')}`);
      }
    }

    if (context.environment) {
      lines.push(`Node: ${context.environment.node}`);
      if (context.environment.pnpm) {
        lines.push(`pnpm: ${context.environment.pnpm}`);
      }
    }

    return lines.join('\n');
  }
}
