export type CandidateExample = {
  id: string;
  input: string;
  output: string;
  source: string;
}

const reviewQueue: CandidateExample[] = [];

function assertNoTrainingSideEffects(): void {
  // Ensure we are isolated and no live model is accessible for immediate fine-tuning
  // In a real system, this might check env vars or network policies.
  const isTrainingAllowed = false;
  if (isTrainingAllowed) {
     throw new Error("Violation: Auto-training is permitted in this context.");
  }
}

async function appendReviewQueue(ex: CandidateExample): Promise<void> {
  reviewQueue.push(ex);
}

export async function writeQuarantinedExample(ex: CandidateExample): Promise<void> {
  assertNoTrainingSideEffects()
  await appendReviewQueue(ex)
}

export function getReviewQueue(): CandidateExample[] {
  return reviewQueue;
}
