import {
  CooperationArtifact,
  WorkbookCommand,
  WorkbookReceipt,
  TaskSpec,
} from '@ga-graphai/common-types';

import { GenerationInput, ResourceAdapter } from '../capabilityRegistry.js';
import { GuardedGenerator } from '../promptOps.js';

function parseWorkbook(content: string): WorkbookCommand[] {
  const commands: WorkbookCommand[] = [];
  const lines = content.split(/\n/).map((line) => line.trim());
  let current: Partial<WorkbookCommand> = {};
  for (const line of lines) {
    if (line.startsWith('CMD:')) {
      if (current.command) {
        commands.push(current as WorkbookCommand);
        current = {};
      }
      current.command = line.slice(4).trim();
    } else if (line.startsWith('DESC:')) {
      current.description = line.slice(5).trim();
    } else if (line.startsWith('EXPECT:')) {
      current.expectedOutcome = line.slice(7).trim();
    }
  }
  if (current.command) {
    commands.push(current as WorkbookCommand);
  }
  return commands;
}

export interface ProofOfUsefulWorkbookResult {
  artifact: CooperationArtifact;
  receipt: WorkbookReceipt | null;
}

export class ProofOfUsefulWorkbookCoordinator {
  private readonly guard = new GuardedGenerator();

  async execute(
    task: TaskSpec,
    resource: ResourceAdapter,
  ): Promise<ProofOfUsefulWorkbookResult> {
    const generated = await resource.generate({
      task,
      strand: 'implementation',
      prompt: `Produce an executable workbook (CMD/DESC/EXPECT) that validates ${task.title}.`,
    } satisfies GenerationInput);
    const commands = parseWorkbook(generated.content);
    let receipt: WorkbookReceipt | null = null;
    if (resource.runWorkbook) {
      receipt = await resource.runWorkbook(commands);
    }
    const evidence = [
      ...(generated.evidence ?? []),
      ...(receipt ? receipt.artifacts : []),
    ];
    const { artifact } = this.guard.enforce(
      'proof-of-useful-workbook',
      generated.content,
      [],
      evidence,
    );
    return { artifact, receipt };
  }
}
