export type Candidate = {
  id: string;
  response: string;
}

export type CritiqueReport = {
  winnerId: string | null;
  critiques: string[];
  autoAdopt: boolean;
}

export async function critiqueCandidates(candidates: Candidate[]): Promise<CritiqueReport> {
  // Debate as critique, no auto adoption
  return {
    winnerId: candidates.length > 0 ? candidates[0].id : null,
    critiques: ["critique 1", "critique 2"],
    autoAdopt: false
  };
}
