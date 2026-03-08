"use strict";
/**
 * Sandbox Guardrails Module
 *
 * Provides path allowlist/denylist enforcement, tool execution restrictions,
 * and network permission control for safe CLI operation.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SANDBOX_OPTIONS = exports.Sandbox = exports.SandboxError = exports.SECRET_ENV_PATTERNS = exports.SAFE_ENV_VARS = exports.ENV_FILE_PATTERNS = exports.HARDCODED_DENY_PATTERNS = exports.SANDBOX_EXIT_CODE = void 0;
exports.matchesGlob = matchesGlob;
exports.normalizePath = normalizePath;
exports.isPathWithin = isPathWithin;
exports.scrubEnvironment = scrubEnvironment;
exports.createSandbox = createSandbox;
exports.detectRepoRoot = detectRepoRoot;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
// Exit code for sandbox violations
exports.SANDBOX_EXIT_CODE = 2;
/**
 * Default deny patterns that cannot be overridden
 */
exports.HARDCODED_DENY_PATTERNS = [
    '.git/**',
    '**/*.pem',
    '**/*.key',
    '**/*.p12',
    '**/*.pfx',
    '**/id_rsa*',
    '**/*_ed25519*',
    '**/secrets/**',
];
/**
 * Env-file patterns (require explicit opt-in)
 */
exports.ENV_FILE_PATTERNS = [
    '**/.env',
    '**/.env.*',
];
/**
 * Safe environment variables to pass through to tools
 */
exports.SAFE_ENV_VARS = [
    'PATH',
    'HOME',
    'USER',
    'SHELL',
    'TERM',
    'LANG',
    'LC_ALL',
    'TZ',
    'NODE_ENV',
    'CI',
    'GITHUB_ACTIONS',
    'GITLAB_CI',
    'JENKINS_HOME',
];
/**
 * Environment variable patterns to scrub (secrets)
 */
exports.SECRET_ENV_PATTERNS = [
    /SECRET/i,
    /TOKEN/i,
    /PASSWORD/i,
    /CREDENTIAL/i,
    /API_KEY/i,
    /PRIVATE_KEY/i,
    /AUTH/i,
];
/**
 * Sandbox violation error
 */
class SandboxError extends Error {
    violationType;
    details;
    exitCode;
    constructor(message, violationType, details = [], exitCode = exports.SANDBOX_EXIT_CODE) {
        super(message);
        this.violationType = violationType;
        this.details = details;
        this.exitCode = exitCode;
        this.name = 'SandboxError';
    }
    format() {
        const sortedDetails = [...this.details].sort();
        let output = `Sandbox Error (${this.violationType}): ${this.message}`;
        if (sortedDetails.length > 0) {
            output += '\nDetails:';
            for (const detail of sortedDetails) {
                output += `\n  - ${detail}`;
            }
        }
        return output;
    }
}
exports.SandboxError = SandboxError;
/**
 * Simple glob pattern matching
 */
function matchesGlob(filePath, pattern) {
    // Normalize paths
    const normalizedPath = filePath.replace(/\\/g, '/');
    const normalizedPattern = pattern.replace(/\\/g, '/');
    // Handle **/ prefix - should match files in any directory including root
    let patternToMatch = normalizedPattern;
    if (patternToMatch.startsWith('**/')) {
        // **/ means "any directory including none"
        patternToMatch = patternToMatch.slice(3); // Remove **/
    }
    // Convert glob pattern to regex
    let regexPattern = patternToMatch
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
        .replace(/\*\*/g, '{{GLOBSTAR}}') // Temp placeholder for **
        .replace(/\*/g, '[^/]*') // * matches anything except /
        .replace(/{{GLOBSTAR}}/g, '.*') // ** matches anything including /
        .replace(/\?/g, '[^/]'); // ? matches single char except /
    // If original pattern started with **/, match from any position
    if (normalizedPattern.startsWith('**/')) {
        regexPattern = '(^|.*/|^)' + regexPattern;
    }
    else if (!normalizedPattern.startsWith('*')) {
        regexPattern = '(^|/)' + regexPattern;
    }
    const regex = new RegExp(regexPattern + '$', 'i');
    return regex.test(normalizedPath);
}
/**
 * Normalize and resolve a path, handling symlinks
 */
function normalizePath(inputPath, baseDir) {
    // Resolve relative paths against base directory
    const absolutePath = path.isAbsolute(inputPath)
        ? inputPath
        : path.resolve(baseDir, inputPath);
    try {
        // Resolve symlinks
        return fs.realpathSync(absolutePath);
    }
    catch {
        // If file doesn't exist yet, resolve without following symlinks
        return path.resolve(absolutePath);
    }
}
/**
 * Check if a path is within a base directory
 */
function isPathWithin(targetPath, baseDir) {
    const normalizedTarget = path.normalize(targetPath);
    const normalizedBase = path.normalize(baseDir);
    // Ensure base ends with separator for proper prefix matching
    const baseWithSep = normalizedBase.endsWith(path.sep)
        ? normalizedBase
        : normalizedBase + path.sep;
    return normalizedTarget === normalizedBase ||
        normalizedTarget.startsWith(baseWithSep);
}
/**
 * Scrub environment variables, removing secrets
 */
function scrubEnvironment(env) {
    const result = {};
    for (const key of Object.keys(env)) {
        // Always include safe vars
        if (exports.SAFE_ENV_VARS.includes(key)) {
            result[key] = env[key];
            continue;
        }
        // Skip vars matching secret patterns
        const isSecret = exports.SECRET_ENV_PATTERNS.some(pattern => pattern.test(key));
        if (!isSecret) {
            result[key] = env[key];
        }
    }
    return result;
}
/**
 * Sandbox class - main guardrail implementation
 */
class Sandbox {
    options;
    resolvedRepoRoot;
    effectiveAllowPaths;
    effectiveDenyPatterns;
    constructor(options) {
        this.options = options;
        this.resolvedRepoRoot = normalizePath(options.repoRoot, process.cwd());
        // Build effective allow paths
        this.effectiveAllowPaths = options.allowPaths.length > 0
            ? options.allowPaths.map(p => normalizePath(p, this.resolvedRepoRoot))
            : [this.resolvedRepoRoot];
        // Build effective deny patterns (hardcoded + user-specified)
        this.effectiveDenyPatterns = options.unsafeAllowSensitivePaths
            ? [...options.denyPaths]
            : [...exports.HARDCODED_DENY_PATTERNS, ...options.denyPaths];
        // Add env file patterns if not explicitly allowed
        if (!options.allowDotenv) {
            this.effectiveDenyPatterns.push(...exports.ENV_FILE_PATTERNS);
        }
    }
    /**
     * Check if a path is allowed for read/write access
     */
    checkPath(targetPath, operation) {
        const normalizedPath = normalizePath(targetPath, this.resolvedRepoRoot);
        // Check against deny patterns first (they take precedence)
        for (const pattern of this.effectiveDenyPatterns) {
            if (matchesGlob(normalizedPath, pattern)) {
                throw new SandboxError(`Access to path denied by pattern: ${pattern}`, 'path', [`path: ${targetPath}`, `operation: ${operation}`, `matched_pattern: ${pattern}`]);
            }
        }
        // Check if path is within any allowed path
        const isAllowed = this.effectiveAllowPaths.some(allowedPath => isPathWithin(normalizedPath, allowedPath));
        if (!isAllowed) {
            throw new SandboxError(`Path outside allowed directories`, 'path', [
                `path: ${targetPath}`,
                `operation: ${operation}`,
                `allowed_paths: ${this.effectiveAllowPaths.join(', ')}`
            ]);
        }
    }
    /**
     * Check if a tool is allowed for execution
     */
    checkTool(tool) {
        if (this.options.allowTools.length === 0) {
            throw new SandboxError(`Tool execution not allowed: ${tool}`, 'tool', ['no_tools_allowed', `requested_tool: ${tool}`]);
        }
        // Extract tool name from path if necessary
        const toolName = path.basename(tool);
        const isAllowed = this.options.allowTools.some(allowed => allowed === tool || allowed === toolName);
        if (!isAllowed) {
            throw new SandboxError(`Tool not in allowlist: ${tool}`, 'tool', [
                `requested_tool: ${tool}`,
                `allowed_tools: ${this.options.allowTools.join(', ')}`
            ]);
        }
    }
    /**
     * Check if network access is allowed
     */
    checkNetwork() {
        if (!this.options.allowNetwork) {
            throw new SandboxError('Network access not allowed', 'network', this.options.ci
                ? ['network_disabled_in_ci', 'use_--allow-network_to_enable']
                : ['network_disabled', 'use_--allow-network_to_enable']);
        }
    }
    /**
     * Execute a tool with sandbox restrictions
     */
    async execTool(tool, args, options = {}) {
        // Check tool is allowed
        this.checkTool(tool);
        // Prepare environment (scrubbed)
        const env = scrubEnvironment(process.env);
        // Disable colors in CI mode
        if (this.options.ci) {
            env.FORCE_COLOR = '0';
            env.NO_COLOR = '1';
        }
        const spawnOptions = {
            cwd: this.resolvedRepoRoot,
            env,
            timeout: this.options.toolTimeoutMs,
            stdio: ['pipe', 'pipe', 'pipe'],
        };
        return new Promise((resolve) => {
            let stdout = '';
            let stderr = '';
            let timedOut = false;
            const proc = (0, child_process_1.spawn)(tool, args, spawnOptions);
            // Set up timeout
            const timeoutHandle = setTimeout(() => {
                timedOut = true;
                proc.kill('SIGKILL');
            }, this.options.toolTimeoutMs);
            if (proc.stdout) {
                proc.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
            }
            if (proc.stderr) {
                proc.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
            }
            if (options.stdin && proc.stdin) {
                proc.stdin.write(options.stdin);
                proc.stdin.end();
            }
            proc.on('close', (code) => {
                clearTimeout(timeoutHandle);
                resolve({
                    exitCode: code ?? 1,
                    stdout,
                    stderr,
                    timedOut,
                });
            });
            proc.on('error', (err) => {
                clearTimeout(timeoutHandle);
                resolve({
                    exitCode: 1,
                    stdout,
                    stderr: stderr + '\n' + err.message,
                    timedOut: false,
                });
            });
        });
    }
    /**
     * Wrap file read operation with sandbox check
     */
    readFile(filePath) {
        this.checkPath(filePath, 'read');
        return fs.readFileSync(normalizePath(filePath, this.resolvedRepoRoot), 'utf-8');
    }
    /**
     * Wrap file write operation with sandbox check
     */
    writeFile(filePath, content) {
        this.checkPath(filePath, 'write');
        const normalizedPath = normalizePath(filePath, this.resolvedRepoRoot);
        // Ensure parent directory exists
        const parentDir = path.dirname(normalizedPath);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(normalizedPath, content);
    }
    /**
     * Check if path exists (with sandbox check)
     */
    exists(filePath) {
        this.checkPath(filePath, 'read');
        return fs.existsSync(normalizePath(filePath, this.resolvedRepoRoot));
    }
    /**
     * Get effective allow paths (for debugging/info)
     */
    getAllowPaths() {
        return [...this.effectiveAllowPaths];
    }
    /**
     * Get effective deny patterns (for debugging/info)
     */
    getDenyPatterns() {
        return [...this.effectiveDenyPatterns];
    }
    /**
     * Get repo root
     */
    getRepoRoot() {
        return this.resolvedRepoRoot;
    }
}
exports.Sandbox = Sandbox;
/**
 * Default sandbox options
 */
exports.DEFAULT_SANDBOX_OPTIONS = {
    allowPaths: [],
    denyPaths: [],
    allowTools: [],
    toolTimeoutMs: 120000,
    allowNetwork: false,
    allowDotenv: false,
    allowUserConfig: false,
    unsafeAllowSensitivePaths: false,
    ci: false,
};
/**
 * Create sandbox with options merged with defaults
 */
function createSandbox(options) {
    const fullOptions = {
        ...exports.DEFAULT_SANDBOX_OPTIONS,
        ...options,
    };
    return new Sandbox(fullOptions);
}
/**
 * Detect repo root (git root or nearest package.json)
 */
function detectRepoRoot(startDir = process.cwd()) {
    let currentDir = path.resolve(startDir);
    while (currentDir !== path.dirname(currentDir)) {
        // Check for .git directory
        if (fs.existsSync(path.join(currentDir, '.git'))) {
            return currentDir;
        }
        // Check for package.json
        if (fs.existsSync(path.join(currentDir, 'package.json'))) {
            return currentDir;
        }
        currentDir = path.dirname(currentDir);
    }
    // Fallback to start directory
    return path.resolve(startDir);
}
