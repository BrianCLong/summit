import { ActionProposal, SimulationOutcome } from '../core/types.js';

export type SimulationModel = (
  proposal: ActionProposal,
  state: Record<string, number>
) => SimulationOutcome;

export class SimulationSandbox {
  constructor(private readonly model: SimulationModel) {}

  evaluate(proposal: ActionProposal, state: Record<string, number>): SimulationOutcome {
    return this.model(proposal, state);
  }
}
