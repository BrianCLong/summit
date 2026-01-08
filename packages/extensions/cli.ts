#!/usr/bin/env node
/**
 * Summit Extensions CLI
 *
 * Command-line tool for managing extensions.
 */

import { Command } from "commander";
import * as path from "path";
import { ExtensionManager } from "./src/manager.js";
import { ExtensionInstaller } from "./src/installer.js";

const program = new Command();

program.name("summit-ext").description("Summit extensions management CLI").version("0.1.0");

// List extensions
program
  .command("list")
  .description("List all extensions")
  .option("-v, --verbose", "Show detailed information")
  .action(async (options) => {
    const manager = createManager();
    await manager.initialize();

    const registry = manager.getRegistry();
    const extensions = registry.getAll();

    if (options.verbose) {
      console.log("\nExtensions:");
      for (const ext of extensions) {
        console.log(`\n${ext.manifest.displayName} (${ext.manifest.name}@${ext.manifest.version})`);
        console.log(`  Type: ${ext.manifest.type}`);
        console.log(
          `  Status: ${ext.loaded ? "✓ loaded" : ext.error ? "✗ failed" : "○ not loaded"}`
        );
        console.log(`  Capabilities: ${ext.manifest.capabilities.join(", ")}`);
        console.log(`  Path: ${ext.path}`);
        if (ext.error) {
          console.log(`  Error: ${ext.error}`);
        }
      }
    } else {
      console.log("\nExtensions:");
      for (const ext of extensions) {
        const status = ext.loaded ? "✓" : ext.error ? "✗" : "○";
        console.log(`  ${status} ${ext.manifest.name}@${ext.manifest.version}`);
      }
    }

    const stats = manager.getStats();
    console.log(`\nTotal: ${stats.total} | Loaded: ${stats.loaded} | Failed: ${stats.failed}`);
  });

// Show extension details
program
  .command("show <name>")
  .description("Show extension details")
  .action(async (name) => {
    const manager = createManager();
    await manager.initialize();

    const registry = manager.getRegistry();
    const ext = registry.get(name);

    if (!ext) {
      console.error(`Extension ${name} not found`);
      process.exit(1);
    }

    const { manifest } = ext;

    console.log(`\n${manifest.displayName} (${manifest.name}@${manifest.version})`);
    console.log(`Description: ${manifest.description}`);
    if (manifest.author) console.log(`Author: ${manifest.author}`);
    if (manifest.license) console.log(`License: ${manifest.license}`);
    console.log(`Type: ${manifest.type}`);
    console.log(`Status: ${ext.loaded ? "loaded" : ext.error ? "failed" : "not loaded"}`);
    console.log(`\nCapabilities:`);
    for (const cap of manifest.capabilities) {
      console.log(`  - ${cap}`);
    }
    console.log(`\nPermissions:`);
    for (const perm of manifest.permissions) {
      console.log(`  - ${perm}`);
    }
    console.log(`\nPath: ${ext.path}`);
    if (ext.error) {
      console.log(`\nError: ${ext.error}`);
    }
  });

// Reload extensions
program
  .command("reload")
  .description("Reload all extensions")
  .action(async () => {
    const manager = createManager();
    await manager.initialize();
    await manager.reload();
    console.log("Extensions reloaded");
  });

// Install extension
program
  .command("install <path>")
  .description("Install an extension from a path")
  .action(async (extensionPath) => {
    const installer = createInstaller();
    try {
      const manifest = await installer.install(extensionPath);
      console.log(
        `Installed ${manifest.displayName || manifest.name} (${manifest.name}@${manifest.version}) into ${installer.getInstallDir()}`
      );
    } catch (err) {
      console.error("Failed to install extension:", err);
      process.exit(1);
    }
  });

program
  .command("rollback <name> <version>")
  .description("Rollback an extension to a backup version")
  .action(async (name, version) => {
    const installer = createInstaller();
    await installer.rollback(name, version);
    console.log(`Rolled back ${name} to backup version ${version}`);
  });

program
  .command("uninstall <name>")
  .description("Uninstall an extension and verify cleanup")
  .action(async (name) => {
    const installer = createInstaller();
    await installer.uninstall(name);
    console.log(`Uninstalled ${name}`);
  });

// Stats
program
  .command("stats")
  .description("Show extension statistics")
  .action(async () => {
    const manager = createManager();
    await manager.initialize();

    const stats = manager.getStats();

    console.log("\nExtension Statistics:");
    console.log(`  Total: ${stats.total}`);
    console.log(`  Loaded: ${stats.loaded}`);
    console.log(`  Enabled: ${stats.enabled}`);
    console.log(`  Failed: ${stats.failed}`);

    console.log("\nBy Type:");
    for (const [type, count] of Object.entries(stats.byType)) {
      console.log(`  ${type}: ${count}`);
    }

    console.log("\nIntegrations:");
    console.log(`  Copilot Tools: ${stats.copilot.tools}`);
    console.log(`  Copilot Skills: ${stats.copilot.skills}`);
    console.log(`  UI Commands: ${stats.ui.commands}`);
    console.log(`  UI Widgets: ${stats.ui.widgets}`);
    console.log(`  CLI Commands: ${stats.cli.commands}`);
  });

// Execute extension command
program
  .command("exec <name:command> [args...]")
  .description("Execute an extension command")
  .action(async (nameCommand, args) => {
    const [name, command] = nameCommand.split(":");

    const manager = createManager();
    await manager.initialize();

    const fullCommandName = `${name}:${command}`;

    try {
      const result = await manager.cli.executeCommand(fullCommandName, args);
      console.log(result);
    } catch (err) {
      console.error("Command failed:", err);
      process.exit(1);
    }
  });

/**
 * Create extension manager with default configuration
 */
function createManager(): ExtensionManager {
  const cwd = process.cwd();

  return new ExtensionManager({
    extensionDirs: [path.join(cwd, "extensions"), path.join(cwd, "extensions/examples")],
    configPath: path.join(cwd, ".summit/extensions/config"),
    storagePath: path.join(cwd, ".summit/extensions/storage"),
    enablePolicy: process.env.OPA_URL !== undefined,
    opaUrl: process.env.OPA_URL,
  });
}

function createInstaller(): ExtensionInstaller {
  const cwd = process.cwd();
  return new ExtensionInstaller({
    installDir: path.join(cwd, "extensions"),
    auditFile: path.join(cwd, ".summit/extensions/audit.log"),
  });
}

program.parse();
