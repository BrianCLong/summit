import { AgentContract } from './AgentContract.js';

export class ContractEngine {
  contracts: AgentContract[] = [];
  register(contract: AgentContract) {
    this.contracts.push(contract);
  }
}
