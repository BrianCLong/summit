/**
 * Summit CLI Policy Commands
 *
 * Policy management commands.
 *
 * SOC 2 Controls: CC6.1 (Access Control)
 *
 * @module @summit/cli/commands/policy
 */

import { Command } from "commander";
import chalk from "chalk";
import { get, post, put, del } from "../client.js";
import { formatOutput } from "../utils.js";

interface Policy {
  id: string;
  name: string;
  description: string;
  version: number;
  status: string;
  rules: PolicyRule[];
  createdAt: string;
  updatedAt: string;
}

interface PolicyRule {
  id: string;
  condition: string;
  action: string;
  priority: number;
}

interface SimulationResult {
  verdict: string;
  matchedRules: string[];
  evaluationPath: string[];
  executionTime: number;
}

/**
 * List policies
 */
const list = new Command("list")
  .description("List all policies")
  .option("-s, --status <status>", "Filter by status (active, draft, archived)")
  .option("-f, --format <format>", "Output format (table, json)", "table")
  .action(async (options) => {
    const params: Record<string, string> = {};
    if (options.status) params.status = options.status;

    const response = await get<Policy[]>("/policies", params);

    if (options.format === "json") {
      console.log(JSON.stringify(response.data, null, 2));
      return;
    }

    if (response.data.length === 0) {
      console.log(chalk.yellow("No policies found."));
      return;
    }

    console.log(chalk.bold("\nPolicies\n"));
    console.log(formatOutput(response.data, ["id", "name", "status", "version", "updatedAt"]));
  });

/**
 * Get policy details
 */
const getPolicy = new Command("get")
  .description("Get policy details")
  .argument("<id>", "Policy ID")
  .option("-f, --format <format>", "Output format (table, json)", "table")
  .action(async (id, options) => {
    const response = await get<Policy>(`/policies/${id}`);

    if (options.format === "json") {
      console.log(JSON.stringify(response.data, null, 2));
      return;
    }

    const policy = response.data;
    console.log(chalk.bold(`\nPolicy: ${policy.name}\n`));
    console.log(`ID:          ${policy.id}`);
    console.log(`Description: ${policy.description}`);
    console.log(`Status:      ${policy.status}`);
    console.log(`Version:     ${policy.version}`);
    console.log(`Created:     ${policy.createdAt}`);
    console.log(`Updated:     ${policy.updatedAt}`);
    console.log(chalk.bold("\nRules:\n"));

    policy.rules.forEach((rule, i) => {
      console.log(`  ${i + 1}. [${rule.action.toUpperCase()}] ${rule.condition}`);
      console.log(`     Priority: ${rule.priority}`);
    });
  });

/**
 * Create policy
 */
const create = new Command("create")
  .description("Create a new policy")
  .requiredOption("-n, --name <name>", "Policy name")
  .option("-d, --description <desc>", "Policy description")
  .option("-r, --rules <json>", "Rules as JSON array")
  .option("--file <path>", "Load policy from JSON file")
  .action(async (options) => {
    let policyData: Partial<Policy>;

    if (options.file) {
      const { readFileSync } = await import("fs");
      policyData = JSON.parse(readFileSync(options.file, "utf-8"));
    } else {
      policyData = {
        name: options.name,
        description: options.description || "",
        rules: options.rules ? JSON.parse(options.rules) : [],
      };
    }

    const response = await post<Policy>("/policies", policyData);
    console.log(chalk.green(`\nPolicy created: ${response.data.id}`));
  });

/**
 * Update policy
 */
const update = new Command("update")
  .description("Update a policy")
  .argument("<id>", "Policy ID")
  .option("-n, --name <name>", "Policy name")
  .option("-d, --description <desc>", "Policy description")
  .option("-r, --rules <json>", "Rules as JSON array")
  .action(async (id, options) => {
    const updates: Partial<Policy> = {};
    if (options.name) updates.name = options.name;
    if (options.description) updates.description = options.description;
    if (options.rules) updates.rules = JSON.parse(options.rules);

    const response = await put<Policy>(`/policies/${id}`, updates);
    console.log(
      chalk.green(`\nPolicy updated: ${response.data.id} (version ${response.data.version})`)
    );
  });

/**
 * Delete policy
 */
const deletePolicy = new Command("delete")
  .description("Delete a policy")
  .argument("<id>", "Policy ID")
  .option("-y, --yes", "Skip confirmation")
  .action(async (id, options) => {
    if (!options.yes) {
      const readline = await import("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question(chalk.yellow(`Delete policy ${id}? (y/N) `), resolve);
      });
      rl.close();

      if (answer.toLowerCase() !== "y") {
        console.log("Cancelled.");
        return;
      }
    }

    await del(`/policies/${id}`);
    console.log(chalk.green(`\nPolicy deleted: ${id}`));
  });

/**
 * Simulate policy
 */
const simulate = new Command("simulate")
  .description("Simulate policy evaluation")
  .option("-p, --policy <id>", "Policy ID to simulate")
  .option("-c, --context <json>", "Evaluation context as JSON")
  .option("-r, --resource <json>", "Resource to evaluate as JSON")
  .option("--rules <json>", "Ad-hoc rules to test")
  .action(async (options) => {
    const request: any = {};

    if (options.policy) {
      request.policyId = options.policy;
    }
    if (options.rules) {
      request.rules = JSON.parse(options.rules);
    }
    if (options.context) {
      request.context = JSON.parse(options.context);
    }
    if (options.resource) {
      request.resource = JSON.parse(options.resource);
    }

    const response = await post<SimulationResult>("/policies/simulate", request);
    const result = response.data;

    console.log(chalk.bold("\nSimulation Result\n"));

    const verdictColor =
      result.verdict === "ALLOW"
        ? chalk.green
        : result.verdict === "DENY"
          ? chalk.red
          : chalk.yellow;
    console.log(`Verdict:        ${verdictColor(result.verdict)}`);
    console.log(`Execution Time: ${result.executionTime}ms`);

    if (result.matchedRules.length > 0) {
      console.log(chalk.bold("\nMatched Rules:"));
      result.matchedRules.forEach((rule) => console.log(`  - ${rule}`));
    }

    if (result.evaluationPath.length > 0) {
      console.log(chalk.bold("\nEvaluation Path:"));
      result.evaluationPath.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
    }
  });

/**
 * Activate policy
 */
const activate = new Command("activate")
  .description("Activate a policy")
  .argument("<id>", "Policy ID")
  .action(async (id) => {
    const response = await post<Policy>(`/policies/${id}/activate`, {});
    console.log(chalk.green(`\nPolicy activated: ${response.data.id}`));
  });

/**
 * Archive policy
 */
const archive = new Command("archive")
  .description("Archive a policy")
  .argument("<id>", "Policy ID")
  .action(async (id) => {
    const response = await post<Policy>(`/policies/${id}/archive`, {});
    console.log(chalk.green(`\nPolicy archived: ${response.data.id}`));
  });

export const policyCommands = {
  list,
  get: getPolicy,
  create,
  update,
  delete: deletePolicy,
  simulate,
  activate,
  archive,
};
