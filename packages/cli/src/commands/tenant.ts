/**
 * Summit CLI Tenant Commands
 *
 * Tenant management commands.
 *
 * SOC 2 Controls: CC6.1 (Access Control)
 *
 * @module @summit/cli/commands/tenant
 */

import { Command } from "commander";
import chalk from "chalk";
import { get, put } from "../client.js";
import { formatOutput } from "../utils.js";

interface Tenant {
  id: string;
  name: string;
  status: string;
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
}

interface TenantSettings {
  maxUsers?: number;
  features?: string[];
  customPolicies?: boolean;
  ssoEnabled?: boolean;
  mfaRequired?: boolean;
}

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin?: string;
}

/**
 * Get tenant info
 */
const info = new Command("info")
  .description("Show current tenant information")
  .option("-f, --format <format>", "Output format (table, json)", "table")
  .action(async (options) => {
    const response = await get<Tenant>("/tenants/current");

    if (options.format === "json") {
      console.log(JSON.stringify(response.data, null, 2));
      return;
    }

    const tenant = response.data;
    console.log(chalk.bold("\nTenant Information\n"));
    console.log(`ID:      ${tenant.id}`);
    console.log(`Name:    ${tenant.name}`);
    console.log(`Status:  ${tenant.status}`);
    console.log(`Created: ${tenant.createdAt}`);
    console.log(`Updated: ${tenant.updatedAt}`);

    if (tenant.settings) {
      console.log(chalk.bold("\nSettings:"));
      if (tenant.settings.maxUsers) {
        console.log(`  Max Users:       ${tenant.settings.maxUsers}`);
      }
      if (tenant.settings.features?.length) {
        console.log(`  Features:        ${tenant.settings.features.join(", ")}`);
      }
      console.log(`  Custom Policies: ${tenant.settings.customPolicies ? "Enabled" : "Disabled"}`);
      console.log(`  SSO:             ${tenant.settings.ssoEnabled ? "Enabled" : "Disabled"}`);
      console.log(`  MFA Required:    ${tenant.settings.mfaRequired ? "Yes" : "No"}`);
    }
  });

/**
 * List tenant users
 */
const users = new Command("users")
  .description("List users in the tenant")
  .option("-r, --role <role>", "Filter by role")
  .option("-s, --status <status>", "Filter by status")
  .option("-f, --format <format>", "Output format (table, json)", "table")
  .action(async (options) => {
    const params: Record<string, string> = {};
    if (options.role) params.role = options.role;
    if (options.status) params.status = options.status;

    const response = await get<User[]>("/users", params);

    if (options.format === "json") {
      console.log(JSON.stringify(response.data, null, 2));
      return;
    }

    if (response.data.length === 0) {
      console.log(chalk.yellow("No users found."));
      return;
    }

    console.log(chalk.bold("\nTenant Users\n"));
    console.log(formatOutput(response.data, ["id", "email", "username", "role", "status"]));
  });

/**
 * Update tenant settings
 */
const settings = new Command("settings")
  .description("Update tenant settings")
  .option("--max-users <number>", "Maximum users allowed")
  .option("--custom-policies <boolean>", "Enable custom policies")
  .option("--sso <boolean>", "Enable SSO")
  .option("--mfa <boolean>", "Require MFA")
  .option("--add-feature <feature>", "Add a feature flag")
  .option("--remove-feature <feature>", "Remove a feature flag")
  .action(async (options) => {
    // First get current settings
    const current = await get<Tenant>("/tenants/current");
    const newSettings: TenantSettings = { ...current.data.settings };

    if (options.maxUsers) {
      newSettings.maxUsers = parseInt(options.maxUsers, 10);
    }
    if (options.customPolicies !== undefined) {
      newSettings.customPolicies = options.customPolicies === "true";
    }
    if (options.sso !== undefined) {
      newSettings.ssoEnabled = options.sso === "true";
    }
    if (options.mfa !== undefined) {
      newSettings.mfaRequired = options.mfa === "true";
    }
    if (options.addFeature) {
      newSettings.features = [...(newSettings.features || []), options.addFeature];
    }
    if (options.removeFeature) {
      newSettings.features = (newSettings.features || []).filter(
        (f) => f !== options.removeFeature
      );
    }

    const response = await put<Tenant>("/tenants/current/settings", newSettings);
    console.log(chalk.green("\nTenant settings updated successfully."));

    console.log(chalk.bold("\nNew Settings:"));
    console.log(JSON.stringify(response.data.settings, null, 2));
  });

export const tenantCommands = {
  info,
  users,
  settings,
};
