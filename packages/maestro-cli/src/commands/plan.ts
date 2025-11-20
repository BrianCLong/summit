import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface PlanOptions {
  file: string;
  dryRun?: boolean;
  output?: 'json' | 'yaml' | 'table';
}

export class PlanCommand {
  async execute(options: PlanOptions): Promise<void> {
    const filePath = path.resolve(process.cwd(), options.file);
    const raw = await fs.readFile(filePath, 'utf8');
    const workflow = yaml.load(raw) as Record<string, unknown>;

    const summary = {
      name: (workflow?.name as string) ?? 'unknown',
      version: (workflow?.version as string) ?? '1.0.0',
      stages: Array.isArray(workflow?.stages) ? workflow.stages.length : 0,
      steps: Array.isArray(workflow?.stages)
        ? workflow.stages.flatMap((stage: { steps?: unknown[] }) => stage.steps || []).length
        : 0,
    };

    if (options.output === 'json') {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    if (options.output === 'yaml') {
      // eslint-disable-next-line no-console
      console.log(yaml.dump(summary, { indent: 2 }));
      return;
    }

    // eslint-disable-next-line no-console
    console.log('Workflow Plan');
    // eslint-disable-next-line no-console
    console.log('-------------');
    // eslint-disable-next-line no-console
    console.log(`Name    : ${summary.name}`);
    // eslint-disable-next-line no-console
    console.log(`Version : ${summary.version}`);
    // eslint-disable-next-line no-console
    console.log(`Stages  : ${summary.stages}`);
    // eslint-disable-next-line no-console
    console.log(`Steps   : ${summary.steps}`);

    if (options.dryRun) {
      // eslint-disable-next-line no-console
      console.log('\nDry run mode: no actions will be executed.');
    }
  }
}
