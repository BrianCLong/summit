/**
 * Summit CLI Config Commands
 *
 * Configuration management commands.
 *
 * @module @summit/cli/commands/config
 */

import { Command } from "commander";
import chalk from "chalk";
import {
  loadConfig,
  saveConfig,
  getConfig,
  getConfigValue,
  setConfigValue,
  clearConfig,
  type CLIConfig,
} from "../config.js";

/**
 * Initialize configuration
 */
const init = new Command("init")
  .description("Initialize CLI configuration")
  .option("--url <url>", "Summit API URL")
  .option("--tenant <tenantId>", "Default tenant ID")
  .option("--format <format>", "Default output format (table, json)")
  .action(async (options) => {
    console.log(chalk.bold("\nSummit CLI Configuration\n"));

    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (prompt: string, defaultValue?: string): Promise<string> => {
      return new Promise((resolve) => {
        const fullPrompt = defaultValue ? `${prompt} [${defaultValue}]: ` : `${prompt}: `;
        rl.question(fullPrompt, (answer) => {
          resolve(answer || defaultValue || "");
        });
      });
    };

    try {
      await loadConfig();
      const current = getConfig();

      const baseUrl =
        options.url ||
        (await question("API URL", current.baseUrl || "https://api.summit.example.com"));
      const tenantId = options.tenant || (await question("Tenant ID", current.tenantId));
      const outputFormat =
        options.format ||
        (await question("Output format (table/json)", current.outputFormat || "table"));

      await saveConfig({
        baseUrl,
        tenantId: tenantId || undefined,
        outputFormat: outputFormat as "table" | "json",
      });

      console.log(chalk.green("\nConfiguration saved successfully!"));
      console.log(`\nConfiguration stored in: ~/.summit/config.json`);
      console.log(`\nRun 'summit login' to authenticate.`);
    } finally {
      rl.close();
    }
  });

/**
 * Set configuration value
 */
const set = new Command("set")
  .description("Set a configuration value")
  .argument("<key>", "Configuration key")
  .argument("<value>", "Configuration value")
  .action(async (key, value) => {
    await loadConfig();

    const validKeys: (keyof CLIConfig)[] = ["baseUrl", "tenantId", "outputFormat", "apiKey"];
    if (!validKeys.includes(key as keyof CLIConfig)) {
      console.error(chalk.red(`Invalid key: ${key}`));
      console.log(`Valid keys: ${validKeys.join(", ")}`);
      process.exit(1);
    }

    await setConfigValue(key as keyof CLIConfig, value);
    console.log(chalk.green(`Set ${key} = ${value}`));
  });

/**
 * Get configuration value
 */
const getCmd = new Command("get")
  .description("Get a configuration value")
  .argument("<key>", "Configuration key")
  .action(async (key) => {
    await loadConfig();

    const value = getConfigValue(key as keyof CLIConfig);
    if (value === undefined) {
      console.log(chalk.yellow(`${key} is not set`));
    } else {
      // Mask sensitive values
      if (key === "token" || key === "apiKey") {
        console.log(`${key} = ${value.substring(0, 8)}...`);
      } else {
        console.log(`${key} = ${value}`);
      }
    }
  });

/**
 * List all configuration
 */
const list = new Command("list")
  .description("List all configuration values")
  .option("--show-secrets", "Show sensitive values")
  .action(async (options) => {
    await loadConfig();
    const config = getConfig();

    console.log(chalk.bold("\nCurrent Configuration\n"));

    const entries = Object.entries(config);
    if (entries.length === 0) {
      console.log(chalk.yellow("No configuration set. Run `summit config init` to configure."));
      return;
    }

    entries.forEach(([key, value]) => {
      if (!value) return;

      // Mask sensitive values unless --show-secrets is set
      if ((key === "token" || key === "apiKey") && !options.showSecrets) {
        console.log(`${key.padEnd(15)} = ${String(value).substring(0, 8)}...`);
      } else {
        console.log(`${key.padEnd(15)} = ${value}`);
      }
    });

    // Show environment variable overrides
    const envOverrides: string[] = [];
    if (process.env.SUMMIT_API_URL) envOverrides.push("SUMMIT_API_URL");
    if (process.env.SUMMIT_API_KEY) envOverrides.push("SUMMIT_API_KEY");
    if (process.env.SUMMIT_TENANT_ID) envOverrides.push("SUMMIT_TENANT_ID");
    if (process.env.SUMMIT_TOKEN) envOverrides.push("SUMMIT_TOKEN");

    if (envOverrides.length > 0) {
      console.log(chalk.dim(`\nEnvironment overrides: ${envOverrides.join(", ")}`));
    }
  });

/**
 * Clear configuration
 */
const clear = new Command("clear")
  .description("Clear all configuration")
  .option("-y, --yes", "Skip confirmation")
  .action(async (options) => {
    if (!options.yes) {
      const readline = await import("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question(chalk.yellow("Clear all configuration? (y/N) "), resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== "y") {
        console.log("Cancelled.");
        return;
      }
    }

    await clearConfig();
    console.log(chalk.green("Configuration cleared."));
  });

export const configCommands = {
  init,
  set,
  get: getCmd,
  list,
  clear,
};
