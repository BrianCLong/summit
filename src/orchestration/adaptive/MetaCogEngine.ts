import { Expert } from './ExpertRegistry';

export interface MetaCogLlmClient {
  selectExperts: (
    userTurn: string,
    experts: Expert[],
    historySummary: string,
  ) => Promise<string[]>;
}

export class MetaCogEngine {
  constructor(private readonly llm: MetaCogLlmClient) {}

  async selectExperts(
    userTurn: string,
    experts: Expert[],
    historySummary: string,
  ): Promise<string[]> {
    return this.llm.selectExperts(userTurn, experts, historySummary);
  }
}
