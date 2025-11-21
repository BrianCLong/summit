/**
 * Python operator for executing Python code
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { Operator, ExecutionContext } from '../types/dag-types.js';

const execAsync = promisify(exec);

export interface PythonOperatorConfig {
  pythonCode?: string;
  pythonCallable?: string;
  scriptPath?: string;
  pythonBinary?: string;
  env?: Record<string, string>;
  timeout?: number;
}

export class PythonOperator implements Operator {
  private config: PythonOperatorConfig;

  constructor(config: PythonOperatorConfig) {
    this.config = {
      pythonBinary: 'python3',
      ...config,
    };
  }

  async execute(context: ExecutionContext): Promise<any> {
    const { pythonCode, scriptPath, pythonBinary, env, timeout } = this.config;

    let tempFile: string | null = null;
    let scriptToExecute = scriptPath;

    try {
      // If python code is provided, write to temp file
      if (pythonCode) {
        tempFile = join(tmpdir(), `workflow_${context.executionId}_${Date.now()}.py`);
        await writeFile(tempFile, pythonCode);
        scriptToExecute = tempFile;
      }

      if (!scriptToExecute) {
        throw new Error('Either pythonCode or scriptPath must be provided');
      }

      const command = `${pythonBinary} ${scriptToExecute}`;
      const { stdout, stderr } = await execAsync(command, {
        env: { ...process.env, ...env },
        timeout,
      });

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0,
      };
    } catch (error: any) {
      throw new Error(
        `Python execution failed: ${error.message}\nStdout: ${error.stdout}\nStderr: ${error.stderr}`
      );
    } finally {
      // Clean up temp file
      if (tempFile) {
        try {
          await unlink(tempFile);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }
}
