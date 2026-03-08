"use strict";
/**
 * Context injector - automatically inject codebase context into prompts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextInjector = void 0;
const simple_git_1 = __importDefault(require("simple-git"));
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
class ContextInjector {
    cwd;
    constructor(cwd = process.cwd()) {
        this.cwd = cwd;
    }
    /**
     * Inject codebase context into template context
     */
    async inject(context) {
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
    async getCodebaseContext() {
        const context = {};
        // Git context
        try {
            context.git = await this.getGitContext();
        }
        catch (error) {
            // Not a git repo or git not available
        }
        // Project context
        try {
            context.project = await this.getProjectContext();
        }
        catch (error) {
            // No package.json or not a Node project
        }
        // Environment context
        context.environment = this.getEnvironmentContext();
        // CI context
        try {
            context.ci = await this.getCIContext();
        }
        catch (error) {
            // CI not available
        }
        return context;
    }
    async getGitContext() {
        const git = (0, simple_git_1.default)(this.cwd);
        const [branch, commit, author, status, remotes,] = await Promise.all([
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
    async getProjectContext() {
        const packageJsonPath = (0, path_1.join)(this.cwd, 'package.json');
        if (!(0, fs_1.existsSync)(packageJsonPath)) {
            throw new Error('No package.json found');
        }
        const packageJson = JSON.parse((0, fs_1.readFileSync)(packageJsonPath, 'utf-8'));
        // Detect stack from dependencies
        const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies,
        };
        const stack = [];
        if (allDeps.react)
            stack.push('React');
        if (allDeps.vue)
            stack.push('Vue');
        if (allDeps['@angular/core'])
            stack.push('Angular');
        if (allDeps.typescript)
            stack.push('TypeScript');
        if (allDeps.express)
            stack.push('Express');
        if (allDeps['apollo-server'])
            stack.push('Apollo Server');
        if (allDeps.graphql)
            stack.push('GraphQL');
        if (allDeps['neo4j-driver'])
            stack.push('Neo4j');
        if (allDeps.pg || allDeps.prisma)
            stack.push('PostgreSQL');
        if (allDeps.redis)
            stack.push('Redis');
        return {
            name: packageJson.name || 'unknown',
            version: packageJson.version || '0.0.0',
            stack,
        };
    }
    getEnvironmentContext() {
        const nodeVersion = process.version;
        let pnpmVersion;
        try {
            pnpmVersion = (0, child_process_1.execSync)('pnpm --version', { encoding: 'utf-8' }).trim();
        }
        catch {
            // pnpm not available
        }
        return {
            node: nodeVersion,
            pnpm: pnpmVersion,
            os: `${process.platform} ${process.arch}`,
        };
    }
    async getCIContext() {
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
    async getSummary() {
        const context = await this.getCodebaseContext();
        const lines = [];
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
exports.ContextInjector = ContextInjector;
