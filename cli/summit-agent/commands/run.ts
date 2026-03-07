import { compileToTaskGraph } from '../../../api/agent-os/desired-state/index';

export function runCommand(type: string, target: string) {
  if (type === 'issue') {
    const graph = compileToTaskGraph({ issueId: target, description: 'CLI Task' });
    console.log(`Executing ${graph.id}...`);
  } else if (type === 'workflow') {
    console.log(`Executing workflow ${target}...`);
  } else {
    throw new Error(`Unknown target type: ${type}`);
  }
}
