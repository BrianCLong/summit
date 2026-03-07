import { Command } from 'commander';
import path from 'node:path';
import { generateFlows } from '../../flows/generate';
import { verifyFlows } from '../../flows/verify';
import { createFlowsPack } from '../../agents/context/flowsPack';

export function registerFlowsCommands(program: Command): void {
  const flows = program.command('flows').description('Living Architecture Flows operations');

  flows
    .command('generate')
    .description('Generate deterministic flows artifacts')
    .requiredOption('--workspace <path>', 'Workspace root to scan')
    .requiredOption('--out <path>', 'Output directory for flow artifacts')
    .action((options) => {
      const result = generateFlows({ workspace: options.workspace, out: options.out });
      console.log(`Generated ${result.length} flow(s) into ${path.resolve(options.out)}`);
    });

  flows
    .command('verify')
    .description('Verify coverage and workflow consistency')
    .requiredOption('--workspace <path>', 'Workspace root to scan')
    .requiredOption('--out <path>', 'Output directory containing flows artifacts')
    .action((options) => {
      const result = verifyFlows({ workspace: options.workspace, out: options.out });
      console.log(
        `Verification complete: endpoints=${result.unmappedEndpoints.length}, events=${result.unmappedEvents.length}, workflowMismatches=${result.workflowMismatches.length}`,
      );
    });

  flows
    .command('pack')
    .description('Build compact agent context pack from generated flows artifacts')
    .requiredOption('--flows-out <path>', 'Flow artifacts directory')
    .requiredOption('--out <path>', 'Pack output path, e.g. .summit/context/flows.pack.json')
    .action((options) => {
      const pack = createFlowsPack(options['flowsOut'], options.out);
      console.log(`Packed ${pack.flowCount} flow(s) into ${path.resolve(options.out)}`);
    });
}
