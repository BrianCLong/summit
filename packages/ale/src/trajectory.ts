import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { trajectoryHeaderSchema, trajectoryStepSchema, Trajectory, TrajectoryHeader, TrajectoryStep } from './types.js';

const pipe = promisify(pipeline);

export interface RecorderOptions {
  filePath: string;
  header?: Partial<TrajectoryHeader>;
}

export class TrajectoryRecorder {
  private readonly filePath: string;

  private headerWritten = false;

  constructor(private readonly options: RecorderOptions) {
    this.filePath = options.filePath;
  }

  async init(): Promise<TrajectoryHeader> {
    const header: TrajectoryHeader = {
      run_id: this.options.header?.run_id ?? randomUUID(),
      start_ts: new Date().toISOString(),
      git_sha: this.options.header?.git_sha,
      agent_id: this.options.header?.agent_id,
      config: this.options.header?.config,
      kind: 'trajectory_header',
    };

    await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.promises.writeFile(this.filePath, `${JSON.stringify(header)}\n`, { flag: 'w' });
    this.headerWritten = true;
    return header;
  }

  async recordStep(step: TrajectoryStep): Promise<void> {
    if (!this.headerWritten) {
      await this.init();
    }
    const parsed = trajectoryStepSchema.safeParse(step);
    if (!parsed.success) {
      throw new Error(`Invalid trajectory step: ${parsed.error.message}`);
    }
    const line = `${JSON.stringify(parsed.data)}\n`;
    await fs.promises.appendFile(this.filePath, line, { encoding: 'utf-8' });
  }
}

export async function readTrajectory(filePath: string): Promise<Trajectory> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  const lines = content.split(/\n+/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    throw new Error('Trajectory file is empty');
  }
  const rawHeader = JSON.parse(lines[0]);
  const headerParse = trajectoryHeaderSchema.safeParse(rawHeader);
  if (!headerParse.success) {
    throw new Error(`Invalid trajectory header: ${headerParse.error.message}`);
  }
  const steps: TrajectoryStep[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const parsed = trajectoryStepSchema.safeParse(JSON.parse(lines[i]));
    if (!parsed.success) {
      throw new Error(`Invalid trajectory step on line ${i + 1}: ${parsed.error.message}`);
    }
    steps.push(parsed.data);
  }
  return { header: headerParse.data, steps };
}

export async function copyTrajectory(source: string, destination: string): Promise<void> {
  await pipe(fs.createReadStream(source), fs.createWriteStream(destination));
}
