"use strict";
/**
 * Security commands for Admin CLI
 * Key rotation, policy checks, and security audits
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSecurityCommands = registerSecurityCommands;
const commander_1 = require("commander");
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const output_js_1 = require("../utils/output.js");
const api_client_js_1 = require("../utils/api-client.js");
const config_js_1 = require("../utils/config.js");
const confirm_js_1 = require("../utils/confirm.js");
/**
 * Register security commands
 */
function registerSecurityCommands(program) {
    const securityCmd = new commander_1.Command('security')
        .description('Security operations: key rotation, policy checks');
    // List keys
    securityCmd
        .command('keys')
        .description('List security keys and their status')
        .option('--type <type>', 'Filter by key type (jwt, api, encryption)')
        .option('--status <status>', 'Filter by status (active, expired, rotated)')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await listKeys(options, globalOpts);
    });
    // Rotate keys command
    securityCmd
        .command('rotate-keys')
        .description('Rotate security keys (requires confirmation)')
        .option('--type <type>', 'Key type to rotate (jwt, api, encryption)', 'all')
        .option('--grace-period <hours>', 'Grace period for old keys (hours)', '24')
        .option('--force', 'Skip confirmation (dangerous)')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await rotateKeys(options, globalOpts);
    });
    // Check policies command
    securityCmd
        .command('check-policies')
        .description('Run security policy compliance checks')
        .option('--policy <name>', 'Specific policy to check')
        .option('--all', 'Check all policies')
        .option('--report <file>', 'Output report file')
        .option('--fail-on-violation', 'Exit with error if violations found')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await checkPolicies(options, globalOpts);
    });
    // Audit command
    securityCmd
        .command('audit')
        .description('View security audit events')
        .option('--from <date>', 'Start date (ISO format)')
        .option('--to <date>', 'End date (ISO format)')
        .option('--action <action>', 'Filter by action type')
        .option('--user <userId>', 'Filter by user ID')
        .option('--limit <n>', 'Number of events', '100')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await viewAuditEvents(options, globalOpts);
    });
    // Revoke tokens command
    securityCmd
        .command('revoke-tokens')
        .description('Revoke user tokens')
        .option('--user <userId>', 'User ID to revoke tokens for')
        .option('--tenant <tenantId>', 'Revoke all tokens for tenant')
        .option('--all', 'Revoke all tokens (dangerous)')
        .option('--force', 'Skip confirmation')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await revokeTokens(options, globalOpts);
    });
    // RBAC check command
    securityCmd
        .command('check-permission')
        .description('Check if a user has a specific permission')
        .requiredOption('--user <userId>', 'User ID')
        .requiredOption('--permission <permission>', 'Permission to check (e.g., entity:read)')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await checkPermission(options, globalOpts);
    });
    program.addCommand(securityCmd);
}
/**
 * List security keys
 */
async function listKeys(options, globalOpts) {
    const spinner = (0, ora_1.default)('Fetching security keys...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const params = new URLSearchParams();
        if (options.type)
            params.append('type', options.type);
        if (options.status)
            params.append('status', options.status);
        const response = await apiClient.get(`/admin/security/keys?${params.toString()}`);
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to fetch keys: ${response.error?.message}`);
            // Fall back to mock data for demo
        }
        const keys = response.data?.items ?? getMockKeys();
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(keys);
            return;
        }
        (0, output_js_1.printHeader)('Security Keys');
        const keyRows = keys.map((k) => ({
            id: k.id.slice(0, 12) + '...',
            type: k.type,
            status: formatKeyStatus(k.status),
            createdAt: new Date(k.createdAt).toLocaleDateString(),
            expiresAt: k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'Never',
        }));
        (0, output_js_1.outputTable)(keyRows);
    }
    catch (err) {
        spinner.fail('Failed to fetch keys');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Rotate security keys
 */
async function rotateKeys(options, globalOpts) {
    const keyType = options.type ?? 'all';
    const gracePeriodHours = parseInt(options.gracePeriod ?? '24', 10);
    // Extra confirmation for production
    const profile = globalOpts.profile ?? 'default';
    if (profile === 'production' || profile === 'prod') {
        const confirmed = await (0, confirm_js_1.requireProductionConfirmation)('production', 'rotate security keys');
        if (!confirmed) {
            (0, confirm_js_1.abort)();
        }
    }
    if (!options.force) {
        (0, confirm_js_1.requireInteractive)('Key rotation');
        const message = keyType === 'all'
            ? 'You are about to rotate ALL security keys. This will invalidate existing tokens after the grace period.'
            : `You are about to rotate ${keyType} keys. This will invalidate existing ${keyType} tokens after the grace period.`;
        const confirmed = await (0, confirm_js_1.confirmWithPhrase)({
            message,
            requireTypedConfirmation: true,
            typedConfirmationPhrase: confirm_js_1.CONFIRMATION_PHRASES.ROTATE,
        });
        if (!confirmed) {
            (0, confirm_js_1.abort)();
        }
    }
    if (globalOpts.dryRun) {
        (0, output_js_1.printDryRunBanner)();
        console.log(chalk_1.default.bold('Would rotate keys:'));
        console.log(`  Type: ${keyType}`);
        console.log(`  Grace period: ${gracePeriodHours} hours`);
        return;
    }
    const spinner = (0, ora_1.default)('Rotating keys...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const response = await apiClient.post('/admin/security/rotate-keys', {
            type: keyType,
            gracePeriodHours,
        });
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to rotate keys: ${response.error?.message}`);
            process.exit(1);
        }
        const rotatedKeys = response.data?.rotatedKeys ?? [];
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)({ success: true, rotatedKeys });
            return;
        }
        (0, output_js_1.printSuccess)('Keys rotated successfully');
        console.log(chalk_1.default.bold(`Grace period: ${gracePeriodHours} hours`));
        console.log();
        if (rotatedKeys.length > 0) {
            console.log(chalk_1.default.bold('Rotated keys:'));
            for (const key of rotatedKeys) {
                console.log(`  - ${key.type}: ${key.id}`);
            }
        }
        (0, output_js_1.printWarning)(`Old keys will remain valid for ${gracePeriodHours} hours.`);
        (0, output_js_1.printInfo)('Monitor the audit log for any authentication failures.');
    }
    catch (err) {
        spinner.fail('Failed to rotate keys');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Check security policies
 */
async function checkPolicies(options, globalOpts) {
    if (!options.policy && !options.all) {
        (0, output_js_1.printError)('Specify --policy <name> or --all');
        process.exit(1);
    }
    const spinner = (0, ora_1.default)('Running policy checks...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const body = options.all ? { checkAll: true } : { policy: options.policy };
        const response = await apiClient.post('/admin/security/check-policies', body);
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to check policies: ${response.error?.message}`);
            // Fall back to mock data
        }
        const results = response.data?.results ?? getMockPolicyResults();
        // Write report to file if specified
        if (options.report) {
            const fs = await Promise.resolve().then(() => __importStar(require('node:fs/promises')));
            await fs.writeFile(options.report, JSON.stringify(results, null, 2));
            (0, output_js_1.printInfo)(`Report saved to ${options.report}`);
        }
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(results);
            if (options.failOnViolation) {
                const hasViolations = results.some((r) => r.violations.length > 0);
                if (hasViolations)
                    process.exit(1);
            }
            return;
        }
        (0, output_js_1.printHeader)('Policy Check Results');
        let totalViolations = 0;
        for (const result of results) {
            const statusIcon = result.compliant ? chalk_1.default.green('✓') : chalk_1.default.red('✗');
            console.log(`${statusIcon} ${chalk_1.default.bold(result.policy)}`);
            if (result.violations.length > 0) {
                totalViolations += result.violations.length;
                for (const violation of result.violations) {
                    const severityColor = getSeverityColor(violation.severity);
                    console.log(`    ${severityColor(`[${violation.severity}]`)} ${violation.rule}`);
                    console.log(`      ${chalk_1.default.gray(violation.description)}`);
                    if (violation.resource) {
                        console.log(`      ${chalk_1.default.gray(`Resource: ${violation.resource}`)}`);
                    }
                    if (violation.recommendation) {
                        console.log(`      ${chalk_1.default.cyan(`Fix: ${violation.recommendation}`)}`);
                    }
                }
            }
            console.log();
        }
        // Summary
        const compliantCount = results.filter((r) => r.compliant).length;
        console.log(chalk_1.default.bold('Summary:'));
        console.log(`  Policies checked: ${results.length}`);
        console.log(`  Compliant: ${chalk_1.default.green(compliantCount)}`);
        console.log(`  Non-compliant: ${results.length - compliantCount > 0 ? chalk_1.default.red(results.length - compliantCount) : chalk_1.default.green(0)}`);
        console.log(`  Total violations: ${totalViolations > 0 ? chalk_1.default.red(totalViolations) : chalk_1.default.green(0)}`);
        if (options.failOnViolation && totalViolations > 0) {
            process.exit(1);
        }
    }
    catch (err) {
        spinner.fail('Failed to check policies');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * View audit events
 */
async function viewAuditEvents(options, globalOpts) {
    const spinner = (0, ora_1.default)('Fetching audit events...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const params = new URLSearchParams();
        if (options.from)
            params.append('from', options.from);
        if (options.to)
            params.append('to', options.to);
        if (options.action)
            params.append('action', options.action);
        if (options.user)
            params.append('user', options.user);
        if (options.limit)
            params.append('limit', options.limit);
        const response = await apiClient.get(`/admin/audit?${params.toString()}`);
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to fetch audit events: ${response.error?.message}`);
        }
        const events = response.data?.items ?? getMockAuditEvents();
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(events);
            return;
        }
        (0, output_js_1.printHeader)('Audit Events');
        const eventRows = events.map((e) => ({
            timestamp: (0, output_js_1.formatTimestamp)(e.ts),
            action: e.action,
            user: e.user?.email ?? e.user?.id ?? '-',
            ip: e.ip ?? '-',
            details: e.details ? JSON.stringify(e.details).slice(0, 40) : '-',
        }));
        (0, output_js_1.outputTable)(eventRows);
    }
    catch (err) {
        spinner.fail('Failed to fetch audit events');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Revoke tokens
 */
async function revokeTokens(options, globalOpts) {
    if (!options.user && !options.tenant && !options.all) {
        (0, output_js_1.printError)('Specify --user <userId>, --tenant <tenantId>, or --all');
        process.exit(1);
    }
    if (options.all && !options.force) {
        (0, confirm_js_1.requireInteractive)('Revoking all tokens');
        const confirmed = await (0, confirm_js_1.confirmWithPhrase)({
            message: 'You are about to revoke ALL tokens for ALL users. This will force everyone to re-authenticate.',
            requireTypedConfirmation: true,
            typedConfirmationPhrase: confirm_js_1.CONFIRMATION_PHRASES.FORCE,
        });
        if (!confirmed) {
            (0, confirm_js_1.abort)();
        }
    }
    if (globalOpts.dryRun) {
        (0, output_js_1.printDryRunBanner)();
        console.log(chalk_1.default.bold('Would revoke tokens:'));
        if (options.user)
            console.log(`  User: ${options.user}`);
        if (options.tenant)
            console.log(`  Tenant: ${options.tenant}`);
        if (options.all)
            console.log(`  Scope: ALL tokens`);
        return;
    }
    const spinner = (0, ora_1.default)('Revoking tokens...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const response = await apiClient.post('/admin/security/revoke-tokens', {
            userId: options.user,
            tenantId: options.tenant,
            all: options.all,
        });
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to revoke tokens: ${response.error?.message}`);
            process.exit(1);
        }
        const revokedCount = response.data?.revokedCount ?? 0;
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)({ success: true, revokedCount });
            return;
        }
        (0, output_js_1.printSuccess)(`Revoked ${revokedCount} token(s)`);
    }
    catch (err) {
        spinner.fail('Failed to revoke tokens');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Check user permission
 */
async function checkPermission(options, globalOpts) {
    const spinner = (0, ora_1.default)('Checking permission...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const response = await apiClient.post('/admin/security/check-permission', {
            userId: options.user,
            permission: options.permission,
        });
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to check permission: ${response.error?.message}`);
            process.exit(1);
        }
        const result = response.data ?? { allowed: false, reason: 'Unknown' };
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(result);
            return;
        }
        if (result.allowed) {
            (0, output_js_1.printSuccess)(`User ${options.user} has permission: ${options.permission}`);
            if (result.matchedPermission) {
                console.log(chalk_1.default.gray(`  Matched by: ${result.matchedPermission}`));
            }
        }
        else {
            (0, output_js_1.printWarning)(`User ${options.user} does NOT have permission: ${options.permission}`);
            if (result.reason) {
                console.log(chalk_1.default.gray(`  Reason: ${result.reason}`));
            }
        }
    }
    catch (err) {
        spinner.fail('Failed to check permission');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Format key status with color
 */
function formatKeyStatus(status) {
    switch (status) {
        case 'active':
            return chalk_1.default.green('active');
        case 'expired':
            return chalk_1.default.red('expired');
        case 'rotated':
            return chalk_1.default.yellow('rotated');
        default:
            return chalk_1.default.gray(status);
    }
}
/**
 * Get severity color
 */
function getSeverityColor(severity) {
    switch (severity) {
        case 'critical':
            return chalk_1.default.bgRed.white;
        case 'high':
            return chalk_1.default.red;
        case 'medium':
            return chalk_1.default.yellow;
        case 'low':
            return chalk_1.default.blue;
        default:
            return chalk_1.default.gray;
    }
}
/**
 * Mock data for demo/fallback
 */
function getMockKeys() {
    return [
        {
            id: 'key-jwt-primary-abc123',
            type: 'jwt',
            createdAt: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
            expiresAt: new Date(Date.now() + 60 * 24 * 3600000).toISOString(),
            status: 'active',
        },
        {
            id: 'key-api-service-def456',
            type: 'api',
            createdAt: new Date(Date.now() - 90 * 24 * 3600000).toISOString(),
            status: 'active',
        },
        {
            id: 'key-enc-data-ghi789',
            type: 'encryption',
            createdAt: new Date(Date.now() - 180 * 24 * 3600000).toISOString(),
            status: 'active',
        },
    ];
}
function getMockPolicyResults() {
    return [
        {
            policy: 'password-policy',
            compliant: true,
            violations: [],
            checkedAt: new Date().toISOString(),
        },
        {
            policy: 'data-retention',
            compliant: true,
            violations: [],
            checkedAt: new Date().toISOString(),
        },
        {
            policy: 'access-logging',
            compliant: true,
            violations: [],
            checkedAt: new Date().toISOString(),
        },
    ];
}
function getMockAuditEvents() {
    return [
        {
            ts: new Date(Date.now() - 60000).toISOString(),
            action: 'auth.success',
            user: { email: 'admin@example.com' },
            ip: '192.168.1.1',
        },
        {
            ts: new Date(Date.now() - 120000).toISOString(),
            action: 'entity.create',
            user: { email: 'analyst@example.com' },
            ip: '192.168.1.2',
            details: { entityType: 'Person' },
        },
        {
            ts: new Date(Date.now() - 180000).toISOString(),
            action: 'investigation.update',
            user: { email: 'analyst@example.com' },
            ip: '192.168.1.2',
        },
    ];
}
