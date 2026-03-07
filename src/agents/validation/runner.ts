export type ScenarioRunResult = {
  scenarioId: string;
  satisfied: boolean;
  score: number;
  notes?: string;
};

export async function runValidation(): Promise<ScenarioRunResult[]> {
  return [];
}
