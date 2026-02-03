import { IncubationCapability, SandboxContext, IncubationResult } from './types.js';

// Candidate 1: Recursive Critic
// Mock implementation that pretends to critique itself
export const RecursiveCriticCapability: IncubationCapability = {
  id: 'recursive-critic-v1',
  name: 'Recursive Critic',
  version: '0.0.1',
  description: 'Agent that critiques its own plan before execution.',
  run: async (input: string, context: SandboxContext): Promise<IncubationResult> => {
    let steps = 0;
    let tokens = 0;

    context.budget.consume('steps', 1);
    steps++;
    context.logger('Initial plan: execute echo');

    // Simulate Critique
    context.budget.consume('tokens', 50); // Critique cost
    tokens += 50;
    context.logger('Critique: plan looks safe.');

    // Execution
    context.budget.consume('steps', 1);
    steps++;
    const output = await context.tools.execute('echo', { message: input });

    return {
      success: true,
      output: JSON.stringify(output),
      metrics: { steps, tokens, durationMs: 0 },
      violations: []
    };
  }
};

// Candidate 2: Restricted Tool Planner
// Mock implementation that checks allowed tools before "planning"
export const RestrictedToolPlannerCapability: IncubationCapability = {
  id: 'restricted-planner-v1',
  name: 'Restricted Tool Planner',
  version: '0.0.1',
  description: 'Agent that simulates tool outputs.',
  run: async (input: string, context: SandboxContext): Promise<IncubationResult> => {
    let steps = 0;

    context.budget.consume('steps', 1);
    steps++;

    // "Lookahead" - check if tool is safe
    if (input.includes('delete')) {
       // Simulate catching a bad tool
       context.logger('Planner detected unsafe tool usage in lookahead.');
       return {
         success: false,
         output: 'Plan rejected due to unsafe tool.',
         metrics: { steps, tokens: 10, durationMs: 0 },
         violations: []
       };
    }

    const output = await context.tools.execute('read_context', {});
    return {
      success: true,
      output: output,
      metrics: { steps, tokens: 20, durationMs: 0 },
      violations: []
    };
  }
};
