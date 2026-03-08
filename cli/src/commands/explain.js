"use strict";
/**
 * Explainability CLI Commands
 *
 * Fast, scriptable interface for querying explainability artifacts.
 * Mirrors UI capabilities for headless environments.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerExplainCommands = registerExplainCommands;
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
/**
 * Register explainability commands.
 */
function registerExplainCommands(program, config) {
    const explainGroup = program
        .command('explain')
        .description('Query and explore explainability artifacts');
    /**
     * List recent runs
     */
    explainGroup
        .command('list')
        .description('List recent explainable runs')
        .option('-t, --type <type>', 'Filter by run type (agent_run|prediction|negotiation|policy_decision)')
        .option('-a, --actor <actorId>', 'Filter by actor ID')
        .option('-c, --capability <capability>', 'Filter by capability used')
        .option('-m, --min-confidence <confidence>', 'Minimum confidence threshold (0.0-1.0)')
        .option('-l, --limit <limit>', 'Number of results to return', '10')
        .option('-o, --offset <offset>', 'Pagination offset', '0')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Fetching runs...').start();
        try {
            const params = new URLSearchParams();
            if (options.type)
                params.append('run_type', options.type);
            if (options.actor)
                params.append('actor_id', options.actor);
            if (options.capability)
                params.append('capability', options.capability);
            if (options.minConfidence)
                params.append('min_confidence', options.minConfidence);
            params.append('limit', options.limit);
            params.append('offset', options.offset);
            const url = `${config.apiUrl}/api/explainability/runs?${params.toString()}`;
            const response = await fetch(url, {
                headers: {
                    ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
                },
            });
            const result = await response.json();
            spinner.stop();
            if (!result.success) {
                console.error(chalk_1.default.red('Error:'), result.errors?.[0]?.message || 'Unknown error');
                process.exit(1);
            }
            const runs = result.data || [];
            if (options.json) {
                console.log(JSON.stringify(runs, null, 2));
            }
            else {
                if (runs.length === 0) {
                    console.log(chalk_1.default.yellow('No runs found.'));
                }
                else {
                    console.log(chalk_1.default.bold(`\nFound ${runs.length} run(s):\n`));
                    runs.forEach((run, idx) => {
                        console.log(chalk_1.default.cyan(`[${idx + 1}] ${run.run_type}`));
                        console.log(`    ID: ${run.run_id}`);
                        console.log(`    Actor: ${run.actor.actor_name} (${run.actor.actor_type})`);
                        console.log(`    Started: ${new Date(run.started_at).toLocaleString()}`);
                        console.log(`    Confidence: ${(run.confidence.overall_confidence * 100).toFixed(0)}%`);
                        console.log(`    Summary: ${run.explanation.summary}`);
                        console.log(`    Capabilities: ${run.capabilities_used.join(', ')}`);
                        console.log('');
                    });
                }
            }
        }
        catch (error) {
            spinner.stop();
            console.error(chalk_1.default.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
            process.exit(1);
        }
    });
    /**
     * Show run details
     */
    explainGroup
        .command('show <runId>')
        .description('Show detailed explanation for a specific run')
        .option('--json', 'Output as JSON')
        .action(async (runId, options) => {
        const spinner = (0, ora_1.default)(`Fetching run ${runId}...`).start();
        try {
            const url = `${config.apiUrl}/api/explainability/runs/${runId}`;
            const response = await fetch(url, {
                headers: {
                    ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
                },
            });
            const result = await response.json();
            spinner.stop();
            if (!result.success) {
                console.error(chalk_1.default.red('Error:'), result.errors?.[0]?.message || 'Unknown error');
                process.exit(1);
            }
            const run = result.data;
            if (options.json) {
                console.log(JSON.stringify(run, null, 2));
            }
            else {
                console.log(chalk_1.default.bold.cyan(`\n=== Run Details ===\n`));
                console.log(chalk_1.default.bold('Run ID:'), run.run_id);
                console.log(chalk_1.default.bold('Type:'), run.run_type);
                console.log(chalk_1.default.bold('Actor:'), `${run.actor.actor_name} (${run.actor.actor_type})`);
                console.log(chalk_1.default.bold('Started:'), new Date(run.started_at).toLocaleString());
                if (run.completed_at) {
                    console.log(chalk_1.default.bold('Completed:'), new Date(run.completed_at).toLocaleString());
                }
                if (run.duration_ms !== null) {
                    console.log(chalk_1.default.bold('Duration:'), `${(run.duration_ms / 1000).toFixed(2)}s`);
                }
                console.log(chalk_1.default.bold.cyan('\n--- Explanation ---'));
                console.log(chalk_1.default.bold('Summary:'), run.explanation.summary);
                console.log(chalk_1.default.bold('Why triggered:'), run.explanation.why_triggered);
                console.log(chalk_1.default.bold('Why this approach:'), run.explanation.why_this_approach);
                console.log(chalk_1.default.bold.cyan('\n--- Confidence & Trust ---'));
                const confidencePercent = (run.confidence.overall_confidence * 100).toFixed(0);
                const confidenceColor = run.confidence.overall_confidence >= 0.8
                    ? chalk_1.default.green
                    : run.confidence.overall_confidence >= 0.5
                        ? chalk_1.default.yellow
                        : chalk_1.default.red;
                console.log(chalk_1.default.bold('Overall Confidence:'), confidenceColor(`${confidencePercent}%`));
                console.log(chalk_1.default.bold('Evidence Count:'), run.confidence.evidence_count);
                console.log(chalk_1.default.bold('Source Reliability:'), run.confidence.source_reliability);
                if (run.capabilities_used.length > 0) {
                    console.log(chalk_1.default.bold.cyan('\n--- Capabilities Used ---'));
                    run.capabilities_used.forEach((cap) => {
                        console.log(`  - ${cap}`);
                    });
                }
                if (run.policy_decisions.length > 0) {
                    console.log(chalk_1.default.bold.cyan('\n--- Policy Decisions ---'));
                    run.policy_decisions.forEach((pd) => {
                        const decisionColor = pd.decision === 'allow' ? chalk_1.default.green : chalk_1.default.red;
                        console.log(`  ${chalk_1.default.bold(pd.policy_name)}: ${decisionColor(pd.decision)}`);
                        console.log(`    Rationale: ${pd.rationale}`);
                    });
                }
                if (run.audit_event_ids.length > 0) {
                    console.log(chalk_1.default.bold.cyan('\n--- Audit Trail ---'));
                    console.log(`  ${run.audit_event_ids.length} audit event(s) linked`);
                }
                console.log('');
            }
        }
        catch (error) {
            spinner.stop();
            console.error(chalk_1.default.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
            process.exit(1);
        }
    });
    /**
     * Export explanation as JSON
     */
    explainGroup
        .command('export <runId>')
        .description('Export full explanation as JSON file')
        .option('-o, --output <file>', 'Output file path', 'explanation.json')
        .action(async (runId, options) => {
        const spinner = (0, ora_1.default)(`Exporting run ${runId}...`).start();
        try {
            const url = `${config.apiUrl}/api/explainability/runs/${runId}`;
            const response = await fetch(url, {
                headers: {
                    ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
                },
            });
            const result = await response.json();
            if (!result.success) {
                spinner.stop();
                console.error(chalk_1.default.red('Error:'), result.errors?.[0]?.message || 'Unknown error');
                process.exit(1);
            }
            const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
            await fs.writeFile(options.output, JSON.stringify(result.data, null, 2), 'utf-8');
            spinner.succeed(chalk_1.default.green(`Exported to ${options.output}`));
        }
        catch (error) {
            spinner.stop();
            console.error(chalk_1.default.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
            process.exit(1);
        }
    });
    /**
     * Verify linkage: run → provenance → SBOM
     */
    explainGroup
        .command('verify <runId>')
        .description('Verify linkage between run, provenance, and SBOM hashes')
        .option('--json', 'Output as JSON')
        .action(async (runId, options) => {
        const spinner = (0, ora_1.default)(`Verifying run ${runId}...`).start();
        try {
            const url = `${config.apiUrl}/api/explainability/runs/${runId}/verify`;
            const response = await fetch(url, {
                headers: {
                    ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
                },
            });
            const result = await response.json();
            spinner.stop();
            if (!result.success) {
                console.error(chalk_1.default.red('Error:'), result.errors?.[0]?.message || 'Unknown error');
                process.exit(1);
            }
            const verification = result.data;
            if (options.json) {
                console.log(JSON.stringify(verification, null, 2));
            }
            else {
                console.log(chalk_1.default.bold.cyan('\n=== Verification Report ===\n'));
                console.log(chalk_1.default.bold('Run ID:'), verification.run_id);
                console.log(chalk_1.default.bold('Overall Status:'), verification.verified ? chalk_1.default.green('✓ VERIFIED') : chalk_1.default.red('✗ FAILED'));
                console.log(chalk_1.default.bold.cyan('\n--- Checks ---'));
                Object.entries(verification.checks).forEach(([check, passed]) => {
                    const icon = passed ? chalk_1.default.green('✓') : chalk_1.default.red('✗');
                    console.log(`  ${icon} ${check}`);
                });
                if (verification.issues && verification.issues.length > 0) {
                    console.log(chalk_1.default.bold.yellow('\n--- Issues ---'));
                    verification.issues.forEach((issue) => {
                        console.log(chalk_1.default.yellow(`  ⚠ ${issue}`));
                    });
                }
                console.log('');
            }
        }
        catch (error) {
            spinner.stop();
            console.error(chalk_1.default.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
            process.exit(1);
        }
    });
    /**
     * Compare two runs
     */
    explainGroup
        .command('compare <runIdA> <runIdB>')
        .description('Compare two runs and show deltas')
        .option('--json', 'Output as JSON')
        .action(async (runIdA, runIdB, options) => {
        const spinner = (0, ora_1.default)(`Comparing runs...`).start();
        try {
            const url = `${config.apiUrl}/api/explainability/compare?run_a=${runIdA}&run_b=${runIdB}`;
            const response = await fetch(url, {
                headers: {
                    ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
                },
            });
            const result = await response.json();
            spinner.stop();
            if (!result.success) {
                console.error(chalk_1.default.red('Error:'), result.errors?.[0]?.message || 'Unknown error');
                process.exit(1);
            }
            const comparison = result.data;
            if (options.json) {
                console.log(JSON.stringify(comparison, null, 2));
            }
            else {
                console.log(chalk_1.default.bold.cyan('\n=== Run Comparison ===\n'));
                console.log(chalk_1.default.bold('Run A:'), comparison.run_a.run_id);
                console.log(`  Type: ${comparison.run_a.run_type}`);
                console.log(`  Confidence: ${(comparison.run_a.confidence.overall_confidence * 100).toFixed(0)}%`);
                console.log(chalk_1.default.bold('\nRun B:'), comparison.run_b.run_id);
                console.log(`  Type: ${comparison.run_b.run_type}`);
                console.log(`  Confidence: ${(comparison.run_b.confidence.overall_confidence * 100).toFixed(0)}%`);
                console.log(chalk_1.default.bold.cyan('\n--- Deltas ---'));
                const confidenceDelta = comparison.deltas.confidence_delta * 100;
                const confidenceDeltaStr = confidenceDelta > 0 ? chalk_1.default.green(`+${confidenceDelta.toFixed(1)}%`) : chalk_1.default.red(`${confidenceDelta.toFixed(1)}%`);
                console.log(chalk_1.default.bold('Confidence Delta:'), confidenceDeltaStr);
                if (comparison.deltas.duration_delta_ms !== null) {
                    const durationDelta = comparison.deltas.duration_delta_ms / 1000;
                    const durationDeltaStr = durationDelta > 0 ? chalk_1.default.red(`+${durationDelta.toFixed(2)}s`) : chalk_1.default.green(`${durationDelta.toFixed(2)}s`);
                    console.log(chalk_1.default.bold('Duration Delta:'), durationDeltaStr);
                }
                if (comparison.deltas.different_capabilities.length > 0) {
                    console.log(chalk_1.default.bold('\nDifferent Capabilities:'));
                    comparison.deltas.different_capabilities.forEach((cap) => {
                        console.log(`  - ${cap}`);
                    });
                }
                if (comparison.deltas.different_policies.length > 0) {
                    console.log(chalk_1.default.bold('\nDifferent Policies:'));
                    comparison.deltas.different_policies.forEach((policy) => {
                        console.log(`  - ${policy}`);
                    });
                }
                if (Object.keys(comparison.deltas.input_diff).length > 0) {
                    console.log(chalk_1.default.bold('\nInput Differences:'));
                    console.log(JSON.stringify(comparison.deltas.input_diff, null, 2));
                }
                if (Object.keys(comparison.deltas.output_diff).length > 0) {
                    console.log(chalk_1.default.bold('\nOutput Differences:'));
                    console.log(JSON.stringify(comparison.deltas.output_diff, null, 2));
                }
                console.log('');
            }
        }
        catch (error) {
            spinner.stop();
            console.error(chalk_1.default.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
            process.exit(1);
        }
    });
}
