/**
 * Explainability CLI Commands
 *
 * Fast, scriptable interface for querying explainability artifacts.
 * Mirrors UI capabilities for headless environments.
 */

import { Command } from "commander";
import ora from "ora";
import chalk from "chalk";

interface CLIConfig {
  apiUrl: string;
  apiKey?: string;
  tenantId?: string;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  errors?: Array<{ message: string }>;
}

interface ExplainableRun {
  run_id: string;
  run_type: string;
  actor: {
    actor_name: string;
    actor_type: string;
  };
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  explanation: {
    summary: string;
    why_triggered: string;
    why_this_approach: string;
  };
  confidence: {
    overall_confidence: number;
    evidence_count: number;
    source_reliability: string;
  };
  capabilities_used: string[];
  policy_decisions: Array<{
    policy_name: string;
    decision: string;
    rationale: string;
  }>;
  audit_event_ids: string[];
}

/**
 * Register explainability commands.
 */
export function registerExplainCommands(program: Command, config: CLIConfig): void {
  const explainGroup = program
    .command("explain")
    .description("Query and explore explainability artifacts");

  /**
   * List recent runs
   */
  explainGroup
    .command("list")
    .description("List recent explainable runs")
    .option(
      "-t, --type <type>",
      "Filter by run type (agent_run|prediction|negotiation|policy_decision)"
    )
    .option("-a, --actor <actorId>", "Filter by actor ID")
    .option("-c, --capability <capability>", "Filter by capability used")
    .option("-m, --min-confidence <confidence>", "Minimum confidence threshold (0.0-1.0)")
    .option("-l, --limit <limit>", "Number of results to return", "10")
    .option("-o, --offset <offset>", "Pagination offset", "0")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const spinner = ora("Fetching runs...").start();

      try {
        const params = new URLSearchParams();
        if (options.type) params.append("run_type", options.type);
        if (options.actor) params.append("actor_id", options.actor);
        if (options.capability) params.append("capability", options.capability);
        if (options.minConfidence) params.append("min_confidence", options.minConfidence);
        params.append("limit", options.limit);
        params.append("offset", options.offset);

        const url = `${config.apiUrl}/api/explainability/runs?${params.toString()}`;
        const response = await fetch(url, {
          headers: {
            ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
          },
        });

        const result = (await response.json()) as ApiResponse<ExplainableRun[]>;
        spinner.stop();

        if (!result.success) {
          console.error(chalk.red("Error:"), result.errors?.[0]?.message || "Unknown error");
          process.exit(1);
        }

        const runs: ExplainableRun[] = result.data || [];

        if (options.json) {
          console.log(JSON.stringify(runs, null, 2));
        } else {
          if (runs.length === 0) {
            console.log(chalk.yellow("No runs found."));
          } else {
            console.log(chalk.bold(`\nFound ${runs.length} run(s):\n`));
            runs.forEach((run, idx) => {
              console.log(chalk.cyan(`[${idx + 1}] ${run.run_type}`));
              console.log(`    ID: ${run.run_id}`);
              console.log(`    Actor: ${run.actor.actor_name} (${run.actor.actor_type})`);
              console.log(`    Started: ${new Date(run.started_at).toLocaleString()}`);
              console.log(
                `    Confidence: ${(run.confidence.overall_confidence * 100).toFixed(0)}%`
              );
              console.log(`    Summary: ${run.explanation.summary}`);
              console.log(`    Capabilities: ${run.capabilities_used.join(", ")}`);
              console.log("");
            });
          }
        }
      } catch (error) {
        spinner.stop();
        console.error(
          chalk.red("Error:"),
          error instanceof Error ? error.message : "Unknown error"
        );
        process.exit(1);
      }
    });

  /**
   * Show run details
   */
  explainGroup
    .command("show <runId>")
    .description("Show detailed explanation for a specific run")
    .option("--json", "Output as JSON")
    .action(async (runId: string, options) => {
      const spinner = ora(`Fetching run ${runId}...`).start();

      try {
        const url = `${config.apiUrl}/api/explainability/runs/${runId}`;
        const response = await fetch(url, {
          headers: {
            ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
          },
        });

        const result = (await response.json()) as ApiResponse<ExplainableRun>;
        spinner.stop();

        if (!result.success) {
          console.error(chalk.red("Error:"), result.errors?.[0]?.message || "Unknown error");
          process.exit(1);
        }

        const run: ExplainableRun = result.data!;

        if (options.json) {
          console.log(JSON.stringify(run, null, 2));
        } else {
          console.log(chalk.bold.cyan(`\n=== Run Details ===\n`));
          console.log(chalk.bold("Run ID:"), run.run_id);
          console.log(chalk.bold("Type:"), run.run_type);
          console.log(chalk.bold("Actor:"), `${run.actor.actor_name} (${run.actor.actor_type})`);
          console.log(chalk.bold("Started:"), new Date(run.started_at).toLocaleString());
          if (run.completed_at) {
            console.log(chalk.bold("Completed:"), new Date(run.completed_at).toLocaleString());
          }
          if (run.duration_ms !== null) {
            console.log(chalk.bold("Duration:"), `${(run.duration_ms / 1000).toFixed(2)}s`);
          }

          console.log(chalk.bold.cyan("\n--- Explanation ---"));
          console.log(chalk.bold("Summary:"), run.explanation.summary);
          console.log(chalk.bold("Why triggered:"), run.explanation.why_triggered);
          console.log(chalk.bold("Why this approach:"), run.explanation.why_this_approach);

          console.log(chalk.bold.cyan("\n--- Confidence & Trust ---"));
          const confidencePercent = (run.confidence.overall_confidence * 100).toFixed(0);
          const confidenceColor =
            run.confidence.overall_confidence >= 0.8
              ? chalk.green
              : run.confidence.overall_confidence >= 0.5
                ? chalk.yellow
                : chalk.red;
          console.log(chalk.bold("Overall Confidence:"), confidenceColor(`${confidencePercent}%`));
          console.log(chalk.bold("Evidence Count:"), run.confidence.evidence_count);
          console.log(chalk.bold("Source Reliability:"), run.confidence.source_reliability);

          if (run.capabilities_used.length > 0) {
            console.log(chalk.bold.cyan("\n--- Capabilities Used ---"));
            run.capabilities_used.forEach((cap) => {
              console.log(`  - ${cap}`);
            });
          }

          if (run.policy_decisions.length > 0) {
            console.log(chalk.bold.cyan("\n--- Policy Decisions ---"));
            run.policy_decisions.forEach((pd) => {
              const decisionColor = pd.decision === "allow" ? chalk.green : chalk.red;
              console.log(`  ${chalk.bold(pd.policy_name)}: ${decisionColor(pd.decision)}`);
              console.log(`    Rationale: ${pd.rationale}`);
            });
          }

          if (run.audit_event_ids.length > 0) {
            console.log(chalk.bold.cyan("\n--- Audit Trail ---"));
            console.log(`  ${run.audit_event_ids.length} audit event(s) linked`);
          }

          console.log("");
        }
      } catch (error) {
        spinner.stop();
        console.error(
          chalk.red("Error:"),
          error instanceof Error ? error.message : "Unknown error"
        );
        process.exit(1);
      }
    });

  /**
   * Export explanation as JSON
   */
  explainGroup
    .command("export <runId>")
    .description("Export full explanation as JSON file")
    .option("-o, --output <file>", "Output file path", "explanation.json")
    .action(async (runId: string, options) => {
      const spinner = ora(`Exporting run ${runId}...`).start();

      try {
        const url = `${config.apiUrl}/api/explainability/runs/${runId}`;
        const response = await fetch(url, {
          headers: {
            ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
          },
        });

        const result = (await response.json()) as ApiResponse<ExplainableRun>;

        if (!result.success) {
          spinner.stop();
          console.error(chalk.red("Error:"), result.errors?.[0]?.message || "Unknown error");
          process.exit(1);
        }

        const fs = await import("fs/promises");
        await fs.writeFile(options.output, JSON.stringify(result.data, null, 2), "utf-8");

        spinner.succeed(chalk.green(`Exported to ${options.output}`));
      } catch (error) {
        spinner.stop();
        console.error(
          chalk.red("Error:"),
          error instanceof Error ? error.message : "Unknown error"
        );
        process.exit(1);
      }
    });

  /**
   * Verify linkage: run → provenance → SBOM
   */
  explainGroup
    .command("verify <runId>")
    .description("Verify linkage between run, provenance, and SBOM hashes")
    .option("--json", "Output as JSON")
    .action(async (runId: string, options) => {
      const spinner = ora(`Verifying run ${runId}...`).start();

      try {
        const url = `${config.apiUrl}/api/explainability/runs/${runId}/verify`;
        const response = await fetch(url, {
          headers: {
            ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
          },
        });

        const result = (await response.json()) as ApiResponse<{
          run_id: string;
          verified: boolean;
          checks: Record<string, boolean>;
          issues?: string[];
          provenance_hash?: string;
          sbom_hash?: string;
          links?: Array<{ source: string; target: string; type: string }>;
        }>;
        spinner.stop();

        if (!result.success) {
          console.error(chalk.red("Error:"), result.errors?.[0]?.message || "Unknown error");
          process.exit(1);
        }

        const verification = result.data!;

        if (options.json) {
          console.log(JSON.stringify(verification, null, 2));
        } else {
          console.log(chalk.bold.cyan("\n=== Verification Report ===\n"));
          console.log(chalk.bold("Run ID:"), verification.run_id);
          console.log(
            chalk.bold("Overall Status:"),
            verification.verified ? chalk.green("✓ VERIFIED") : chalk.red("✗ FAILED")
          );

          console.log(chalk.bold.cyan("\n--- Checks ---"));
          Object.entries(verification.checks).forEach(([check, passed]) => {
            const icon = passed ? chalk.green("✓") : chalk.red("✗");
            console.log(`  ${icon} ${check}`);
          });

          if (verification.issues && verification.issues.length > 0) {
            console.log(chalk.bold.yellow("\n--- Issues ---"));
            verification.issues.forEach((issue: string) => {
              console.log(chalk.yellow(`  ⚠ ${issue}`));
            });
          }

          console.log("");
        }
      } catch (error) {
        spinner.stop();
        console.error(
          chalk.red("Error:"),
          error instanceof Error ? error.message : "Unknown error"
        );
        process.exit(1);
      }
    });

  /**
   * Compare two runs
   */
  explainGroup
    .command("compare <runIdA> <runIdB>")
    .description("Compare two runs and show deltas")
    .option("--json", "Output as JSON")
    .action(async (runIdA: string, runIdB: string, options) => {
      const spinner = ora(`Comparing runs...`).start();

      try {
        const url = `${config.apiUrl}/api/explainability/compare?run_a=${runIdA}&run_b=${runIdB}`;
        const response = await fetch(url, {
          headers: {
            ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
          },
        });

        const result = (await response.json()) as ApiResponse<{
          run_a: ExplainableRun;
          run_b: ExplainableRun;
          deltas: {
            confidence_delta: number;
            duration_delta_ms: number | null;
            different_capabilities: string[];
            different_policies: string[];
            input_diff: Record<string, unknown>;
            output_diff: Record<string, unknown>;
          };
        }>;
        spinner.stop();

        if (!result.success) {
          console.error(chalk.red("Error:"), result.errors?.[0]?.message || "Unknown error");
          process.exit(1);
        }

        const comparison = result.data!;

        if (options.json) {
          console.log(JSON.stringify(comparison, null, 2));
        } else {
          console.log(chalk.bold.cyan("\n=== Run Comparison ===\n"));

          console.log(chalk.bold("Run A:"), comparison.run_a.run_id);
          console.log(`  Type: ${comparison.run_a.run_type}`);
          console.log(
            `  Confidence: ${(comparison.run_a.confidence.overall_confidence * 100).toFixed(0)}%`
          );

          console.log(chalk.bold("\nRun B:"), comparison.run_b.run_id);
          console.log(`  Type: ${comparison.run_b.run_type}`);
          console.log(
            `  Confidence: ${(comparison.run_b.confidence.overall_confidence * 100).toFixed(0)}%`
          );

          console.log(chalk.bold.cyan("\n--- Deltas ---"));

          const confidenceDelta = comparison.deltas.confidence_delta * 100;
          const confidenceDeltaStr =
            confidenceDelta > 0
              ? chalk.green(`+${confidenceDelta.toFixed(1)}%`)
              : chalk.red(`${confidenceDelta.toFixed(1)}%`);
          console.log(chalk.bold("Confidence Delta:"), confidenceDeltaStr);

          if (comparison.deltas.duration_delta_ms !== null) {
            const durationDelta = comparison.deltas.duration_delta_ms / 1000;
            const durationDeltaStr =
              durationDelta > 0
                ? chalk.red(`+${durationDelta.toFixed(2)}s`)
                : chalk.green(`${durationDelta.toFixed(2)}s`);
            console.log(chalk.bold("Duration Delta:"), durationDeltaStr);
          }

          if (comparison.deltas.different_capabilities.length > 0) {
            console.log(chalk.bold("\nDifferent Capabilities:"));
            comparison.deltas.different_capabilities.forEach((cap: string) => {
              console.log(`  - ${cap}`);
            });
          }

          if (comparison.deltas.different_policies.length > 0) {
            console.log(chalk.bold("\nDifferent Policies:"));
            comparison.deltas.different_policies.forEach((policy: string) => {
              console.log(`  - ${policy}`);
            });
          }

          if (Object.keys(comparison.deltas.input_diff).length > 0) {
            console.log(chalk.bold("\nInput Differences:"));
            console.log(JSON.stringify(comparison.deltas.input_diff, null, 2));
          }

          if (Object.keys(comparison.deltas.output_diff).length > 0) {
            console.log(chalk.bold("\nOutput Differences:"));
            console.log(JSON.stringify(comparison.deltas.output_diff, null, 2));
          }

          console.log("");
        }
      } catch (error) {
        spinner.stop();
        console.error(
          chalk.red("Error:"),
          error instanceof Error ? error.message : "Unknown error"
        );
        process.exit(1);
      }
    });
}
