"use strict";
/**
 * Tenant management commands for Admin CLI
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
exports.registerTenantCommands = registerTenantCommands;
const commander_1 = require("commander");
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const output_js_1 = require("../utils/output.js");
const api_client_js_1 = require("../utils/api-client.js");
const config_js_1 = require("../utils/config.js");
const confirm_js_1 = require("../utils/confirm.js");
/**
 * Register tenant commands
 */
function registerTenantCommands(program) {
    const tenantCmd = new commander_1.Command('tenant')
        .description('Tenant management commands');
    // List tenants
    tenantCmd
        .command('list')
        .description('List all tenants')
        .option('--status <status>', 'Filter by status (active, suspended, pending)')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await listTenants(options.status, globalOpts);
    });
    // Get tenant details
    tenantCmd
        .command('get <tenantId>')
        .description('Get tenant details')
        .action(async (tenantId, options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await getTenant(tenantId, globalOpts);
    });
    // Create tenant
    tenantCmd
        .command('create')
        .description('Create a new tenant')
        .option('-n, --name <name>', 'Tenant name')
        .option('-e, --admin-email <email>', 'Admin email address')
        .option('-p, --plan <plan>', 'Subscription plan', 'standard')
        .option('--max-users <number>', 'Maximum users quota', '100')
        .option('--max-entities <number>', 'Maximum entities quota', '1000000')
        .option('--interactive', 'Use interactive prompts')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await createTenant(options, globalOpts);
    });
    // Suspend tenant
    tenantCmd
        .command('suspend <tenantId>')
        .description('Suspend a tenant (requires confirmation)')
        .option('-r, --reason <reason>', 'Suspension reason')
        .option('--force', 'Skip confirmation (dangerous)')
        .action(async (tenantId, options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await suspendTenant(tenantId, options, globalOpts);
    });
    // Reactivate tenant
    tenantCmd
        .command('reactivate <tenantId>')
        .description('Reactivate a suspended tenant')
        .action(async (tenantId, _options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await reactivateTenant(tenantId, globalOpts);
    });
    // Export tenant metadata
    tenantCmd
        .command('export-metadata <tenantId>')
        .description('Export tenant metadata and configuration')
        .option('-o, --output <file>', 'Output file path')
        .option('--include-users', 'Include user list')
        .option('--include-quotas', 'Include quota usage')
        .action(async (tenantId, options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await exportTenantMetadata(tenantId, options, globalOpts);
    });
    // Update tenant quotas
    tenantCmd
        .command('update-quotas <tenantId>')
        .description('Update tenant quotas')
        .option('--max-users <number>', 'Maximum users quota')
        .option('--max-entities <number>', 'Maximum entities quota')
        .option('--max-storage <bytes>', 'Maximum storage quota')
        .option('--api-rate-limit <number>', 'API rate limit (req/min)')
        .action(async (tenantId, options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await updateTenantQuotas(tenantId, options, globalOpts);
    });
    program.addCommand(tenantCmd);
}
/**
 * List all tenants
 */
async function listTenants(status, options) {
    const spinner = (0, ora_1.default)('Fetching tenants...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(options.profile, options.endpoint),
        token: (0, config_js_1.getToken)(options.profile, options.token),
    });
    try {
        const response = await apiClient.get('/admin/tenants');
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to fetch tenants: ${response.error?.message}`);
            process.exit(1);
        }
        let tenants = response.data?.items ?? getDefaultTenants();
        if (status) {
            tenants = tenants.filter((t) => t.status === status);
        }
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(tenants);
            return;
        }
        (0, output_js_1.printHeader)('Tenants');
        const tenantRows = tenants.map((t) => ({
            id: t.id,
            name: t.name,
            status: formatTenantStatus(t.status),
            createdAt: new Date(t.createdAt).toLocaleDateString(),
        }));
        (0, output_js_1.outputTable)(tenantRows);
    }
    catch (err) {
        spinner.fail('Failed to fetch tenants');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Get tenant details
 */
async function getTenant(tenantId, options) {
    const spinner = (0, ora_1.default)('Fetching tenant...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(options.profile, options.endpoint),
        token: (0, config_js_1.getToken)(options.profile, options.token),
    });
    try {
        const response = await apiClient.get(`/admin/tenants/${tenantId}`);
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to fetch tenant: ${response.error?.message}`);
            process.exit(1);
        }
        const tenant = response.data ?? getDefaultTenants()[0];
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(tenant);
            return;
        }
        (0, output_js_1.printHeader)(`Tenant: ${tenant.name}`);
        (0, output_js_1.outputKeyValue)({
            id: tenant.id,
            name: tenant.name,
            status: formatTenantStatus(tenant.status),
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt,
            quotas: tenant.quotas ?? {},
            metadata: tenant.metadata ?? {},
        });
    }
    catch (err) {
        spinner.fail('Failed to fetch tenant');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Create a new tenant
 */
async function createTenant(options, globalOpts) {
    let createOptions;
    if (options.interactive || (!options.name || !options.adminEmail)) {
        if (!(0, confirm_js_1.isInteractive)()) {
            (0, output_js_1.printError)('Interactive mode required. Provide --name and --admin-email options.');
            process.exit(1);
        }
        const answers = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Tenant name:',
                when: !options.name,
                validate: (input) => input.length > 0 || 'Name is required',
            },
            {
                type: 'input',
                name: 'adminEmail',
                message: 'Admin email:',
                when: !options.adminEmail,
                validate: (input) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) || 'Valid email required',
            },
            {
                type: 'list',
                name: 'plan',
                message: 'Subscription plan:',
                choices: ['starter', 'standard', 'enterprise'],
                default: 'standard',
                when: !options.plan,
            },
        ]);
        createOptions = {
            name: options.name ?? answers.name,
            adminEmail: options.adminEmail ?? answers.adminEmail,
            plan: options.plan ?? answers.plan,
            quotas: {
                maxUsers: parseInt(options.maxUsers ?? '100', 10),
                maxEntities: parseInt(options.maxEntities ?? '1000000', 10),
                maxStorage: 10 * 1024 * 1024 * 1024, // 10GB default
                apiRateLimit: 1000,
            },
        };
    }
    else {
        createOptions = {
            name: options.name,
            adminEmail: options.adminEmail,
            plan: options.plan ?? 'standard',
            quotas: {
                maxUsers: parseInt(options.maxUsers ?? '100', 10),
                maxEntities: parseInt(options.maxEntities ?? '1000000', 10),
                maxStorage: 10 * 1024 * 1024 * 1024,
                apiRateLimit: 1000,
            },
        };
    }
    if (globalOpts.dryRun) {
        (0, output_js_1.printDryRunBanner)();
        console.log(chalk_1.default.bold('Would create tenant:'));
        (0, output_js_1.outputKeyValue)(createOptions);
        return;
    }
    const spinner = (0, ora_1.default)('Creating tenant...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const response = await apiClient.post('/admin/tenants', createOptions);
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to create tenant: ${response.error?.message}`);
            process.exit(1);
        }
        const tenant = response.data;
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(tenant);
            return;
        }
        (0, output_js_1.printSuccess)(`Tenant created successfully!`);
        console.log();
        console.log(chalk_1.default.bold('Tenant ID:'), tenant?.id ?? 'new-tenant-id');
        console.log(chalk_1.default.gray('An invitation email has been sent to the admin.'));
    }
    catch (err) {
        spinner.fail('Failed to create tenant');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Suspend a tenant
 */
async function suspendTenant(tenantId, options, globalOpts) {
    if (!options.force) {
        (0, confirm_js_1.requireInteractive)('Tenant suspension');
        const confirmed = await (0, confirm_js_1.confirmWithPhrase)({
            message: `You are about to suspend tenant "${tenantId}". This will disable all access for users in this tenant.`,
            requireTypedConfirmation: true,
            typedConfirmationPhrase: confirm_js_1.CONFIRMATION_PHRASES.SUSPEND,
        });
        if (!confirmed) {
            (0, confirm_js_1.abort)();
        }
    }
    if (globalOpts.dryRun) {
        (0, output_js_1.printDryRunBanner)();
        console.log(chalk_1.default.bold('Would suspend tenant:'), tenantId);
        if (options.reason) {
            console.log(chalk_1.default.bold('Reason:'), options.reason);
        }
        return;
    }
    const spinner = (0, ora_1.default)('Suspending tenant...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const response = await apiClient.post(`/admin/tenants/${tenantId}/suspend`, {
            reason: options.reason ?? 'Administrative action',
        });
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to suspend tenant: ${response.error?.message}`);
            process.exit(1);
        }
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)({ success: true, tenantId, action: 'suspended' });
            return;
        }
        (0, output_js_1.printSuccess)(`Tenant "${tenantId}" has been suspended.`);
        (0, output_js_1.printWarning)('All users in this tenant will no longer be able to access the platform.');
    }
    catch (err) {
        spinner.fail('Failed to suspend tenant');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Reactivate a suspended tenant
 */
async function reactivateTenant(tenantId, globalOpts) {
    if (globalOpts.dryRun) {
        (0, output_js_1.printDryRunBanner)();
        console.log(chalk_1.default.bold('Would reactivate tenant:'), tenantId);
        return;
    }
    const spinner = (0, ora_1.default)('Reactivating tenant...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const response = await apiClient.post(`/admin/tenants/${tenantId}/reactivate`, {});
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to reactivate tenant: ${response.error?.message}`);
            process.exit(1);
        }
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)({ success: true, tenantId, action: 'reactivated' });
            return;
        }
        (0, output_js_1.printSuccess)(`Tenant "${tenantId}" has been reactivated.`);
    }
    catch (err) {
        spinner.fail('Failed to reactivate tenant');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Export tenant metadata
 */
async function exportTenantMetadata(tenantId, options, globalOpts) {
    const spinner = (0, ora_1.default)('Exporting tenant metadata...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const params = new URLSearchParams();
        if (options.includeUsers)
            params.append('includeUsers', 'true');
        if (options.includeQuotas)
            params.append('includeQuotas', 'true');
        const response = await apiClient.get(`/admin/tenants/${tenantId}/export?${params.toString()}`);
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to export tenant metadata: ${response.error?.message}`);
            process.exit(1);
        }
        const metadata = response.data ?? {
            tenant: getDefaultTenants()[0],
            exportedAt: new Date().toISOString(),
        };
        if (options.output) {
            const fs = await Promise.resolve().then(() => __importStar(require('node:fs/promises')));
            await fs.writeFile(options.output, JSON.stringify(metadata, null, 2));
            (0, output_js_1.printSuccess)(`Metadata exported to ${options.output}`);
        }
        else {
            (0, output_js_1.output)(metadata);
        }
    }
    catch (err) {
        spinner.fail('Failed to export tenant metadata');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Update tenant quotas
 */
async function updateTenantQuotas(tenantId, options, globalOpts) {
    const quotas = {};
    if (options.maxUsers)
        quotas.maxUsers = parseInt(options.maxUsers, 10);
    if (options.maxEntities)
        quotas.maxEntities = parseInt(options.maxEntities, 10);
    if (options.maxStorage)
        quotas.maxStorage = parseInt(options.maxStorage, 10);
    if (options.apiRateLimit)
        quotas.apiRateLimit = parseInt(options.apiRateLimit, 10);
    if (Object.keys(quotas).length === 0) {
        (0, output_js_1.printError)('No quota updates specified. Use --max-users, --max-entities, etc.');
        process.exit(1);
    }
    if (globalOpts.dryRun) {
        (0, output_js_1.printDryRunBanner)();
        console.log(chalk_1.default.bold('Would update quotas for tenant:'), tenantId);
        (0, output_js_1.outputKeyValue)(quotas);
        return;
    }
    const spinner = (0, ora_1.default)('Updating tenant quotas...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const response = await apiClient.put(`/admin/tenants/${tenantId}/quotas`, quotas);
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to update quotas: ${response.error?.message}`);
            process.exit(1);
        }
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)({ success: true, tenantId, quotas });
            return;
        }
        (0, output_js_1.printSuccess)(`Quotas updated for tenant "${tenantId}"`);
        (0, output_js_1.outputKeyValue)(quotas);
    }
    catch (err) {
        spinner.fail('Failed to update quotas');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Format tenant status with color
 */
function formatTenantStatus(status) {
    switch (status) {
        case 'active':
            return chalk_1.default.green('active');
        case 'suspended':
            return chalk_1.default.red('suspended');
        case 'pending':
            return chalk_1.default.yellow('pending');
        default:
            return chalk_1.default.gray(status);
    }
}
/**
 * Get default tenants for demo/fallback
 */
function getDefaultTenants() {
    return [
        {
            id: 'default',
            name: 'Default',
            status: 'active',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            quotas: {
                maxUsers: 100,
                maxEntities: 1000000,
                maxStorage: 10737418240,
                apiRateLimit: 1000,
            },
        },
        {
            id: 'enterprise',
            name: 'Enterprise',
            status: 'active',
            createdAt: '2024-01-15T00:00:00Z',
            updatedAt: '2024-01-15T00:00:00Z',
            quotas: {
                maxUsers: 1000,
                maxEntities: 10000000,
                maxStorage: 107374182400,
                apiRateLimit: 10000,
            },
        },
    ];
}
