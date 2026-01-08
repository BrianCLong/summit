/**
 * Replay Module
 *
 * Provides replay and summarization of session event logs.
 * Features:
 * - Read and parse JSONL event logs
 * - Generate deterministic summaries
 * - Generate markdown report artifacts
 */

import * as fs from "fs";
import * as path from "path";
import {
  BaseEvent,
  readEvents,
  RunStartData,
  RunEndData,
  ActionData,
  ProviderCallData,
  ToolExecData,
  ErrorData,
  sortObjectKeys,
} from "./event-logger.js";

/**
 * Replay summary structure
 */
export interface ReplaySummary {
  run_id: string;
  command: string;
  args: string[];
  status: "completed" | "failed" | "cancelled" | "unknown";
  total_events: number;
  steps: StepSummary[];
  files: FileSummary;
  providers: ProviderSummary;
  tools: ToolSummary;
  errors: ErrorSummary[];
  diagnostics: DiagnosticsSummary | null;
}

/**
 * Step summary
 */
export interface StepSummary {
  step_name: string;
  step_id: string;
  seq: number;
}

/**
 * File summary
 */
export interface FileSummary {
  total_actions: number;
  files_read: string[];
  files_written: string[];
  files_patched: string[];
  files_deleted: string[];
  total_diff_bytes: number;
}

/**
 * Provider summary
 */
export interface ProviderSummary {
  total_calls: number;
  successful: number;
  errors: number;
  timeouts: number;
  total_retries: number;
  providers: Record<
    string,
    {
      calls: number;
      retries: number;
      input_tokens: number;
      output_tokens: number;
    }
  >;
}

/**
 * Tool summary
 */
export interface ToolSummary {
  total_executions: number;
  successful: number;
  failed: number;
  timeouts: number;
  tools: Record<
    string,
    {
      executions: number;
      failures: number;
      timeouts: number;
    }
  >;
}

/**
 * Error summary
 */
export interface ErrorSummary {
  seq: number;
  category: string;
  message: string;
  deny_reasons: string[];
}

/**
 * Diagnostics summary
 */
export interface DiagnosticsSummary {
  total_operations: number;
  files_read: number;
  files_written: number;
  tools_executed: number;
  provider_calls: number;
  retries: number;
  errors: number;
  denied: number;
}

/**
 * Replay options
 */
export interface ReplayOptions {
  sessionDir: string;
  runId: string;
}

/**
 * Build replay summary from events
 */
export function buildReplaySummary(events: BaseEvent[]): ReplaySummary {
  let command = "";
  let args: string[] = [];
  let status: ReplaySummary["status"] = "unknown";
  let diagnostics: DiagnosticsSummary | null = null;

  const steps: StepSummary[] = [];
  const files: FileSummary = {
    total_actions: 0,
    files_read: [],
    files_written: [],
    files_patched: [],
    files_deleted: [],
    total_diff_bytes: 0,
  };
  const providers: ProviderSummary = {
    total_calls: 0,
    successful: 0,
    errors: 0,
    timeouts: 0,
    total_retries: 0,
    providers: {},
  };
  const tools: ToolSummary = {
    total_executions: 0,
    successful: 0,
    failed: 0,
    timeouts: 0,
    tools: {},
  };
  const errors: ErrorSummary[] = [];

  const runId = events.length > 0 ? events[0].run_id : "";

  for (const event of events) {
    switch (event.type) {
      case "run_start": {
        const data = event.data as unknown as RunStartData;
        command = data.command;
        args = data.args;
        break;
      }

      case "step_start": {
        const data = event.data as { step_name: string; step_id: string };
        steps.push({
          step_name: data.step_name,
          step_id: data.step_id,
          seq: event.seq,
        });
        break;
      }

      case "action": {
        const data = event.data as unknown as ActionData;
        files.total_actions++;

        switch (data.action_type) {
          case "read":
            files.files_read.push(...data.affected_files);
            break;
          case "write":
            files.files_written.push(...data.affected_files);
            break;
          case "patch":
            files.files_patched.push(...data.affected_files);
            break;
          case "delete":
            files.files_deleted.push(...data.affected_files);
            break;
        }

        if (data.diff_bytes) {
          files.total_diff_bytes += data.diff_bytes;
        }
        break;
      }

      case "provider_call": {
        const data = event.data as unknown as ProviderCallData;
        providers.total_calls++;
        providers.total_retries += data.retries;

        if (data.status === "success") {
          providers.successful++;
        } else if (data.status === "error") {
          providers.errors++;
        } else if (data.status === "timeout") {
          providers.timeouts++;
        }

        if (!providers.providers[data.provider_name]) {
          providers.providers[data.provider_name] = {
            calls: 0,
            retries: 0,
            input_tokens: 0,
            output_tokens: 0,
          };
        }
        providers.providers[data.provider_name].calls++;
        providers.providers[data.provider_name].retries += data.retries;
        providers.providers[data.provider_name].input_tokens += data.input_tokens ?? 0;
        providers.providers[data.provider_name].output_tokens += data.output_tokens ?? 0;
        break;
      }

      case "tool_exec": {
        const data = event.data as unknown as ToolExecData;
        tools.total_executions++;

        if (data.timeout) {
          tools.timeouts++;
        } else if (data.exit_code === 0) {
          tools.successful++;
        } else {
          tools.failed++;
        }

        if (!tools.tools[data.tool]) {
          tools.tools[data.tool] = {
            executions: 0,
            failures: 0,
            timeouts: 0,
          };
        }
        tools.tools[data.tool].executions++;
        if (data.timeout) {
          tools.tools[data.tool].timeouts++;
        } else if (data.exit_code !== 0) {
          tools.tools[data.tool].failures++;
        }
        break;
      }

      case "run_end": {
        const data = event.data as unknown as RunEndData;
        status = data.status;
        diagnostics = data.diagnostics as DiagnosticsSummary;
        break;
      }

      case "error": {
        const data = event.data as unknown as ErrorData;
        errors.push({
          seq: event.seq,
          category: data.category,
          message: data.message,
          deny_reasons: data.deny_reasons,
        });
        break;
      }
    }
  }

  // Deduplicate and sort file lists
  files.files_read = [...new Set(files.files_read)].sort();
  files.files_written = [...new Set(files.files_written)].sort();
  files.files_patched = [...new Set(files.files_patched)].sort();
  files.files_deleted = [...new Set(files.files_deleted)].sort();

  // Sort provider and tool keys
  const sortedProviders: Record<string, ProviderSummary["providers"][string]> = {};
  for (const key of Object.keys(providers.providers).sort()) {
    sortedProviders[key] = providers.providers[key];
  }
  providers.providers = sortedProviders;

  const sortedTools: Record<string, ToolSummary["tools"][string]> = {};
  for (const key of Object.keys(tools.tools).sort()) {
    sortedTools[key] = tools.tools[key];
  }
  tools.tools = sortedTools;

  return {
    run_id: runId,
    command,
    args,
    status,
    total_events: events.length,
    steps,
    files,
    providers,
    tools,
    errors,
    diagnostics,
  };
}

/**
 * Format summary as text
 */
export function formatSummaryText(summary: ReplaySummary): string {
  const lines: string[] = [];

  lines.push(`Run Summary: ${summary.run_id}`);
  lines.push("=".repeat(50));
  lines.push("");

  lines.push(`Command: ${summary.command}`);
  lines.push(`Args: ${summary.args.join(" ")}`);
  lines.push(`Status: ${summary.status}`);
  lines.push(`Total Events: ${summary.total_events}`);
  lines.push("");

  if (summary.steps.length > 0) {
    lines.push("Steps:");
    for (const step of summary.steps) {
      lines.push(`  [${step.seq}] ${step.step_name} (${step.step_id})`);
    }
    lines.push("");
  }

  lines.push("Files:");
  lines.push(`  Total Actions: ${summary.files.total_actions}`);
  if (summary.files.files_read.length > 0) {
    lines.push(`  Read: ${summary.files.files_read.length} files`);
  }
  if (summary.files.files_written.length > 0) {
    lines.push(`  Written: ${summary.files.files_written.length} files`);
  }
  if (summary.files.files_patched.length > 0) {
    lines.push(`  Patched: ${summary.files.files_patched.length} files`);
  }
  if (summary.files.files_deleted.length > 0) {
    lines.push(`  Deleted: ${summary.files.files_deleted.length} files`);
  }
  if (summary.files.total_diff_bytes > 0) {
    lines.push(`  Total Diff: ${summary.files.total_diff_bytes} bytes`);
  }
  lines.push("");

  if (summary.providers.total_calls > 0) {
    lines.push("Provider Calls:");
    lines.push(`  Total: ${summary.providers.total_calls}`);
    lines.push(`  Successful: ${summary.providers.successful}`);
    lines.push(`  Errors: ${summary.providers.errors}`);
    lines.push(`  Timeouts: ${summary.providers.timeouts}`);
    lines.push(`  Total Retries: ${summary.providers.total_retries}`);
    for (const [name, stats] of Object.entries(summary.providers.providers)) {
      lines.push(`  ${name}: ${stats.calls} calls, ${stats.retries} retries`);
      if (stats.input_tokens > 0 || stats.output_tokens > 0) {
        lines.push(`    Tokens: ${stats.input_tokens} in, ${stats.output_tokens} out`);
      }
    }
    lines.push("");
  }

  if (summary.tools.total_executions > 0) {
    lines.push("Tool Executions:");
    lines.push(`  Total: ${summary.tools.total_executions}`);
    lines.push(`  Successful: ${summary.tools.successful}`);
    lines.push(`  Failed: ${summary.tools.failed}`);
    lines.push(`  Timeouts: ${summary.tools.timeouts}`);
    for (const [name, stats] of Object.entries(summary.tools.tools)) {
      lines.push(
        `  ${name}: ${stats.executions} executions, ${stats.failures} failures, ${stats.timeouts} timeouts`
      );
    }
    lines.push("");
  }

  if (summary.errors.length > 0) {
    lines.push("Errors:");
    for (const error of summary.errors) {
      lines.push(`  [${error.seq}] ${error.category}: ${error.message}`);
      if (error.deny_reasons.length > 0) {
        lines.push(`    Deny Reasons: ${error.deny_reasons.join(", ")}`);
      }
    }
    lines.push("");
  }

  if (summary.diagnostics) {
    lines.push("Diagnostics:");
    lines.push(`  Total Operations: ${summary.diagnostics.total_operations}`);
    lines.push(`  Files Read: ${summary.diagnostics.files_read}`);
    lines.push(`  Files Written: ${summary.diagnostics.files_written}`);
    lines.push(`  Tools Executed: ${summary.diagnostics.tools_executed}`);
    lines.push(`  Provider Calls: ${summary.diagnostics.provider_calls}`);
    lines.push(`  Retries: ${summary.diagnostics.retries}`);
    lines.push(`  Errors: ${summary.diagnostics.errors}`);
    lines.push(`  Denied: ${summary.diagnostics.denied}`);
  }

  return lines.join("\n");
}

/**
 * Format summary as JSON
 */
export function formatSummaryJson(summary: ReplaySummary): string {
  const sorted = sortObjectKeys(summary);
  return JSON.stringify(sorted, null, 2);
}

/**
 * Generate markdown report
 */
export function generateMarkdownReport(summary: ReplaySummary, events: BaseEvent[]): string {
  const lines: string[] = [];

  lines.push(`# Replay Report: ${summary.run_id}`);
  lines.push("");
  lines.push("## Overview");
  lines.push("");
  lines.push(`| Property | Value |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Run ID | \`${summary.run_id}\` |`);
  lines.push(`| Command | \`${summary.command}\` |`);
  lines.push(`| Args | \`${summary.args.join(" ")}\` |`);
  lines.push(`| Status | **${summary.status}** |`);
  lines.push(`| Total Events | ${summary.total_events} |`);
  lines.push("");

  lines.push("## Timeline");
  lines.push("");
  lines.push("| Seq | Type | Details |");
  lines.push("| --- | --- | --- |");
  for (const event of events) {
    let details = "";
    switch (event.type) {
      case "run_start":
        details = `Command: ${(event.data as { command: string }).command}`;
        break;
      case "step_start":
        details = `Step: ${(event.data as { step_name: string }).step_name}`;
        break;
      case "action":
        details = `${(event.data as { action_type: string }).action_type}: ${((event.data as { affected_files: string[] }).affected_files || []).length} files`;
        break;
      case "provider_call":
        details = `${(event.data as { provider_name: string }).provider_name}: ${(event.data as { status: string }).status}`;
        break;
      case "tool_exec":
        details = `${(event.data as { tool: string }).tool}: exit ${(event.data as { exit_code: number }).exit_code}`;
        break;
      case "run_end":
        details = `Status: ${(event.data as { status: string }).status}`;
        break;
      case "error":
        details = `${(event.data as { category: string }).category}: ${(event.data as { message: string }).message}`;
        break;
    }
    lines.push(`| ${event.seq} | ${event.type} | ${details} |`);
  }
  lines.push("");

  lines.push("## Files");
  lines.push("");
  lines.push(`Total Actions: ${summary.files.total_actions}`);
  lines.push("");

  if (summary.files.files_read.length > 0) {
    lines.push("### Files Read");
    lines.push("");
    for (const file of summary.files.files_read) {
      lines.push(`- \`${file}\``);
    }
    lines.push("");
  }

  if (summary.files.files_written.length > 0) {
    lines.push("### Files Written");
    lines.push("");
    for (const file of summary.files.files_written) {
      lines.push(`- \`${file}\``);
    }
    lines.push("");
  }

  if (summary.files.files_patched.length > 0) {
    lines.push("### Files Patched");
    lines.push("");
    for (const file of summary.files.files_patched) {
      lines.push(`- \`${file}\``);
    }
    lines.push("");
  }

  lines.push("## Provider Stats");
  lines.push("");
  if (summary.providers.total_calls > 0) {
    lines.push(`| Provider | Calls | Retries | Input Tokens | Output Tokens |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const [name, stats] of Object.entries(summary.providers.providers)) {
      lines.push(
        `| ${name} | ${stats.calls} | ${stats.retries} | ${stats.input_tokens} | ${stats.output_tokens} |`
      );
    }
    lines.push("");
    lines.push(
      `**Totals:** ${summary.providers.total_calls} calls, ${summary.providers.successful} successful, ${summary.providers.errors} errors, ${summary.providers.timeouts} timeouts`
    );
  } else {
    lines.push("No provider calls recorded.");
  }
  lines.push("");

  lines.push("## Tool Stats");
  lines.push("");
  if (summary.tools.total_executions > 0) {
    lines.push(`| Tool | Executions | Failures | Timeouts |`);
    lines.push(`| --- | --- | --- | --- |`);
    for (const [name, stats] of Object.entries(summary.tools.tools)) {
      lines.push(`| ${name} | ${stats.executions} | ${stats.failures} | ${stats.timeouts} |`);
    }
    lines.push("");
    lines.push(
      `**Totals:** ${summary.tools.total_executions} executions, ${summary.tools.successful} successful, ${summary.tools.failed} failed`
    );
  } else {
    lines.push("No tool executions recorded.");
  }
  lines.push("");

  if (summary.errors.length > 0) {
    lines.push("## Errors");
    lines.push("");
    for (const error of summary.errors) {
      lines.push(`### Error at seq ${error.seq}`);
      lines.push("");
      lines.push(`- **Category:** ${error.category}`);
      lines.push(`- **Message:** ${error.message}`);
      if (error.deny_reasons.length > 0) {
        lines.push(`- **Deny Reasons:** ${error.deny_reasons.join(", ")}`);
      }
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("");
  lines.push("*Generated by IntelGraph CLI replay*");

  return lines.join("\n");
}

/**
 * Replay a session
 */
export function replaySession(options: ReplayOptions): {
  events: BaseEvent[];
  summary: ReplaySummary;
} {
  const eventFile = path.join(options.sessionDir, options.runId, "events.jsonl");
  const events = readEvents(eventFile);
  const summary = buildReplaySummary(events);

  return { events, summary };
}

/**
 * Write report artifact
 */
export function writeReportArtifact(
  options: ReplayOptions,
  summary: ReplaySummary,
  events: BaseEvent[]
): string {
  const reportPath = path.join(options.sessionDir, options.runId, "replay.md");
  const content = generateMarkdownReport(summary, events);
  fs.writeFileSync(reportPath, content);
  return reportPath;
}
