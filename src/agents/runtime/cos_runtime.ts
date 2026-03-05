// eslint-disable
import { SummitAgent } from './agent_runtime';

export class COSRuntime {
  agents: SummitAgent[] = []

  runCycle() {
    for (const agent of this.agents) {
      const state = agent.observe()
      const plan = agent.plan()
      agent.execute(plan)
    }
  }
}
