/**
 * Bash operator for executing shell commands
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { Operator, ExecutionContext } from '@summit/dag-engine';

const execAsync = promisify(exec);

export interface BashOperatorConfig {
  command: string;
  env?: Record<string, string>;
  cwd?: string;
  timeout?: number;
  shell?: string;
}

export class BashOperator implements Operator {
  private config: BashOperatorConfig;

  constructor(config: BashOperatorConfig) {
    this.config = config;
  }

  async execute(context: ExecutionContext): Promise<any> {
    const { command, env, cwd, timeout, shell } = this.config;

    try {
      const { stdout, stderr } = await execAsync(command, {
        env: { ...process.env, ...env },
        cwd,
        timeout,
        shell,
      });

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      };
    } catch (error: any) {
      throw new Error(
        `Bash command failed: ${error.message}\nStdout: ${error.stdout}\nStderr: ${error.stderr}`
      );
    }
  }
}
