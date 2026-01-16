import type { ContractContext, ContractResult, ProviderAdapter } from '../types.js';

export interface ContractTest {
  id: string;
  description: string;
  run: (adapter: ProviderAdapter, context: ContractContext) => Promise<ContractResult>;
}
