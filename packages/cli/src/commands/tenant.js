"use strict";
/**
 * Summit CLI Tenant Commands
 *
 * Tenant management commands.
 *
 * SOC 2 Controls: CC6.1 (Access Control)
 *
 * @module @summit/cli/commands/tenant
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantCommands = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const client_js_1 = require("../client.js");
const utils_js_1 = require("../utils.js");
/**
 * Get tenant info
 */
const info = new commander_1.Command('info')
    .description('Show current tenant information')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action(async (options) => {
    const response = await (0, client_js_1.get)('/tenants/current');
    if (options.format === 'json') {
        console.log(JSON.stringify(response.data, null, 2));
        return;
    }
    const tenant = response.data;
    console.log(chalk_1.default.bold('\nTenant Information\n'));
    console.log(`ID:      ${tenant.id}`);
    console.log(`Name:    ${tenant.name}`);
    console.log(`Status:  ${tenant.status}`);
    console.log(`Created: ${tenant.createdAt}`);
    console.log(`Updated: ${tenant.updatedAt}`);
    if (tenant.settings) {
        console.log(chalk_1.default.bold('\nSettings:'));
        if (tenant.settings.maxUsers) {
            console.log(`  Max Users:       ${tenant.settings.maxUsers}`);
        }
        if (tenant.settings.features?.length) {
            console.log(`  Features:        ${tenant.settings.features.join(', ')}`);
        }
        console.log(`  Custom Policies: ${tenant.settings.customPolicies ? 'Enabled' : 'Disabled'}`);
        console.log(`  SSO:             ${tenant.settings.ssoEnabled ? 'Enabled' : 'Disabled'}`);
        console.log(`  MFA Required:    ${tenant.settings.mfaRequired ? 'Yes' : 'No'}`);
    }
});
/**
 * List tenant users
 */
const users = new commander_1.Command('users')
    .description('List users in the tenant')
    .option('-r, --role <role>', 'Filter by role')
    .option('-s, --status <status>', 'Filter by status')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .action(async (options) => {
    const params = {};
    if (options.role)
        params.role = options.role;
    if (options.status)
        params.status = options.status;
    const response = await (0, client_js_1.get)('/users', params);
    if (options.format === 'json') {
        console.log(JSON.stringify(response.data, null, 2));
        return;
    }
    if (response.data.length === 0) {
        console.log(chalk_1.default.yellow('No users found.'));
        return;
    }
    console.log(chalk_1.default.bold('\nTenant Users\n'));
    console.log((0, utils_js_1.formatOutput)(response.data, ['id', 'email', 'username', 'role', 'status']));
});
/**
 * Update tenant settings
 */
const settings = new commander_1.Command('settings')
    .description('Update tenant settings')
    .option('--max-users <number>', 'Maximum users allowed')
    .option('--custom-policies <boolean>', 'Enable custom policies')
    .option('--sso <boolean>', 'Enable SSO')
    .option('--mfa <boolean>', 'Require MFA')
    .option('--add-feature <feature>', 'Add a feature flag')
    .option('--remove-feature <feature>', 'Remove a feature flag')
    .action(async (options) => {
    // First get current settings
    const current = await (0, client_js_1.get)('/tenants/current');
    const newSettings = { ...current.data.settings };
    if (options.maxUsers) {
        newSettings.maxUsers = parseInt(options.maxUsers, 10);
    }
    if (options.customPolicies !== undefined) {
        newSettings.customPolicies = options.customPolicies === 'true';
    }
    if (options.sso !== undefined) {
        newSettings.ssoEnabled = options.sso === 'true';
    }
    if (options.mfa !== undefined) {
        newSettings.mfaRequired = options.mfa === 'true';
    }
    if (options.addFeature) {
        newSettings.features = [...(newSettings.features || []), options.addFeature];
    }
    if (options.removeFeature) {
        newSettings.features = (newSettings.features || []).filter(f => f !== options.removeFeature);
    }
    const response = await (0, client_js_1.put)('/tenants/current/settings', newSettings);
    console.log(chalk_1.default.green('\nTenant settings updated successfully.'));
    console.log(chalk_1.default.bold('\nNew Settings:'));
    console.log(JSON.stringify(response.data.settings, null, 2));
});
exports.tenantCommands = {
    info,
    users,
    settings,
};
