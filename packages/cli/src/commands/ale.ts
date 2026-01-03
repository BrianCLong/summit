/* eslint-disable no-console */
import path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import {
  chunkTrajectory,
  evaluateTerminalBenchPro,
  readTrajectory,
  runInSandbox,
  TrajectoryRecorder,
} from '@summit/ale';

export const ale = new Command('ale')
  .description('ALE-inspired tooling: sandbox runner, trajectories, chunking, and benchmarks');

ale
  .command('record')
  .description('Run a command inside the ALE sandbox and record a trajectory JSONL')
  .requiredOption('-t, --trajectory <file>', 'Output trajectory file path')
  .option('-c, --cmd <command...>', 'Command to execute (default: echo hello)', ['echo', 'hello'])
  .option('--image <image>', 'Docker image to use', 'debian:stable-slim')
  .option('--network <mode>', 'Network mode (none|bridge)', 'none')
  .action(async (options) => {
    const recorder = new TrajectoryRecorder({ filePath: options.trajectory });
    await recorder.init();
    console.log(chalk.gray(`Recording trajectory to ${options.trajectory}`));
    try {
      await runInSandbox({
        cmd: options.cmd,
        image: options.image,
        network: options.network,
        recorder,
      });
      console.log(chalk.green('Execution recorded.'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(chalk.red(`Sandbox execution failed: ${message}`));
      process.exitCode = 1;
    }
  });

ale
  .command('replay')
  .description('Replay a trajectory file and print semantic interaction chunks')
  .argument('<trajectory>', 'Path to trajectory JSONL')
  .action(async (trajectoryPath) => {
    const trajectory = await readTrajectory(trajectoryPath);
    const chunks = chunkTrajectory(trajectory.steps);
    console.log(chalk.bold(`Run ${trajectory.header.run_id} | start ${trajectory.header.start_ts}`));
    trajectory.steps.forEach((step, idx) => {
      console.log(`${chalk.gray(idx.toString().padStart(3, '0'))} ${step.role}/${step.kind}: ${step.name ?? ''}`);
    });
    console.log('\nInteraction Chunks');
    chunks.forEach((chunk) => {
      console.log(
        `${chunk.chunk_id} steps ${chunk.step_start}-${chunk.step_end} tools=${chunk.tools_used.join(',') || 'none'} success=${
          chunk.success_signal ?? false
        }`,
      );
    });
  });

ale
  .command('summarize')
  .description('Summarize a trajectory into chunks and emit a quick report')
  .argument('<trajectory>', 'Path to trajectory JSONL')
  .action(async (trajectoryPath) => {
    const trajectory = await readTrajectory(trajectoryPath);
    const chunks = chunkTrajectory(trajectory.steps);
    const totalDuration = chunks.reduce((acc, chunk) => acc + (chunk.duration_ms ?? 0), 0);
    console.log(chalk.bold('Summary'));
    console.log(`Chunks: ${chunks.length}`);
    console.log(`Total duration (ms): ${totalDuration}`);
    chunks.forEach((chunk) => {
      console.log(
        `${chunk.chunk_id}: steps ${chunk.step_start}-${chunk.step_end} duration=${chunk.duration_ms ?? 'n/a'} tools=${
          chunk.tools_used.join(',') || 'none'
        }`,
      );
    });
  });

ale
  .command('eval')
  .description('Run evaluations against Terminal Bench Pro tasks')
  .option('--limit <n>', 'Number of tasks to fetch', '5')
  .option('--out <dir>', 'Output directory for reports', 'reports/terminal-bench-pro')
  .option('--require-docker', 'Fail if docker is unavailable', false)
  .action(async (options) => {
    const limit = Number.parseInt(options.limit, 10);
    const outDir = options.out;
    const result = await evaluateTerminalBenchPro({
      limit,
      outDir,
      requireDocker: options.requireDocker,
    });
    console.log(chalk.bold(`Evaluated ${result.tasks.length} tasks`));
    console.log(`Dataset revision: ${result.datasetRevision ?? 'unknown'}`);
    result.tasks.forEach((task) => {
      console.log(`${task.id}: ${task.status}${task.exitCode !== undefined ? ` (exit ${task.exitCode})` : ''}`);
    });
    console.log(`Report written to ${path.join(outDir, 'summary.json')}`);
  });

export function registerAle(program: Command): void {
  program.addCommand(ale);
}
