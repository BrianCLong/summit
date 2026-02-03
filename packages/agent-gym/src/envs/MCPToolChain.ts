import { BaseEnvironment } from '../env.js';
import { Observation, Action, StepResult } from '../types.js';

export class MCPToolChainEnvironment extends BaseEnvironment {
  public name = 'MCPToolChain';
  private failureRate: number = 0.1;
  private tools = ['search', 'calculator', 'translate'];
  private history: string[] = [];

  protected async _reset(options?: Record<string, any>): Promise<Observation> {
    this.failureRate = options?.failureRate ?? 0.1;
    this.history = [];
    return this.getObservation('Environment reset. Available tools: ' + this.tools.join(', '));
  }

  protected async _step(action: Action): Promise<StepResult> {
    let success = true;
    let message = '';
    const reward = 0;

    if (action.type === 'call_tool') {
        const { tool, args } = action.params;
        if (!this.tools.includes(tool)) {
            success = false;
            message = `Tool ${tool} not found.`;
        } else {
            // Simulate random failure
            if (Math.random() < this.failureRate) {
                success = false;
                message = `Tool ${tool} failed: Rate limit exceeded or timeout.`;
            } else {
                // Mock tool outputs
                if (tool === 'calculator') {
                    const result = this.mockCalculator(args);
                    message = `Result: ${result}`;
                } else if (tool === 'search') {
                    message = `Found results for "${args?.query}"`;
                } else {
                    message = `Tool ${tool} executed successfully.`;
                }
            }
        }
    } else {
        success = false;
        message = `Unknown action type: ${action.type}`;
    }

    this.history.push(`${action.type}: ${message}`);

    return {
      observation: this.getObservation(message),
      feedback: { success, message, reward },
      done: false,
      info: { historyLength: this.history.length }
    };
  }

  private mockCalculator(args: any): number {
      const a = Number(args?.a || 0);
      const b = Number(args?.b || 0);
      const op = args?.op || 'add';
      if (op === 'add') return a + b;
      if (op === 'mul') return a * b;
      return 0;
  }

  private getObservation(lastOutput: string): Observation {
    return {
      type: 'text',
      content: lastOutput,
      timestamp: Date.now()
    };
  }
}
