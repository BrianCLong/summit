import { describe, it, expect } from '@jest/globals';
import { Command } from 'commander';
import { registerWorkflowCommands } from '../src/commands/workflow.js';

describe('Workflow Commands', () => {
  it('should register workflow command group', () => {
    const program = new Command();
    registerWorkflowCommands(program);

    const workflowCommand = program.commands.find(c => c.name() === 'workflow');
    expect(workflowCommand).toBeDefined();
    expect(workflowCommand?.description()).toContain('Workflow orchestration');
  });

  it('should have validate subcommand', () => {
    const program = new Command();
    registerWorkflowCommands(program);

    const workflowCommand = program.commands.find(c => c.name() === 'workflow');
    const validateSubcommand = workflowCommand?.commands.find(c => c.name() === 'validate');

    expect(validateSubcommand).toBeDefined();
    expect(validateSubcommand?.description()).toContain('Validate a workflow project');
  });
});
