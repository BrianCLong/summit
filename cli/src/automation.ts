import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type AutomationWorkflowName = "init" | "check" | "test" | "release-dry-run";

type StepStatus = "success" | "failed";

export interface AutomationStep {
  name: string;
  command: string;
  description?: string;
}

export interface AutomationStepResult extends AutomationStep {
  status: StepStatus;
  exitCode: number;
  stdout: string;
  stderr: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface AutomationReport {
  workflow: AutomationWorkflowName;
  results: AutomationStepResult[];
  summary: {
    total: number;
    successCount: number;
    failedCount: number;
    durationMs: number;
    startedAt: string;
    finishedAt: string;
  };
}

export type AutomationRunner = (
  command: string,
  cwd?: string
) => Promise<{ stdout: string; stderr: string; exitCode: number }>;

export interface AutomationOptions {
  cwd?: string;
  runner?: AutomationRunner;
}

const defaultRunner: AutomationRunner = async (command: string, cwd?: string) => {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      env: { ...process.env, FORCE_COLOR: "0" },
      shell: "/bin/bash",
    });

    return {
      stdout,
      stderr,
      exitCode: 0,
    };
  } catch (error: any) {
    return {
      stdout: error?.stdout ?? "",
      stderr: error?.stderr ?? (error instanceof Error ? error.message : ""),
      exitCode: typeof error?.code === "number" ? error.code : 1,
    };
  }
};

export const AUTOMATION_WORKFLOWS: Record<AutomationWorkflowName, AutomationStep[]> = {
  init: [
    {
      name: "bootstrap",
      command: "make bootstrap",
      description: "Install dependencies, prepare .env, and prime tooling",
    },
    {
      name: "bring-up-stack",
      command: "make up",
      description: "Start local development stack (Docker compose)",
    },
  ],
  check: [
    {
      name: "lint",
      command: "npm run lint",
      description: "Run lint + formatting checks across the workspace",
    },
    {
      name: "typecheck",
      command: "npm run typecheck",
      description: "Type-check the monorepo (tsc -b)",
    },
  ],
  test: [
    {
      name: "unit-and-integration",
      command: "npm test -- --runInBand",
      description: "Execute unit/integration test suites",
    },
  ],
  "release-dry-run": [
    {
      name: "changeset-status",
      command: "npx changeset status --output=.changeset-status.json",
      description: "Summarize pending release changes without mutating versions",
    },
    {
      name: "semantic-release-dry-run",
      command: "npm run release -- --dry-run",
      description: "Validate release pipeline without publishing artifacts",
    },
  ],
};

export async function runAutomationWorkflow(
  workflow: AutomationWorkflowName,
  options: AutomationOptions = {}
): Promise<AutomationReport> {
  const steps = AUTOMATION_WORKFLOWS[workflow];
  if (!steps) {
    throw new Error(`Unknown workflow: ${workflow}`);
  }

  const results: AutomationStepResult[] = [];
  const startedAt = new Date();

  for (const step of steps) {
    const stepStart = Date.now();
    const runner = options.runner ?? defaultRunner;
    const { stdout, stderr, exitCode } = await runner(step.command, options.cwd);
    const finishedAt = new Date();

    results.push({
      ...step,
      status: exitCode === 0 ? "success" : "failed",
      exitCode,
      stdout: stdout ?? "",
      stderr: stderr ?? "",
      startedAt: new Date(stepStart).toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - stepStart,
    });
  }

  const finishedAt = new Date();
  const successCount = results.filter((r) => r.status === "success").length;
  const failedCount = results.filter((r) => r.status === "failed").length;

  return {
    workflow,
    results,
    summary: {
      total: results.length,
      successCount,
      failedCount,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
    },
  };
}
