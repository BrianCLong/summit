/**
 * Summit CLI Compliance Commands
 *
 * Compliance management commands.
 *
 * SOC 2 Controls: CC4.1 (Monitoring), CC4.2 (Evidence)
 *
 * @module @summit/cli/commands/compliance
 */

import { Command } from "commander";
import chalk from "chalk";
import { get, post } from "../client.js";
import { formatOutput, formatDate } from "../utils.js";

type ComplianceFramework = "SOC2" | "ISO27001" | "GDPR" | "HIPAA";

interface ComplianceSummary {
  framework: ComplianceFramework;
  overallScore: number;
  status: string;
  controlSummary: {
    compliant: number;
    partial: number;
    nonCompliant: number;
    notAssessed: number;
  };
  categoryBreakdown: Array<{
    category: string;
    score: number;
    status: string;
  }>;
}

interface Control {
  id: string;
  name: string;
  description: string;
  category: string;
  requirement: string;
  frequency: string;
  framework: ComplianceFramework;
}

interface ControlAssessment {
  controlId: string;
  status: string;
  score: number;
  findings: string[];
  evidence: string[];
  assessedAt: string;
  assessedBy: string;
}

interface Evidence {
  id: string;
  controlId: string;
  framework: ComplianceFramework;
  type: string;
  source: string;
  status: string;
  collectedAt: string;
}

/**
 * Get compliance summary
 */
const summary = new Command("summary")
  .description("Get compliance summary for a framework")
  .argument("[framework]", "Framework (SOC2, ISO27001, GDPR, HIPAA)", "SOC2")
  .option("-f, --format <format>", "Output format (table, json)", "table")
  .action(async (framework, options) => {
    const response = await get<ComplianceSummary>(`/compliance/frameworks/${framework}/summary`);

    if (options.format === "json") {
      console.log(JSON.stringify(response.data, null, 2));
      return;
    }

    const s = response.data;

    console.log(chalk.bold(`\n${framework} Compliance Summary\n`));

    // Overall score with color
    const scoreColor =
      s.overallScore >= 80 ? chalk.green : s.overallScore >= 60 ? chalk.yellow : chalk.red;
    console.log(`Overall Score: ${scoreColor(s.overallScore + "%")}`);
    console.log(`Status:        ${s.status}`);

    console.log(chalk.bold("\nControl Summary:"));
    console.log(`  ${chalk.green("✓")} Compliant:     ${s.controlSummary.compliant}`);
    console.log(`  ${chalk.yellow("◐")} Partial:       ${s.controlSummary.partial}`);
    console.log(`  ${chalk.red("✗")} Non-Compliant: ${s.controlSummary.nonCompliant}`);
    console.log(`  ${chalk.gray("○")} Not Assessed:  ${s.controlSummary.notAssessed}`);

    if (s.categoryBreakdown?.length > 0) {
      console.log(chalk.bold("\nCategory Breakdown:"));
      s.categoryBreakdown.forEach((cat) => {
        const catColor = cat.score >= 80 ? chalk.green : cat.score >= 60 ? chalk.yellow : chalk.red;
        const bar =
          "█".repeat(Math.floor(cat.score / 5)) + "░".repeat(20 - Math.floor(cat.score / 5));
        console.log(`  ${cat.category.padEnd(25)} ${bar} ${catColor(cat.score + "%")}`);
      });
    }
  });

/**
 * List controls
 */
const controls = new Command("controls")
  .description("List controls for a framework")
  .argument("[framework]", "Framework (SOC2, ISO27001, GDPR, HIPAA)", "SOC2")
  .option("-c, --category <category>", "Filter by category")
  .option("-f, --format <format>", "Output format (table, json)", "table")
  .action(async (framework, options) => {
    const params: Record<string, string> = {};
    if (options.category) params.category = options.category;

    const response = await get<Control[]>(`/compliance/frameworks/${framework}/controls`, params);

    if (options.format === "json") {
      console.log(JSON.stringify(response.data, null, 2));
      return;
    }

    if (response.data.length === 0) {
      console.log(chalk.yellow("No controls found."));
      return;
    }

    console.log(chalk.bold(`\n${framework} Controls\n`));
    console.log(formatOutput(response.data, ["id", "name", "category", "frequency"]));
  });

/**
 * Assess a control
 */
const assess = new Command("assess")
  .description("Trigger assessment for a control")
  .argument("<framework>", "Framework (SOC2, ISO27001, GDPR, HIPAA)")
  .argument("<controlId>", "Control ID to assess")
  .option("-f, --format <format>", "Output format (table, json)", "table")
  .action(async (framework, controlId, options) => {
    console.log(chalk.blue(`Assessing control ${controlId}...`));

    const response = await post<ControlAssessment>(
      `/compliance/frameworks/${framework}/assess/${controlId}`,
      {}
    );

    if (options.format === "json") {
      console.log(JSON.stringify(response.data, null, 2));
      return;
    }

    const a = response.data;

    console.log(chalk.bold(`\nAssessment Result for ${controlId}\n`));

    const statusColor =
      a.status === "compliant" ? chalk.green : a.status === "partial" ? chalk.yellow : chalk.red;
    console.log(`Status: ${statusColor(a.status)}`);
    console.log(`Score:  ${a.score}%`);

    if (a.findings.length > 0) {
      console.log(chalk.bold("\nFindings:"));
      a.findings.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    }

    if (a.evidence.length > 0) {
      console.log(chalk.bold("\nEvidence Collected:"));
      a.evidence.forEach((e) => console.log(`  - ${e}`));
    }
  });

/**
 * List evidence
 */
const evidence = new Command("evidence")
  .description("List compliance evidence")
  .option("--framework <framework>", "Filter by framework")
  .option("--control <controlId>", "Filter by control ID")
  .option("--type <type>", "Filter by type")
  .option("--status <status>", "Filter by status")
  .option("-f, --format <format>", "Output format (table, json)", "table")
  .action(async (options) => {
    const params: Record<string, string> = {};
    if (options.framework) params.framework = options.framework;
    if (options.control) params.controlId = options.control;
    if (options.type) params.type = options.type;
    if (options.status) params.status = options.status;

    const response = await get<Evidence[]>("/compliance/evidence", params);

    if (options.format === "json") {
      console.log(JSON.stringify(response.data, null, 2));
      return;
    }

    if (response.data.length === 0) {
      console.log(chalk.yellow("No evidence found."));
      return;
    }

    console.log(chalk.bold("\nCompliance Evidence\n"));

    const displayData = response.data.map((e) => ({
      id: e.id.substring(0, 8),
      control: e.controlId,
      framework: e.framework,
      type: e.type,
      source: e.source,
      status: e.status,
      collected: formatDate(e.collectedAt),
    }));

    console.log(
      formatOutput(displayData, ["id", "control", "framework", "type", "status", "collected"])
    );
  });

/**
 * Generate compliance report
 */
const report = new Command("report")
  .description("Generate compliance report")
  .argument("<framework>", "Framework (SOC2, ISO27001, GDPR, HIPAA)")
  .option("--format <format>", "Report format (json, pdf, csv)", "json")
  .option("--include-evidence", "Include evidence in report")
  .option("-c, --categories <categories>", "Comma-separated categories to include")
  .option("--start <date>", "Start date for report period")
  .option("--end <date>", "End date for report period")
  .option("-o, --output <path>", "Output file path")
  .action(async (framework, options) => {
    const request: any = {
      format: options.format,
    };

    if (options.includeEvidence) request.includeEvidence = true;
    if (options.categories) request.categories = options.categories.split(",");
    if (options.start) request.startDate = options.start;
    if (options.end) request.endDate = options.end;

    console.log(chalk.blue(`Generating ${framework} compliance report...`));

    const response = await post<{ reportId: string; status: string; downloadUrl?: string }>(
      `/compliance/frameworks/${framework}/reports`,
      request
    );

    if (response.data.downloadUrl) {
      console.log(chalk.green(`\nReport generated successfully!`));
      console.log(`Download URL: ${response.data.downloadUrl}`);
    } else {
      console.log(chalk.yellow(`\nReport generation started.`));
      console.log(`Report ID: ${response.data.reportId}`);
      console.log(`Status: ${response.data.status}`);
      console.log(
        `\nRun 'summit compliance report-status ${response.data.reportId}' to check progress.`
      );
    }
  });

export const complianceCommands = {
  summary,
  controls,
  assess,
  evidence,
  report,
};
