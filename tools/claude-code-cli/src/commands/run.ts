/**
 * Run Command
 *
 * Execute a Claude Code agent task with deterministic behavior.
 */

import { glob } from 'glob';
import type { Command } from 'commander';
import type { CLIOutputSchema, Diagnostic, GlobalOptions } from '../types/index.js';
import { deterministicSort, getNormalizedEnv } from '../utils/env.js';
import { buildJsonOutput, isJsonOutput, log, outputResult } from '../utils/output.js';

/**
 * Result of analyzing a directory
 */
interface AnalyzeResult {
  root: string;
  files: string[];
  fileCount: number;
  directories: string[];
  directoryCount: number;
}

/**
 * Analyze a directory and return deterministic file listing
 */
async function analyzeDirectory(root: string): Promise<AnalyzeResult> {
  const files = await glob('**/*', {
    cwd: root,
    nodir: true,
    ignore: ['node_modules/**', '.git/**', 'dist/**', 'coverage/**'],
  });

  const directories = await glob('**/', {
    cwd: root,
    ignore: ['node_modules/**', '.git/**', 'dist/**', 'coverage/**'],
  });

  // Sort for deterministic output
  const sortedFiles = deterministicSort(files);
  const sortedDirs = deterministicSort(directories);

  return {
    root,
    files: sortedFiles,
    fileCount: sortedFiles.length,
    directories: sortedDirs,
    directoryCount: sortedDirs.length,
  };
}

/**
 * Register the run command
 */
export function registerRunCommand(program: Command): void {
  program
    .command('run')
    .description('Execute a Claude Code task')
    .argument('[task]', 'Task to execute (analyze, etc.)', 'analyze')
    .argument('[path]', 'Path to operate on', '.')
    .action(async (task: string, path: string, _options: unknown, cmd: Command) => {
      const startTime = Date.now();
      const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
      const normalizedEnv = getNormalizedEnv({ tz: globalOpts.tz, locale: globalOpts.locale });

      const diagnostics: Diagnostic[] = [];
      let status: 'success' | 'error' = 'success';
      let result: unknown;

      try {
        switch (task) {
          case 'analyze': {
            log(`Analyzing ${path}...`, 'info');
            result = await analyzeDirectory(path);
            log(`Found ${(result as AnalyzeResult).fileCount} files`, 'info');
            break;
          }
          default: {
            status = 'error';
            diagnostics.push({
              level: 'error',
              message: `Unknown task: ${task}`,
              code: 'UNKNOWN_TASK',
            });
          }
        }
      } catch (err) {
        status = 'error';
        diagnostics.push({
          level: 'error',
          message: err instanceof Error ? err.message : String(err),
          code: 'EXECUTION_ERROR',
        });
      }

      const output: CLIOutputSchema = buildJsonOutput(
        `run ${task}`,
        [path],
        normalizedEnv,
        status,
        result,
        diagnostics,
        startTime
      );

      outputResult(output);

      if (status === 'error') {
        process.exit(2);
      }
    });
}
