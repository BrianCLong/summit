/**
 * Run Command
 *
 * Orchestrates policy evaluation, sandbox guardrails, and execution
 * with git-native atomic PR workflow support.
 */

import { Command } from "commander";
import * as fs from "fs";
import { EXIT_CODES } from "../lib/constants.js";
import { PolicyGate, PolicyError, PolicyAction } from "../lib/policy.js";
import { Sandbox, SandboxError, createSandbox, detectRepoRoot } from "../lib/sandbox.js";
import {
  GitWorkflow,
  GitWorkflowError,
  createGitWorkflow,
  getGitStatus,
} from "../lib/git-workflow.js";
import {
  ProviderWrapper,
  ProviderError,
  BudgetExceededError,
  createProviderWrapper,
} from "../lib/provider.js";
import {
  Session,
  createSession,
  listSessions,
  loadSession,
  cleanOldSessions,
} from "../lib/session.js";
import {
  replaySession,
  formatSummaryText,
  formatSummaryJson,
  writeReportArtifact,
} from "../lib/replay.js";
import { EventLogger, createEventLogger } from "../lib/event-logger.js";

/**
 * Run command options
 */
interface RunOptions {
  ci: boolean;
  policyBundle?: string;
  allowPath: string[];
  denyPath: string[];
  allowTool: string[];
  toolTimeoutMs: number;
  allowNetwork: boolean;
  allowDotenv: boolean;
  unsafeAllowSensitivePaths: boolean;
  branch?: string;
  allowDirty: boolean;
  commit: boolean;
  commitMessage?: string;
  generateReview: boolean;
  reviewPath?: string;
  output: "text" | "json";
  dryRun: boolean;
  // Provider reliability options
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  timeoutMs: number;
  budgetMs: number | null;
  maxRequests: number | null;
  tokenBudget: number | null;
  sessionId?: string;
  // Event logging options
  includeTimestamps: boolean;
  unsafeLogPrompts: boolean;
}

/**
 * Execution context with all modules initialized
 */
interface ExecutionContext {
  policyGate: PolicyGate;
  sandbox: Sandbox;
  gitWorkflow: GitWorkflow;
  provider: ProviderWrapper;
  session: Session;
  eventLogger: EventLogger;
  repoRoot: string;
  options: RunOptions;
}

/**
 * Output formatter for deterministic output
 */
function formatOutput(data: unknown, format: "text" | "json"): string {
  if (format === "json") {
    return JSON.stringify(data, Object.keys(data as object).sort(), 2);
  }
  if (typeof data === "string") {
    return data;
  }
  return String(data);
}

/**
 * Handle errors with appropriate exit codes
 */
function handleRunError(error: unknown): never {
  if (error instanceof PolicyError) {
    console.error(error.format());
    process.exit(error.exitCode);
  }
  if (error instanceof SandboxError) {
    console.error(error.format());
    process.exit(error.exitCode);
  }
  if (error instanceof GitWorkflowError) {
    console.error(error.format());
    process.exit(error.exitCode);
  }
  if (error instanceof ProviderError) {
    console.error(error.format());
    process.exit(error.exitCode);
  }
  if (error instanceof BudgetExceededError) {
    console.error(error.format());
    process.exit(error.exitCode);
  }
  if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
    process.exit(EXIT_CODES.GENERAL_ERROR);
  }
  console.error("Unknown error:", String(error));
  process.exit(EXIT_CODES.GENERAL_ERROR);
}

/**
 * Initialize execution context
 */
async function initializeContext(options: RunOptions): Promise<ExecutionContext> {
  // Detect repo root
  const repoRoot = detectRepoRoot(process.cwd());

  // Initialize policy gate
  const policyGate = new PolicyGate({
    ci: options.ci,
    policyBundle: options.policyBundle,
    repoRoot,
  });
  policyGate.initialize();

  // Initialize sandbox
  const sandbox = createSandbox({
    repoRoot,
    allowPaths: options.allowPath,
    denyPaths: options.denyPath,
    allowTools: options.allowTool,
    toolTimeoutMs: options.toolTimeoutMs,
    allowNetwork: options.allowNetwork,
    allowDotenv: options.allowDotenv,
    unsafeAllowSensitivePaths: options.unsafeAllowSensitivePaths,
    ci: options.ci,
  });

  // Initialize git workflow
  const gitWorkflow = createGitWorkflow({
    repoRoot,
    allowDirty: options.allowDirty,
    branch: options.branch,
    commit: options.commit,
    commitMessage: options.commitMessage,
    generateReview: options.generateReview,
    reviewPath: options.reviewPath,
  });
  await gitWorkflow.initialize();

  // Initialize provider wrapper
  const provider = createProviderWrapper("cli", {
    maxRetries: options.maxRetries,
    initialBackoffMs: options.initialBackoffMs,
    maxBackoffMs: options.maxBackoffMs,
    timeoutMs: options.timeoutMs,
    budgetMs: options.budgetMs,
    maxRequests: options.maxRequests,
    tokenBudget: options.tokenBudget,
    ci: options.ci,
    sessionId: options.sessionId,
    allowNetwork: options.allowNetwork,
  });

  // Initialize session for tracking
  const session = createSession({
    repoRoot,
    command: "run",
    flags: options as unknown as Record<string, unknown>,
    deterministicId: options.ci,
    seed: options.sessionId,
  });

  // Initialize event logger
  const sessionDir = `${repoRoot}/.claude/sessions`;
  const eventLogger = createEventLogger({
    sessionDir,
    runId: session.getSessionId(),
    includeTimestamps: options.includeTimestamps,
    unsafeLogPrompts: options.unsafeLogPrompts,
  });

  return { policyGate, sandbox, gitWorkflow, provider, session, eventLogger, repoRoot, options };
}

/**
 * Execute an action with policy and sandbox checks
 */
async function executeAction(
  ctx: ExecutionContext,
  action: PolicyAction
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const startTime = Date.now();

  // Evaluate policy
  const decision = ctx.policyGate.evaluate("run", { write: action.type === "write_patch" }, [
    action,
  ]);

  // Record policy evaluation
  ctx.session.recordOperation(
    "policy",
    action.type,
    decision.allow ? "allowed" : "denied",
    { action_type: action.type },
    Date.now() - startTime
  );

  if (!decision.allow) {
    return {
      success: false,
      error: `Policy denied: ${decision.deny_reasons.join(", ")}`,
    };
  }

  // Execute based on action type
  switch (action.type) {
    case "read_file": {
      const readAction = action as { type: "read_file"; path: string };
      const opStart = Date.now();
      try {
        const content = ctx.sandbox.readFile(readAction.path);
        const duration = Date.now() - opStart;
        ctx.session.recordOperation(
          "read",
          readAction.path,
          "success",
          { size: content.length },
          duration
        );
        // Log file read action
        ctx.eventLogger.logAction({
          action_type: "read",
          affected_files: [readAction.path],
        });
        return { success: true, result: { path: readAction.path, content } };
      } catch (error) {
        ctx.session.recordOperation(
          "read",
          readAction.path,
          "failure",
          { error: error instanceof Error ? error.message : String(error) },
          Date.now() - opStart
        );
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    case "write_patch": {
      const writeAction = action as {
        type: "write_patch";
        files: string[];
        diff_bytes: number;
      };
      // In dry-run mode, just report what would happen
      if (ctx.options.dryRun) {
        ctx.session.recordOperation("write", writeAction.files.join(","), "success", {
          dryRun: true,
          diffBytes: writeAction.diff_bytes,
        });
        return {
          success: true,
          result: {
            dryRun: true,
            wouldWrite: writeAction.files,
            diffBytes: writeAction.diff_bytes,
          },
        };
      }
      ctx.session.recordOperation("write", writeAction.files.join(","), "success", {
        filesCount: writeAction.files.length,
        diffBytes: writeAction.diff_bytes,
      });
      // Log file write action
      ctx.eventLogger.logAction({
        action_type: "write",
        affected_files: writeAction.files,
        diff_bytes: writeAction.diff_bytes,
      });
      return { success: true, result: { files: writeAction.files } };
    }

    case "exec_tool": {
      const execAction = action as {
        type: "exec_tool";
        tool: string;
        args: string[];
      };
      const opStart = Date.now();
      try {
        const result = await ctx.sandbox.execTool(execAction.tool, execAction.args);
        const duration = Date.now() - opStart;
        ctx.session.recordOperation(
          "exec",
          execAction.tool,
          result.exitCode === 0 ? "success" : "failure",
          { args: execAction.args, exitCode: result.exitCode },
          duration
        );
        // Log tool execution
        ctx.eventLogger.logToolExec({
          tool: execAction.tool,
          args: execAction.args,
          exit_code: result.exitCode,
          timeout: result.timedOut,
          duration_ms: duration,
        });
        return { success: result.exitCode === 0, result };
      } catch (error) {
        const duration = Date.now() - opStart;
        ctx.session.recordOperation(
          "exec",
          execAction.tool,
          "failure",
          { args: execAction.args, error: error instanceof Error ? error.message : String(error) },
          duration
        );
        // Log failed tool execution
        ctx.eventLogger.logToolExec({
          tool: execAction.tool,
          args: execAction.args,
          exit_code: 1,
          timeout: false,
          duration_ms: duration,
        });
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    case "network": {
      const opStart = Date.now();
      try {
        ctx.sandbox.checkNetwork();
        ctx.session.recordOperation("network", "check", "allowed", {}, Date.now() - opStart);
        return { success: true, result: { networkAllowed: true } };
      } catch (error) {
        ctx.session.recordOperation(
          "network",
          "check",
          "denied",
          { error: error instanceof Error ? error.message : String(error) },
          Date.now() - opStart
        );
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    default:
      return { success: false, error: `Unknown action type: ${(action as { type: string }).type}` };
  }
}

/**
 * Run status subcommand - show git and sandbox status
 */
async function runStatus(options: RunOptions): Promise<void> {
  const repoRoot = detectRepoRoot(process.cwd());
  const gitStatus = await getGitStatus(repoRoot);

  const status = {
    repoRoot,
    git: gitStatus,
    policy: {
      ci: options.ci,
      bundlePresent: options.policyBundle ? fs.existsSync(options.policyBundle) : false,
      bundlePath: options.policyBundle || null,
    },
    sandbox: {
      allowPaths: options.allowPath,
      denyPaths: options.denyPath,
      allowTools: options.allowTool,
      allowNetwork: options.allowNetwork,
      allowDotenv: options.allowDotenv,
    },
  };

  console.log(formatOutput(status, options.output));
}

/**
 * Run check subcommand - validate policy and sandbox configuration
 */
async function runCheck(options: RunOptions): Promise<void> {
  try {
    const ctx = await initializeContext(options);
    const status = ctx.gitWorkflow.getStatus();

    const result = {
      valid: true,
      repoRoot: ctx.repoRoot,
      git: {
        branch: status.branch,
        isDirty: status.isDirty,
        ahead: status.ahead,
        behind: status.behind,
      },
      policy: {
        loaded: ctx.policyGate.isPolicyLoaded(),
      },
      sandbox: {
        allowPaths: ctx.sandbox.getAllowPaths(),
        denyPatterns: ctx.sandbox.getDenyPatterns(),
      },
    };

    console.log(formatOutput(result, options.output));
  } catch (error) {
    handleRunError(error);
  }
}

/**
 * Run exec subcommand - execute a tool with sandbox restrictions
 */
async function runExec(tool: string, args: string[], options: RunOptions): Promise<void> {
  let ctx: ExecutionContext | undefined;
  const startTime = Date.now();
  try {
    ctx = await initializeContext(options);

    // Log run start
    ctx.eventLogger.logRunStart({
      command: "exec",
      args: [tool, ...args],
      normalized_env: {},
      repo_root: ctx.repoRoot,
      policy_enabled: ctx.policyGate.isPolicyLoaded(),
      sandbox_enabled: true,
    });

    ctx.eventLogger.logStepStart({
      step_name: "execute_tool",
      step_id: "step-1",
    });

    const action: PolicyAction = {
      type: "exec_tool",
      tool,
      args,
    };

    // executeAction logs the tool execution via logToolExec
    const result = await executeAction(ctx, action);

    if (!result.success) {
      ctx.eventLogger.logError({
        category: "execution",
        message: result.error || "Unknown error",
        deny_reasons: [],
      });
      ctx.eventLogger.logRunEnd({
        status: "failed",
        duration_ms: Date.now() - startTime,
        diagnostics: {
          total_operations: 1,
          files_read: 0,
          files_written: 0,
          tools_executed: 1,
          provider_calls: 0,
          retries: 0,
          errors: 1,
          denied: 0,
        },
      });
      ctx.session.fail(result.error);
      console.error(`Execution failed: ${result.error}`);
      process.exit(EXIT_CODES.GENERAL_ERROR);
    }

    // Log run end
    ctx.eventLogger.logRunEnd({
      status: "completed",
      duration_ms: Date.now() - startTime,
      diagnostics: {
        total_operations: 1,
        files_read: 0,
        files_written: 0,
        tools_executed: 1,
        provider_calls: 0,
        retries: 0,
        errors: 0,
        denied: 0,
      },
    });

    ctx.session.complete();
    console.log(formatOutput(result.result, options.output));
  } catch (error) {
    ctx?.eventLogger?.logError({
      category: "exception",
      message: error instanceof Error ? error.message : String(error),
      deny_reasons: [],
    });
    ctx?.eventLogger?.logRunEnd({
      status: "failed",
      duration_ms: Date.now() - startTime,
      diagnostics: {
        total_operations: 1,
        files_read: 0,
        files_written: 0,
        tools_executed: 1,
        provider_calls: 0,
        retries: 0,
        errors: 1,
        denied: 0,
      },
    });
    ctx?.session?.fail(error instanceof Error ? error.message : String(error));
    handleRunError(error);
  }
}

/**
 * Run commit subcommand - create a commit with optional review artifact
 */
async function runCommit(message: string, options: RunOptions): Promise<void> {
  let ctx: ExecutionContext | undefined;
  try {
    ctx = await initializeContext({
      ...options,
      commit: true,
      commitMessage: message,
    });

    // Log run start
    ctx.eventLogger.logRunStart({
      command: "commit",
      args: [message],
      normalized_env: {},
      repo_root: ctx.repoRoot,
      branch: ctx.gitWorkflow.getStatus().branch ?? undefined,
      policy_enabled: ctx.policyGate.isPolicyLoaded(),
      sandbox_enabled: true,
    });

    ctx.eventLogger.logStepStart({
      step_name: "stage_changes",
      step_id: "step-1",
    });

    // Stage all changes if dirty and allowed
    const status = ctx.gitWorkflow.getStatus();
    if (status.isDirty) {
      await ctx.gitWorkflow.stageAll();
    }

    ctx.eventLogger.logStepStart({
      step_name: "create_commit",
      step_id: "step-2",
    });

    // Create commit
    const commitHash = await ctx.gitWorkflow.commit(message);
    ctx.session.recordOperation("git", "commit", "success", { commitHash });

    // Generate review if requested
    let reviewPath: string | undefined;
    let filesWritten = 0;
    if (options.generateReview) {
      ctx.eventLogger.logStepStart({
        step_name: "generate_review",
        step_id: "step-3",
      });

      const review = await ctx.gitWorkflow.generateReview("main");
      reviewPath = await ctx.gitWorkflow.writeReviewFile(review, options.reviewPath || "review.md");
      ctx.session.recordOperation("write", reviewPath, "success", { type: "review" });

      ctx.eventLogger.logAction({
        action_type: "write",
        affected_files: [reviewPath],
      });
      filesWritten = 1;
    }

    // Log run end
    ctx.eventLogger.logRunEnd({
      status: "completed",
      diagnostics: {
        total_operations: options.generateReview ? 3 : 2,
        files_read: 0,
        files_written: filesWritten,
        tools_executed: 0,
        provider_calls: 0,
        retries: 0,
        errors: 0,
        denied: 0,
      },
    });

    ctx.session.complete();
    const result = {
      commitHash,
      message,
      reviewPath,
      sessionId: ctx.session.getSessionId(),
    };

    console.log(formatOutput(result, options.output));
  } catch (error) {
    ctx?.eventLogger?.logError({
      category: "git",
      message: error instanceof Error ? error.message : String(error),
      deny_reasons: [],
    });
    ctx?.eventLogger?.logRunEnd({
      status: "failed",
      diagnostics: {
        total_operations: 1,
        files_read: 0,
        files_written: 0,
        tools_executed: 0,
        provider_calls: 0,
        retries: 0,
        errors: 1,
        denied: 0,
      },
    });
    ctx?.session?.fail(error instanceof Error ? error.message : String(error));
    handleRunError(error);
  }
}

/**
 * Run branch subcommand - create or switch to a branch
 */
async function runBranch(branchName: string, options: RunOptions): Promise<void> {
  let ctx: ExecutionContext | undefined;
  try {
    ctx = await initializeContext({
      ...options,
      branch: branchName,
    });

    // Log run start
    ctx.eventLogger.logRunStart({
      command: "branch",
      args: [branchName],
      normalized_env: {},
      repo_root: ctx.repoRoot,
      policy_enabled: ctx.policyGate.isPolicyLoaded(),
      sandbox_enabled: true,
    });

    ctx.eventLogger.logStepStart({
      step_name: "create_branch",
      step_id: "step-1",
    });

    await ctx.gitWorkflow.createBranch(branchName);
    ctx.session.recordOperation("git", "branch", "success", { branchName });

    const status = ctx.gitWorkflow.getStatus();

    // Log run end
    ctx.eventLogger.logRunEnd({
      status: "completed",
      diagnostics: {
        total_operations: 1,
        files_read: 0,
        files_written: 0,
        tools_executed: 0,
        provider_calls: 0,
        retries: 0,
        errors: 0,
        denied: 0,
      },
    });

    ctx.session.complete();

    const result = {
      branch: status.branch,
      created: true,
      sessionId: ctx.session.getSessionId(),
    };

    console.log(formatOutput(result, options.output));
  } catch (error) {
    ctx?.eventLogger?.logError({
      category: "git",
      message: error instanceof Error ? error.message : String(error),
      deny_reasons: [],
    });
    ctx?.eventLogger?.logRunEnd({
      status: "failed",
      diagnostics: {
        total_operations: 1,
        files_read: 0,
        files_written: 0,
        tools_executed: 0,
        provider_calls: 0,
        retries: 0,
        errors: 1,
        denied: 0,
      },
    });
    ctx?.session?.fail(error instanceof Error ? error.message : String(error));
    handleRunError(error);
  }
}

/**
 * Run review subcommand - generate review.md artifact
 */
async function runReview(baseBranch: string, options: RunOptions): Promise<void> {
  let ctx: ExecutionContext | undefined;
  try {
    ctx = await initializeContext(options);

    // Log run start
    ctx.eventLogger.logRunStart({
      command: "review",
      args: [baseBranch],
      normalized_env: {},
      repo_root: ctx.repoRoot,
      branch: ctx.gitWorkflow.getStatus().branch ?? undefined,
      policy_enabled: ctx.policyGate.isPolicyLoaded(),
      sandbox_enabled: true,
    });

    ctx.eventLogger.logStepStart({
      step_name: "generate_review",
      step_id: "step-1",
    });

    const review = await ctx.gitWorkflow.generateReview(baseBranch);

    ctx.eventLogger.logStepStart({
      step_name: "write_review",
      step_id: "step-2",
    });

    const reviewPath = await ctx.gitWorkflow.writeReviewFile(
      review,
      options.reviewPath || "review.md"
    );
    ctx.session.recordOperation("write", reviewPath, "success", { type: "review" });

    ctx.eventLogger.logAction({
      action_type: "write",
      affected_files: [reviewPath],
    });

    // Log run end
    ctx.eventLogger.logRunEnd({
      status: "completed",
      diagnostics: {
        total_operations: 2,
        files_read: 0,
        files_written: 1,
        tools_executed: 0,
        provider_calls: 0,
        retries: 0,
        errors: 0,
        denied: 0,
      },
    });

    ctx.session.complete();

    console.log(
      formatOutput({ reviewPath, ...review, sessionId: ctx.session.getSessionId() }, options.output)
    );
  } catch (error) {
    ctx?.eventLogger?.logError({
      category: "git",
      message: error instanceof Error ? error.message : String(error),
      deny_reasons: [],
    });
    ctx?.eventLogger?.logRunEnd({
      status: "failed",
      diagnostics: {
        total_operations: 1,
        files_read: 0,
        files_written: 0,
        tools_executed: 0,
        provider_calls: 0,
        retries: 0,
        errors: 1,
        denied: 0,
      },
    });
    ctx?.session?.fail(error instanceof Error ? error.message : String(error));
    handleRunError(error);
  }
}

/**
 * Register run commands
 */
export function registerRunCommands(program: Command): void {
  const run = program
    .command("run")
    .description("Execute commands with policy and sandbox guardrails");

  // Global options for all run subcommands
  const addGlobalOptions = (cmd: Command): Command => {
    return (
      cmd
        // Policy and sandbox options
        .option("--ci", "Enable CI mode (fail-closed policy)", false)
        .option("--policy-bundle <dir>", "Path to OPA policy bundle directory")
        .option("--allow-path <path...>", "Additional paths to allow access", [])
        .option("--deny-path <pattern...>", "Additional patterns to deny access", [])
        .option("--allow-tool <tool...>", "Tools allowed for execution", [])
        .option("--tool-timeout-ms <ms>", "Timeout for tool execution", "120000")
        .option("--allow-network", "Allow network access", false)
        .option("--allow-dotenv", "Allow .env file access", false)
        .option(
          "--unsafe-allow-sensitive-paths",
          "Disable hardcoded security patterns (dangerous)",
          false
        )
        // Git workflow options
        .option("--allow-dirty", "Allow operation with uncommitted changes", false)
        .option("--generate-review", "Generate review.md artifact", false)
        .option("--review-path <path>", "Path for review.md artifact", "review.md")
        // Provider reliability options
        .option("--max-retries <n>", "Maximum retry attempts for provider calls", "3")
        .option("--initial-backoff-ms <n>", "Initial backoff delay in ms", "500")
        .option("--max-backoff-ms <n>", "Maximum backoff delay in ms", "8000")
        .option("--timeout-ms <n>", "Per-request timeout in ms", "120000")
        .option("--budget-ms <n>", "Total time budget for run in ms")
        .option("--max-requests <n>", "Maximum provider requests allowed")
        .option("--token-budget <n>", "Maximum tokens to use")
        .option("--session-id <id>", "Session ID for deterministic jitter")
        // Event logging options
        .option("--include-timestamps", "Include timestamps in event logs", false)
        .option("--unsafe-log-prompts", "Log sensitive data without redaction (dangerous)", false)
        // Output options
        .option("-o, --output <format>", "Output format: text or json", "text")
        .option("--dry-run", "Show what would happen without executing", false)
    );
  };

  // Helper to parse options with provider defaults
  const parseOptions = (opts: Record<string, unknown>): RunOptions =>
    ({
      ...opts,
      toolTimeoutMs: parseInt(opts.toolTimeoutMs as string, 10),
      maxRetries: parseInt(opts.maxRetries as string, 10),
      initialBackoffMs: parseInt(opts.initialBackoffMs as string, 10),
      maxBackoffMs: parseInt(opts.maxBackoffMs as string, 10),
      timeoutMs: parseInt(opts.timeoutMs as string, 10),
      budgetMs: opts.budgetMs ? parseInt(opts.budgetMs as string, 10) : null,
      maxRequests: opts.maxRequests ? parseInt(opts.maxRequests as string, 10) : null,
      tokenBudget: opts.tokenBudget ? parseInt(opts.tokenBudget as string, 10) : null,
      includeTimestamps: Boolean(opts.includeTimestamps),
      unsafeLogPrompts: Boolean(opts.unsafeLogPrompts),
    }) as RunOptions;

  // run status
  addGlobalOptions(
    run.command("status").description("Show git, policy, and sandbox status")
  ).action(async (opts) => {
    await runStatus(parseOptions(opts));
  });

  // run check
  addGlobalOptions(
    run.command("check").description("Validate policy and sandbox configuration")
  ).action(async (opts) => {
    await runCheck(parseOptions(opts));
  });

  // run exec <tool> [args...]
  addGlobalOptions(
    run.command("exec <tool> [args...]").description("Execute a tool with sandbox restrictions")
  ).action(async (tool, args, opts) => {
    await runExec(tool, args, parseOptions(opts));
  });

  // run commit <message>
  addGlobalOptions(
    run.command("commit <message>").description("Create a commit with optional review artifact")
  ).action(async (message, opts) => {
    await runCommit(message, parseOptions(opts));
  });

  // run branch <name>
  addGlobalOptions(run.command("branch <name>").description("Create or switch to a branch")).action(
    async (name, opts) => {
      await runBranch(name, parseOptions(opts));
    }
  );

  // run review [base-branch]
  addGlobalOptions(
    run.command("review [base-branch]").description("Generate review.md artifact")
  ).action(async (baseBranch = "main", opts) => {
    await runReview(baseBranch, parseOptions(opts));
  });

  // run sessions - session management
  const sessions = run.command("sessions").description("Manage session audit trails");

  // run sessions list
  sessions
    .command("list")
    .option("-n, --limit <n>", "Maximum sessions to list", "10")
    .option("-o, --output <format>", "Output format: text or json", "text")
    .action(async (opts) => {
      const repoRoot = detectRepoRoot(process.cwd());
      const sessionDir = `${repoRoot}/.claude/sessions`;
      const allSessions = listSessions(sessionDir);
      const limit = parseInt(opts.limit, 10);
      const sessions = allSessions.slice(0, limit);

      if (opts.output === "json") {
        console.log(JSON.stringify(sessions, null, 2));
      } else {
        if (sessions.length === 0) {
          console.log("No sessions found.");
        } else {
          console.log(`Sessions (${sessions.length} of ${allSessions.length}):\n`);
          for (const s of sessions) {
            console.log(`  ${s.sessionId}`);
            console.log(`    Status: ${s.status}`);
            console.log(`    Command: ${s.command}`);
            console.log(`    Started: ${s.startTime}`);
            console.log(`    Operations: ${s.diagnostics.totalOperations}`);
            console.log("");
          }
        }
      }
    });

  // run sessions show <session-id>
  sessions
    .command("show <session-id>")
    .option("-o, --output <format>", "Output format: text or json", "text")
    .action(async (sessionId, opts) => {
      const repoRoot = detectRepoRoot(process.cwd());
      const sessionFile = `${repoRoot}/.claude/sessions/${sessionId}.json`;
      const session = loadSession(sessionFile);

      if (!session) {
        console.error(`Session not found: ${sessionId}`);
        process.exit(EXIT_CODES.GENERAL_ERROR);
      }

      if (opts.output === "json") {
        console.log(JSON.stringify(session, null, 2));
      } else {
        console.log(`Session: ${session.sessionId}`);
        console.log(`Status: ${session.status}`);
        console.log(`Command: ${session.command}`);
        console.log(`Started: ${session.startTime}`);
        if (session.endTime) {
          console.log(`Ended: ${session.endTime}`);
        }
        console.log(`\nDiagnostics:`);
        console.log(`  Total Operations: ${session.diagnostics.totalOperations}`);
        console.log(`  Files Read: ${session.diagnostics.filesRead}`);
        console.log(`  Files Written: ${session.diagnostics.filesWritten}`);
        console.log(`  Tools Executed: ${session.diagnostics.toolsExecuted}`);
        console.log(`  Network Calls: ${session.diagnostics.networkCalls}`);
        console.log(`  Git Operations: ${session.diagnostics.gitOperations}`);
        console.log(`  Policy Evaluations: ${session.diagnostics.policyEvaluations}`);
        console.log(`  Denied Operations: ${session.diagnostics.deniedOperations}`);
        console.log(`  Failed Operations: ${session.diagnostics.failedOperations}`);
        if (session.operations.length > 0) {
          console.log(`\nOperations:`);
          for (const op of session.operations) {
            console.log(`  [${op.timestamp}] ${op.type} ${op.target} - ${op.status}`);
          }
        }
      }
    });

  // run sessions clean
  sessions
    .command("clean")
    .option("--max-age-days <days>", "Maximum age of sessions to keep", "7")
    .action(async (opts) => {
      const repoRoot = detectRepoRoot(process.cwd());
      const sessionDir = `${repoRoot}/.claude/sessions`;
      const maxAgeDays = parseInt(opts.maxAgeDays, 10);
      const cleaned = cleanOldSessions(sessionDir, maxAgeDays);
      console.log(`Cleaned ${cleaned} session(s) older than ${maxAgeDays} days.`);
    });

  // run replay <session-id> - replay and summarize session events
  run
    .command("replay <session-id>")
    .description("Replay and summarize session events")
    .option("-o, --output <format>", "Output format: text or json", "text")
    .option("--write-report", "Generate replay.md report artifact", false)
    .action(async (sessionId, opts) => {
      const repoRoot = detectRepoRoot(process.cwd());
      const sessionDir = `${repoRoot}/.claude/sessions`;

      try {
        const { events, summary } = replaySession({
          sessionDir,
          runId: sessionId,
        });

        if (events.length === 0) {
          console.error(`Session not found or no events: ${sessionId}`);
          process.exit(EXIT_CODES.POLICY_ERROR);
        }

        // Output summary
        if (opts.output === "json") {
          console.log(formatSummaryJson(summary));
        } else {
          console.log(formatSummaryText(summary));
        }

        // Write report if requested
        if (opts.writeReport) {
          const reportPath = writeReportArtifact({ sessionDir, runId: sessionId }, summary, events);
          console.log(`\nReport written to: ${reportPath}`);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("ENOENT")) {
          console.error(`Session not found: ${sessionId}`);
          process.exit(EXIT_CODES.POLICY_ERROR);
        }
        console.error(
          `Error replaying session: ${error instanceof Error ? error.message : String(error)}`
        );
        process.exit(EXIT_CODES.GENERAL_ERROR);
      }
    });
}
