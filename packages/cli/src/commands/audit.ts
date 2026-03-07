/**
 * Summit CLI Audit Commands
 *
 * Audit log commands.
 *
 * SOC 2 Controls: CC7.2 (Monitoring), CC7.3 (Evaluation)
 *
 * @module @summit/cli/commands/audit
 */

import { Command } from "commander";
import chalk from "chalk";
import { get } from "../client.js";
import { formatOutput, formatDate } from "../utils.js";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  tenantId: string;
  action: string;
  resource: {
    type: string;
    id: string;
  };
  outcome: "success" | "failure" | "denied";
  verdict?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Query audit logs
 */
const logs = new Command("logs")
  .description("Query audit logs")
  .option("--start <date>", "Start date (ISO format)")
  .option("--end <date>", "End date (ISO format)")
  .option("-u, --user <userId>", "Filter by user ID")
  .option("-a, --action <action>", "Filter by action")
  .option("-r, --resource <type>", "Filter by resource type")
  .option("-o, --outcome <outcome>", "Filter by outcome (success, failure, denied)")
  .option("-l, --limit <number>", "Maximum entries to return", "50")
  .option("--offset <number>", "Offset for pagination", "0")
  .option("-f, --format <format>", "Output format (table, json)", "table")
  .action(async (options) => {
    const params: Record<string, string> = {
      limit: options.limit,
      offset: options.offset,
    };

    if (options.start) params.startDate = options.start;
    if (options.end) params.endDate = options.end;
    if (options.user) params.userId = options.user;
    if (options.action) params.action = options.action;
    if (options.resource) params.resourceType = options.resource;
    if (options.outcome) params.outcome = options.outcome;

    const response = await get<AuditLogEntry[]>("/audit/logs", params);

    if (options.format === "json") {
      console.log(JSON.stringify(response.data, null, 2));
      return;
    }

    if (response.data.length === 0) {
      console.log(chalk.yellow("No audit entries found."));
      return;
    }

    console.log(chalk.bold("\nAudit Log Entries\n"));

    // Format for table display
    const displayData = response.data.map((entry) => ({
      id: entry.id.substring(0, 8),
      timestamp: formatDate(entry.timestamp),
      user: entry.userId.substring(0, 8),
      action: entry.action,
      resource: `${entry.resource.type}/${entry.resource.id.substring(0, 8)}`,
      outcome: entry.outcome,
      verdict: entry.verdict || "-",
    }));

    console.log(
      formatOutput(displayData, [
        "id",
        "timestamp",
        "user",
        "action",
        "resource",
        "outcome",
        "verdict",
      ])
    );
    console.log(`\nShowing ${response.data.length} entries (offset: ${options.offset})`);
  });

/**
 * Export audit logs
 */
const exportCmd = new Command("export")
  .description("Export audit logs to file")
  .option(
    "--start <date>",
    "Start date (ISO format)",
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  )
  .option("--end <date>", "End date (ISO format)", new Date().toISOString())
  .option("-u, --user <userId>", "Filter by user ID")
  .option("-a, --action <action>", "Filter by action")
  .option("--format <format>", "Export format (json, csv)", "json")
  .option("-o, --output <path>", "Output file path")
  .action(async (options) => {
    const params: Record<string, string> = {
      startDate: options.start,
      endDate: options.end,
      limit: "10000", // Max export limit
    };

    if (options.user) params.userId = options.user;
    if (options.action) params.action = options.action;

    console.log(chalk.blue("Fetching audit logs..."));
    const response = await get<AuditLogEntry[]>("/audit/logs", params);

    let output: string;
    let filename: string;

    if (options.format === "csv") {
      // Convert to CSV
      const headers = [
        "id",
        "timestamp",
        "userId",
        "action",
        "resourceType",
        "resourceId",
        "outcome",
        "verdict",
        "ipAddress",
      ];
      const rows = response.data.map((entry) =>
        [
          entry.id,
          entry.timestamp,
          entry.userId,
          entry.action,
          entry.resource.type,
          entry.resource.id,
          entry.outcome,
          entry.verdict || "",
          entry.ipAddress || "",
        ]
          .map((v) => `"${v}"`)
          .join(",")
      );

      output = [headers.join(","), ...rows].join("\n");
      filename = options.output || `audit-export-${new Date().toISOString().split("T")[0]}.csv`;
    } else {
      output = JSON.stringify(response.data, null, 2);
      filename = options.output || `audit-export-${new Date().toISOString().split("T")[0]}.json`;
    }

    const { writeFileSync } = await import("fs");
    writeFileSync(filename, output);

    console.log(chalk.green(`\nExported ${response.data.length} entries to ${filename}`));
  });

export const auditCommands = {
  logs,
  export: exportCmd,
};
