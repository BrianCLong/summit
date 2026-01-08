import { exec } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import {
  EvalCustomer,
  ProvisioningCommandTemplate,
  ProvisioningExecutor,
  ProvisioningOptions,
  ProvisioningResult,
} from "./types";

const execAsync = promisify(exec);

export class ShellProvisioningExecutor implements ProvisioningExecutor {
  async execute(command: string, env: Record<string, string> = {}, cwd?: string) {
    const { stdout, stderr } = await execAsync(command, { env: { ...process.env, ...env }, cwd });
    return { stdout, stderr };
  }
}

export class MultiEvalProvisioner {
  private readonly executor: ProvisioningExecutor;

  constructor(executor?: ProvisioningExecutor) {
    this.executor = executor ?? new ShellProvisioningExecutor();
  }

  async provision(
    customers: EvalCustomer[],
    template: ProvisioningCommandTemplate,
    options: ProvisioningOptions = {}
  ): Promise<ProvisioningResult[]> {
    if (customers.length === 0) {
      return [];
    }

    const concurrency = Math.max(1, options.concurrency ?? 4);
    const baseNamespace = options.baseNamespace ?? "eval";
    const workingDirectory = resolve(options.workingDirectory ?? process.cwd());
    const artifactRoot = resolve(options.artifactRoot ?? join(workingDirectory, "eval-artifacts"));
    mkdirSync(artifactRoot, { recursive: true });

    const queue = [...customers];
    const active: Promise<ProvisioningResult>[] = [];
    const results: ProvisioningResult[] = [];

    const runNext = async (): Promise<void> => {
      const next = queue.shift();
      if (!next) return;
      const envName = `${baseNamespace}-${next.id}`;
      const startedAt = Date.now();
      const artifactsPath = join(artifactRoot, envName);
      mkdirSync(artifactsPath, { recursive: true });

      const command = this.interpolate(template.command, next.templateValues, envName);
      const envVars = {
        ...template.environment,
        ...next.templateValues,
        ENVIRONMENT_NAME: envName,
      };

      let status: ProvisioningResult["status"] = "succeeded";
      let stdout = "";
      let stderr = "";
      if (options.dryRun) {
        stdout = `[dry-run] ${command}`;
      } else {
        try {
          const output = await this.executor.execute(command, envVars, workingDirectory);
          stdout = output.stdout;
          stderr = output.stderr;
        } catch (error) {
          status = "failed";
          stderr = (error as Error).message;
        }
      }

      const finishedAt = Date.now();
      const result: ProvisioningResult = {
        customerId: next.id,
        environmentName: envName,
        startedAt,
        finishedAt,
        status,
        stdout,
        stderr,
        artifactsPath,
      };

      writeFileSync(
        join(artifactsPath, "provisioning.json"),
        JSON.stringify(result, null, 2),
        "utf8"
      );
      results.push(result);
      await runNext();
    };

    while (active.length < concurrency && queue.length > 0) {
      const task = runNext();
      active.push(task as unknown as Promise<ProvisioningResult>);
    }

    await Promise.all(active);
    return results;
  }

  private interpolate(command: string, values: Record<string, string>, envName: string): string {
    return command
      .replace(/\{\{env\}\}/g, envName)
      .replace(/\{\{([a-zA-Z0-9_\-]+)\}\}/g, (_, key: string) => values[key] ?? "");
  }
}
