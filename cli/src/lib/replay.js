"use strict";
/**
 * Replay Module
 *
 * Provides replay and summarization of session event logs.
 * Features:
 * - Read and parse JSONL event logs
 * - Generate deterministic summaries
 * - Generate markdown report artifacts
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildReplaySummary = buildReplaySummary;
exports.formatSummaryText = formatSummaryText;
exports.formatSummaryJson = formatSummaryJson;
exports.generateMarkdownReport = generateMarkdownReport;
exports.replaySession = replaySession;
exports.writeReportArtifact = writeReportArtifact;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const event_logger_js_1 = require("./event-logger.js");
/**
 * Build replay summary from events
 */
function buildReplaySummary(events) {
    let command = '';
    let args = [];
    let status = 'unknown';
    let diagnostics = null;
    const steps = [];
    const files = {
        total_actions: 0,
        files_read: [],
        files_written: [],
        files_patched: [],
        files_deleted: [],
        total_diff_bytes: 0,
    };
    const providers = {
        total_calls: 0,
        successful: 0,
        errors: 0,
        timeouts: 0,
        total_retries: 0,
        providers: {},
    };
    const tools = {
        total_executions: 0,
        successful: 0,
        failed: 0,
        timeouts: 0,
        tools: {},
    };
    const errors = [];
    const runId = events.length > 0 ? events[0].run_id : '';
    for (const event of events) {
        switch (event.type) {
            case 'run_start': {
                const data = event.data;
                command = data.command;
                args = data.args;
                break;
            }
            case 'step_start': {
                const data = event.data;
                steps.push({
                    step_name: data.step_name,
                    step_id: data.step_id,
                    seq: event.seq,
                });
                break;
            }
            case 'action': {
                const data = event.data;
                files.total_actions++;
                switch (data.action_type) {
                    case 'read':
                        files.files_read.push(...data.affected_files);
                        break;
                    case 'write':
                        files.files_written.push(...data.affected_files);
                        break;
                    case 'patch':
                        files.files_patched.push(...data.affected_files);
                        break;
                    case 'delete':
                        files.files_deleted.push(...data.affected_files);
                        break;
                }
                if (data.diff_bytes) {
                    files.total_diff_bytes += data.diff_bytes;
                }
                break;
            }
            case 'provider_call': {
                const data = event.data;
                providers.total_calls++;
                providers.total_retries += data.retries;
                if (data.status === 'success') {
                    providers.successful++;
                }
                else if (data.status === 'error') {
                    providers.errors++;
                }
                else if (data.status === 'timeout') {
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
            case 'tool_exec': {
                const data = event.data;
                tools.total_executions++;
                if (data.timeout) {
                    tools.timeouts++;
                }
                else if (data.exit_code === 0) {
                    tools.successful++;
                }
                else {
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
                }
                else if (data.exit_code !== 0) {
                    tools.tools[data.tool].failures++;
                }
                break;
            }
            case 'run_end': {
                const data = event.data;
                status = data.status;
                diagnostics = data.diagnostics;
                break;
            }
            case 'error': {
                const data = event.data;
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
    const sortedProviders = {};
    for (const key of Object.keys(providers.providers).sort()) {
        sortedProviders[key] = providers.providers[key];
    }
    providers.providers = sortedProviders;
    const sortedTools = {};
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
function formatSummaryText(summary) {
    const lines = [];
    lines.push(`Run Summary: ${summary.run_id}`);
    lines.push('='.repeat(50));
    lines.push('');
    lines.push(`Command: ${summary.command}`);
    lines.push(`Args: ${summary.args.join(' ')}`);
    lines.push(`Status: ${summary.status}`);
    lines.push(`Total Events: ${summary.total_events}`);
    lines.push('');
    if (summary.steps.length > 0) {
        lines.push('Steps:');
        for (const step of summary.steps) {
            lines.push(`  [${step.seq}] ${step.step_name} (${step.step_id})`);
        }
        lines.push('');
    }
    lines.push('Files:');
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
    lines.push('');
    if (summary.providers.total_calls > 0) {
        lines.push('Provider Calls:');
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
        lines.push('');
    }
    if (summary.tools.total_executions > 0) {
        lines.push('Tool Executions:');
        lines.push(`  Total: ${summary.tools.total_executions}`);
        lines.push(`  Successful: ${summary.tools.successful}`);
        lines.push(`  Failed: ${summary.tools.failed}`);
        lines.push(`  Timeouts: ${summary.tools.timeouts}`);
        for (const [name, stats] of Object.entries(summary.tools.tools)) {
            lines.push(`  ${name}: ${stats.executions} executions, ${stats.failures} failures, ${stats.timeouts} timeouts`);
        }
        lines.push('');
    }
    if (summary.errors.length > 0) {
        lines.push('Errors:');
        for (const error of summary.errors) {
            lines.push(`  [${error.seq}] ${error.category}: ${error.message}`);
            if (error.deny_reasons.length > 0) {
                lines.push(`    Deny Reasons: ${error.deny_reasons.join(', ')}`);
            }
        }
        lines.push('');
    }
    if (summary.diagnostics) {
        lines.push('Diagnostics:');
        lines.push(`  Total Operations: ${summary.diagnostics.total_operations}`);
        lines.push(`  Files Read: ${summary.diagnostics.files_read}`);
        lines.push(`  Files Written: ${summary.diagnostics.files_written}`);
        lines.push(`  Tools Executed: ${summary.diagnostics.tools_executed}`);
        lines.push(`  Provider Calls: ${summary.diagnostics.provider_calls}`);
        lines.push(`  Retries: ${summary.diagnostics.retries}`);
        lines.push(`  Errors: ${summary.diagnostics.errors}`);
        lines.push(`  Denied: ${summary.diagnostics.denied}`);
    }
    return lines.join('\n');
}
/**
 * Format summary as JSON
 */
function formatSummaryJson(summary) {
    const sorted = (0, event_logger_js_1.sortObjectKeys)(summary);
    return JSON.stringify(sorted, null, 2);
}
/**
 * Generate markdown report
 */
function generateMarkdownReport(summary, events) {
    const lines = [];
    lines.push(`# Replay Report: ${summary.run_id}`);
    lines.push('');
    lines.push('## Overview');
    lines.push('');
    lines.push(`| Property | Value |`);
    lines.push(`| --- | --- |`);
    lines.push(`| Run ID | \`${summary.run_id}\` |`);
    lines.push(`| Command | \`${summary.command}\` |`);
    lines.push(`| Args | \`${summary.args.join(' ')}\` |`);
    lines.push(`| Status | **${summary.status}** |`);
    lines.push(`| Total Events | ${summary.total_events} |`);
    lines.push('');
    lines.push('## Timeline');
    lines.push('');
    lines.push('| Seq | Type | Details |');
    lines.push('| --- | --- | --- |');
    for (const event of events) {
        let details = '';
        switch (event.type) {
            case 'run_start':
                details = `Command: ${event.data.command}`;
                break;
            case 'step_start':
                details = `Step: ${event.data.step_name}`;
                break;
            case 'action':
                details = `${event.data.action_type}: ${(event.data.affected_files || []).length} files`;
                break;
            case 'provider_call':
                details = `${event.data.provider_name}: ${event.data.status}`;
                break;
            case 'tool_exec':
                details = `${event.data.tool}: exit ${event.data.exit_code}`;
                break;
            case 'run_end':
                details = `Status: ${event.data.status}`;
                break;
            case 'error':
                details = `${event.data.category}: ${event.data.message}`;
                break;
        }
        lines.push(`| ${event.seq} | ${event.type} | ${details} |`);
    }
    lines.push('');
    lines.push('## Files');
    lines.push('');
    lines.push(`Total Actions: ${summary.files.total_actions}`);
    lines.push('');
    if (summary.files.files_read.length > 0) {
        lines.push('### Files Read');
        lines.push('');
        for (const file of summary.files.files_read) {
            lines.push(`- \`${file}\``);
        }
        lines.push('');
    }
    if (summary.files.files_written.length > 0) {
        lines.push('### Files Written');
        lines.push('');
        for (const file of summary.files.files_written) {
            lines.push(`- \`${file}\``);
        }
        lines.push('');
    }
    if (summary.files.files_patched.length > 0) {
        lines.push('### Files Patched');
        lines.push('');
        for (const file of summary.files.files_patched) {
            lines.push(`- \`${file}\``);
        }
        lines.push('');
    }
    lines.push('## Provider Stats');
    lines.push('');
    if (summary.providers.total_calls > 0) {
        lines.push(`| Provider | Calls | Retries | Input Tokens | Output Tokens |`);
        lines.push(`| --- | --- | --- | --- | --- |`);
        for (const [name, stats] of Object.entries(summary.providers.providers)) {
            lines.push(`| ${name} | ${stats.calls} | ${stats.retries} | ${stats.input_tokens} | ${stats.output_tokens} |`);
        }
        lines.push('');
        lines.push(`**Totals:** ${summary.providers.total_calls} calls, ${summary.providers.successful} successful, ${summary.providers.errors} errors, ${summary.providers.timeouts} timeouts`);
    }
    else {
        lines.push('No provider calls recorded.');
    }
    lines.push('');
    lines.push('## Tool Stats');
    lines.push('');
    if (summary.tools.total_executions > 0) {
        lines.push(`| Tool | Executions | Failures | Timeouts |`);
        lines.push(`| --- | --- | --- | --- |`);
        for (const [name, stats] of Object.entries(summary.tools.tools)) {
            lines.push(`| ${name} | ${stats.executions} | ${stats.failures} | ${stats.timeouts} |`);
        }
        lines.push('');
        lines.push(`**Totals:** ${summary.tools.total_executions} executions, ${summary.tools.successful} successful, ${summary.tools.failed} failed`);
    }
    else {
        lines.push('No tool executions recorded.');
    }
    lines.push('');
    if (summary.errors.length > 0) {
        lines.push('## Errors');
        lines.push('');
        for (const error of summary.errors) {
            lines.push(`### Error at seq ${error.seq}`);
            lines.push('');
            lines.push(`- **Category:** ${error.category}`);
            lines.push(`- **Message:** ${error.message}`);
            if (error.deny_reasons.length > 0) {
                lines.push(`- **Deny Reasons:** ${error.deny_reasons.join(', ')}`);
            }
            lines.push('');
        }
    }
    lines.push('---');
    lines.push('');
    lines.push('*Generated by IntelGraph CLI replay*');
    return lines.join('\n');
}
/**
 * Replay a session
 */
function replaySession(options) {
    const eventFile = path.join(options.sessionDir, options.runId, 'events.jsonl');
    const events = (0, event_logger_js_1.readEvents)(eventFile);
    const summary = buildReplaySummary(events);
    return { events, summary };
}
/**
 * Write report artifact
 */
function writeReportArtifact(options, summary, events) {
    const reportPath = path.join(options.sessionDir, options.runId, 'replay.md');
    const content = generateMarkdownReport(summary, events);
    fs.writeFileSync(reportPath, content);
    return reportPath;
}
