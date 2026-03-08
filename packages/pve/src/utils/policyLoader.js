"use strict";
/**
 * Policy Loader Utility
 *
 * Loads and parses policy configurations from various sources.
 *
 * @module pve/utils/policyLoader
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPolicies = loadPolicies;
exports.loadPolicyFile = loadPolicyFile;
exports.loadRegoPolicies = loadRegoPolicies;
exports.resolvePolicyPath = resolvePolicyPath;
exports.getBuiltInPoliciesDir = getBuiltInPoliciesDir;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const glob_1 = require("glob");
const logger_js_1 = require("./logger.js");
const DEFAULT_POLICY_DIR = node_path_1.default.join(__dirname, '..', 'policies');
const DEFAULT_INCLUDE = ['**/*.yaml', '**/*.yml', '**/*.json'];
const DEFAULT_EXCLUDE = ['**/node_modules/**', '**/dist/**', '**/.git/**'];
/**
 * Load all policy configurations from a directory
 */
async function loadPolicies(options = {}) {
    const { baseDir = DEFAULT_POLICY_DIR, include = DEFAULT_INCLUDE, exclude = DEFAULT_EXCLUDE, } = options;
    const policies = [];
    for (const pattern of include) {
        const files = await (0, glob_1.glob)(pattern, {
            cwd: baseDir,
            ignore: exclude,
            absolute: true,
        });
        for (const file of files) {
            try {
                const loaded = await loadPolicyFile(file);
                if (loaded) {
                    policies.push(...loaded);
                }
            }
            catch (error) {
                logger_js_1.logger.warn(`Failed to load policy file: ${file}`, {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }
    logger_js_1.logger.info(`Loaded ${policies.length} policies`, {
        baseDir,
        patterns: include,
    });
    return policies;
}
/**
 * Load a single policy file
 */
async function loadPolicyFile(filePath) {
    if (!node_fs_1.default.existsSync(filePath)) {
        return null;
    }
    const content = node_fs_1.default.readFileSync(filePath, 'utf-8');
    const ext = node_path_1.default.extname(filePath).toLowerCase();
    let parsed;
    if (ext === '.json') {
        parsed = JSON.parse(content);
    }
    else if (ext === '.yaml' || ext === '.yml') {
        parsed = js_yaml_1.default.load(content);
    }
    else {
        logger_js_1.logger.warn(`Unsupported policy file format: ${ext}`, { filePath });
        return null;
    }
    return parsePolicyContent(parsed, filePath);
}
/**
 * Parse policy content into LoadedPolicy objects
 */
function parsePolicyContent(content, source) {
    if (!content || typeof content !== 'object') {
        return [];
    }
    // Handle policy set
    if (isPolicySet(content)) {
        return content.policies.map((policy) => ({
            config: normalizePolicy(policy, content.defaultSeverity),
            source,
        }));
    }
    // Handle single policy
    if (isPolicyConfig(content)) {
        return [
            {
                config: normalizePolicy(content),
                source,
            },
        ];
    }
    // Handle array of policies
    if (Array.isArray(content)) {
        return content
            .filter(isPolicyConfig)
            .map((policy) => ({
            config: normalizePolicy(policy),
            source,
        }));
    }
    return [];
}
/**
 * Type guard for PolicySet
 */
function isPolicySet(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'policies' in obj &&
        Array.isArray(obj.policies));
}
/**
 * Type guard for PolicyConfig
 */
function isPolicyConfig(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        typeof obj.id === 'string');
}
/**
 * Normalize a policy config with defaults
 */
function normalizePolicy(policy, defaultSeverity) {
    return {
        id: policy.id,
        name: policy.name || policy.id,
        description: policy.description || '',
        appliesTo: policy.appliesTo || ['custom'],
        severity: policy.severity || defaultSeverity || 'warning',
        enabled: policy.enabled !== false,
        config: policy.config,
        tags: policy.tags || [],
    };
}
/**
 * Load Rego policy files
 */
async function loadRegoPolicies(baseDir = DEFAULT_POLICY_DIR) {
    const regoPolicies = new Map();
    const files = await (0, glob_1.glob)('**/*.rego', {
        cwd: baseDir,
        absolute: true,
        ignore: ['**/node_modules/**'],
    });
    for (const file of files) {
        try {
            const content = node_fs_1.default.readFileSync(file, 'utf-8');
            const relativePath = node_path_1.default.relative(baseDir, file);
            const policyId = relativePath.replace(/\.rego$/, '').replace(/[/\\]/g, '.');
            regoPolicies.set(policyId, content);
        }
        catch (error) {
            logger_js_1.logger.warn(`Failed to load Rego policy: ${file}`, {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    logger_js_1.logger.info(`Loaded ${regoPolicies.size} Rego policies`, { baseDir });
    return regoPolicies;
}
/**
 * Resolve policy path from various inputs
 */
function resolvePolicyPath(input, baseDir) {
    if (node_path_1.default.isAbsolute(input)) {
        return input;
    }
    if (baseDir) {
        return node_path_1.default.resolve(baseDir, input);
    }
    return node_path_1.default.resolve(DEFAULT_POLICY_DIR, input);
}
/**
 * Get the built-in policies directory
 */
function getBuiltInPoliciesDir() {
    return DEFAULT_POLICY_DIR;
}
