import { Command } from 'commander';
import { addCapabilityNode } from '../capability-graph/graph';
import { evaluateCapability } from '../capability-evaluator/evaluator';

const program = new Command();

program
  .command('install <path>')
  .description('Install a capability package')
  .action(async (path) => {
    console.log(`Installing capability from ${path}...`);
    // TODO: unpack & register capability
    await addCapabilityNode('example-capability');
    console.log('Installed!');
  });

program
  .command('evaluate <capabilityId>')
  .description('Evaluate a capability')
  .action(async (capabilityId) => {
    const result = await evaluateCapability(capabilityId);
    console.log(result);
  });

program.parse(process.argv);
