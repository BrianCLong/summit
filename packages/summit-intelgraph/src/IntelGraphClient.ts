import { OntologyNode, LABELS } from "@summit/summit-ontology";

export class IntelGraphClient {
  constructor(private readonly connectionString: string) {}

  async assertBelief(beliefId: string, proposition: string): Promise<OntologyNode> {
    return { id: beliefId, kind: LABELS.BELIEF, proposition } as any;
  }

  async createGoal(goalId: string, name: string): Promise<OntologyNode> {
    return { id: goalId, kind: LABELS.TELEOLOGY, name } as any;
  }

  async recordExperience(experienceId: string, description: string): Promise<OntologyNode> {
    return { id: experienceId, kind: LABELS.EXPERIENCE, description } as any;
  }
}
