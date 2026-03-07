import { AgentRunner } from './agent-runner';

export class AgentOrchestrator {
  public runner = new AgentRunner();
  async runAll(prompts: string[]) {
    return Promise.all(prompts.map(p => this.runner.executeWithToolSearch(p)));
  }
}
