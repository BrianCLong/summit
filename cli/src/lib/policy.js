"use strict";
/**
 * OPA Policy Gate Module
 *
 * Provides policy enforcement for CLI operations using OPA (Open Policy Agent).
 * In CI mode, policy must be present (fail-closed).
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
exports.PolicyGate = exports.PolicyError = exports.PolicyDecisionSchema = exports.PolicyInputSchema = exports.PolicyActionSchema = exports.POLICY_EXIT_CODE = void 0;
exports.stableStringify = stableStringify;
exports.sortActions = sortActions;
exports.isOpaAvailable = isOpaAvailable;
exports.loadPolicyBundle = loadPolicyBundle;
exports.computePolicyBundleHash = computePolicyBundleHash;
exports.buildPolicyInput = buildPolicyInput;
exports.evaluatePolicy = evaluatePolicy;
exports.createPolicyGate = createPolicyGate;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const zod_1 = require("zod");
// Exit code for policy/configuration errors
exports.POLICY_EXIT_CODE = 2;
/**
 * Policy action schema
 */
exports.PolicyActionSchema = zod_1.z.discriminatedUnion('type', [
    zod_1.z.object({
        type: zod_1.z.literal('write_patch'),
        files: zod_1.z.array(zod_1.z.string()),
        diff_bytes: zod_1.z.number(),
    }),
    zod_1.z.object({
        type: zod_1.z.literal('read_file'),
        path: zod_1.z.string(),
    }),
    zod_1.z.object({
        type: zod_1.z.literal('exec_tool'),
        tool: zod_1.z.string(),
        args: zod_1.z.array(zod_1.z.string()),
    }),
    zod_1.z.object({
        type: zod_1.z.literal('network'),
        kind: zod_1.z.string(),
    }),
]);
/**
 * Policy input schema - sent to OPA for evaluation
 */
exports.PolicyInputSchema = zod_1.z.object({
    command: zod_1.z.string(),
    flags: zod_1.z.object({
        ci: zod_1.z.boolean(),
        write: zod_1.z.boolean(),
        policy_present: zod_1.z.boolean(),
    }),
    repo_root: zod_1.z.string(),
    actions: zod_1.z.array(exports.PolicyActionSchema),
});
/**
 * Policy decision schema - returned from OPA
 */
exports.PolicyDecisionSchema = zod_1.z.object({
    allow: zod_1.z.boolean(),
    deny_reasons: zod_1.z.array(zod_1.z.string()).optional().default([]),
    limits: zod_1.z.object({
        max_files: zod_1.z.number().optional(),
        max_diff_bytes: zod_1.z.number().optional(),
    }).optional(),
});
/**
 * Stable JSON stringify for deterministic output
 */
function stableStringify(obj) {
    return JSON.stringify(obj, Object.keys(obj).sort(), 2);
}
/**
 * Sort actions deterministically for policy evaluation
 */
function sortActions(actions) {
    return [...actions].sort((a, b) => {
        // First sort by type
        const typeCompare = a.type.localeCompare(b.type);
        if (typeCompare !== 0)
            return typeCompare;
        // Then sort by type-specific fields
        switch (a.type) {
            case 'write_patch':
                return a.files.join(',').localeCompare(b.files.join(','));
            case 'read_file':
                return a.path.localeCompare(b.path);
            case 'exec_tool':
                return a.tool.localeCompare(b.tool);
            case 'network':
                return a.kind.localeCompare(b.kind);
            default:
                return 0;
        }
    }).map(action => {
        // Sort files arrays within write_patch actions
        if (action.type === 'write_patch') {
            return {
                ...action,
                files: [...action.files].sort(),
            };
        }
        // Sort args arrays within exec_tool actions
        if (action.type === 'exec_tool') {
            return {
                ...action,
                args: [...action.args].sort(),
            };
        }
        return action;
    });
}
/**
 * Check if OPA is available on the system
 */
function isOpaAvailable() {
    try {
        const result = (0, child_process_1.spawnSync)('opa', ['version'], { encoding: 'utf-8', timeout: 5000 });
        return result.status === 0;
    }
    catch {
        return false;
    }
}
/**
 * Load and validate policy bundle
 */
function loadPolicyBundle(bundlePath) {
    try {
        const resolvedPath = path.resolve(bundlePath);
        if (!fs.existsSync(resolvedPath)) {
            return { valid: false, error: `Policy bundle not found: ${bundlePath}` };
        }
        const stat = fs.statSync(resolvedPath);
        // Check for policy.rego file
        if (stat.isDirectory()) {
            const policyFile = path.join(resolvedPath, 'policy.rego');
            if (!fs.existsSync(policyFile)) {
                return { valid: false, error: `No policy.rego found in bundle: ${bundlePath}` };
            }
        }
        else if (!resolvedPath.endsWith('.rego')) {
            return { valid: false, error: `Invalid policy bundle format: ${bundlePath}` };
        }
        return { valid: true };
    }
    catch (error) {
        return {
            valid: false,
            error: `Failed to load policy bundle: ${error instanceof Error ? error.message : String(error)}`
        };
    }
}
/**
 * Collect all .rego files from a directory recursively in sorted order
 */
function collectRegoFiles(dir) {
    const files = [];
    function walk(currentDir) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        // Sort entries for deterministic ordering
        entries.sort((a, b) => a.name.localeCompare(b.name));
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            }
            else if (entry.isFile() && entry.name.endsWith('.rego')) {
                files.push(fullPath);
            }
        }
    }
    walk(dir);
    return files;
}
/**
 * Compute a stable SHA-256 hash of a policy bundle
 *
 * The hash is computed by:
 * 1. Collecting all .rego files in deterministic (sorted) order
 * 2. For each file, hashing: relative_path + '\0' + file_contents
 * 3. Combining all file hashes into a final bundle hash
 *
 * This ensures the same bundle always produces the same hash,
 * regardless of filesystem ordering.
 */
function computePolicyBundleHash(bundlePath) {
    try {
        const resolvedPath = path.resolve(bundlePath);
        if (!fs.existsSync(resolvedPath)) {
            return null;
        }
        const stat = fs.statSync(resolvedPath);
        const hash = crypto.createHash('sha256');
        if (stat.isDirectory()) {
            // Collect all .rego files in sorted order
            const regoFiles = collectRegoFiles(resolvedPath);
            if (regoFiles.length === 0) {
                return null;
            }
            for (const file of regoFiles) {
                // Use relative path for consistency across machines
                const relativePath = path.relative(resolvedPath, file);
                const content = fs.readFileSync(file, 'utf-8');
                // Include path in hash to detect file renames
                hash.update(relativePath + '\0' + content);
            }
        }
        else if (resolvedPath.endsWith('.rego')) {
            // Single .rego file
            const content = fs.readFileSync(resolvedPath, 'utf-8');
            const basename = path.basename(resolvedPath);
            hash.update(basename + '\0' + content);
        }
        else {
            return null;
        }
        return hash.digest('hex');
    }
    catch {
        return null;
    }
}
/**
 * Build policy input from CLI context and actions
 */
function buildPolicyInput(command, flags, repoRoot, actions) {
    return {
        command,
        flags: {
            ci: flags.ci,
            write: flags.write,
            policy_present: flags.policyPresent,
        },
        repo_root: path.resolve(repoRoot),
        actions: sortActions(actions),
    };
}
/**
 * Evaluate policy using OPA
 */
function evaluatePolicy(input, bundlePath) {
    const resolvedBundle = path.resolve(bundlePath);
    const policyPath = fs.statSync(resolvedBundle).isDirectory()
        ? path.join(resolvedBundle, 'policy.rego')
        : resolvedBundle;
    // Create deterministic input JSON
    const inputJson = stableStringify(input);
    try {
        // Use OPA eval with JSON output
        const result = (0, child_process_1.spawnSync)('opa', [
            'eval',
            '--data', policyPath,
            '--input', '/dev/stdin',
            '--format', 'json',
            'data.claude.policy.decision',
        ], {
            input: inputJson,
            encoding: 'utf-8',
            timeout: 30000,
        });
        if (result.status !== 0) {
            throw new Error(`OPA evaluation failed: ${result.stderr || 'unknown error'}`);
        }
        const output = JSON.parse(result.stdout);
        // OPA returns results in a specific format
        if (!output.result || output.result.length === 0) {
            // No result means default deny
            return {
                allow: false,
                deny_reasons: ['no_policy_result'],
            };
        }
        const decision = output.result[0].expressions[0].value;
        return exports.PolicyDecisionSchema.parse(decision);
    }
    catch (error) {
        // Policy evaluation errors result in deny
        return {
            allow: false,
            deny_reasons: [`policy_eval_error: ${error instanceof Error ? error.message : String(error)}`],
        };
    }
}
/**
 * Policy gate error class
 */
class PolicyError extends Error {
    reasons;
    exitCode;
    constructor(message, reasons = [], exitCode = exports.POLICY_EXIT_CODE) {
        super(message);
        this.reasons = reasons;
        this.exitCode = exitCode;
        this.name = 'PolicyError';
    }
    /**
     * Format error for output with stable-sorted reasons
     */
    format() {
        const sortedReasons = [...this.reasons].sort();
        let output = `Policy Error: ${this.message}`;
        if (sortedReasons.length > 0) {
            output += '\nDeny reasons:';
            for (const reason of sortedReasons) {
                output += `\n  - ${reason}`;
            }
        }
        return output;
    }
}
exports.PolicyError = PolicyError;
/**
 * Policy gate - main entry point for policy enforcement
 */
class PolicyGate {
    options;
    policyLoaded = false;
    policyBundleHash = null;
    constructor(options) {
        this.options = options;
    }
    /**
     * Initialize policy gate - validates configuration
     */
    initialize() {
        // In CI mode, policy bundle is required
        if (this.options.ci && !this.options.policyBundle) {
            throw new PolicyError('Policy bundle required in CI mode', ['ci_mode_requires_policy'], exports.POLICY_EXIT_CODE);
        }
        // If policy bundle specified, validate it
        if (this.options.policyBundle) {
            // Check OPA availability
            if (!isOpaAvailable()) {
                throw new PolicyError('OPA not found. Install OPA to use policy enforcement.', ['opa_not_available'], exports.POLICY_EXIT_CODE);
            }
            // Validate policy bundle
            const { valid, error } = loadPolicyBundle(this.options.policyBundle);
            if (!valid) {
                throw new PolicyError(error || 'Invalid policy bundle', ['invalid_policy_bundle'], exports.POLICY_EXIT_CODE);
            }
            // Compute bundle hash for audit trail
            this.policyBundleHash = computePolicyBundleHash(this.options.policyBundle);
            this.policyLoaded = true;
        }
    }
    /**
     * Evaluate actions against policy
     */
    evaluate(command, flags, actions) {
        // If no policy loaded and not in CI mode, allow by default
        if (!this.policyLoaded) {
            return {
                allow: true,
                deny_reasons: [],
            };
        }
        const input = buildPolicyInput(command, {
            ci: this.options.ci,
            write: flags.write,
            policyPresent: this.policyLoaded,
        }, this.options.repoRoot, actions);
        const decision = evaluatePolicy(input, this.options.policyBundle);
        // Enforce decision
        if (!decision.allow) {
            const sortedReasons = [...(decision.deny_reasons || [])].sort();
            throw new PolicyError('Action denied by policy', sortedReasons, exports.POLICY_EXIT_CODE);
        }
        return decision;
    }
    /**
     * Check if policy is loaded
     */
    isPolicyLoaded() {
        return this.policyLoaded;
    }
    /**
     * Get policy limits (if any)
     */
    getLimits() {
        return undefined; // Limits are returned per-evaluation
    }
    /**
     * Get policy bundle path (if loaded)
     */
    getPolicyBundlePath() {
        return this.policyLoaded ? this.options.policyBundle ?? null : null;
    }
    /**
     * Get policy bundle hash (if loaded)
     */
    getPolicyBundleHash() {
        return this.policyBundleHash;
    }
}
exports.PolicyGate = PolicyGate;
/**
 * Create and initialize policy gate from CLI options
 */
function createPolicyGate(options) {
    const gate = new PolicyGate({
        policyBundle: options.policyBundle,
        ci: options.ci || false,
        repoRoot: options.repoRoot || process.cwd(),
    });
    gate.initialize();
    return gate;
}
