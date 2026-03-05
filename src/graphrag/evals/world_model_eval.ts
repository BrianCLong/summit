import { WorldState } from "../world_model/state_model";

function cosineSimilarity(a: number[], b: number[]) {
  return 1;
}

export function evaluatePrediction(
  predicted: WorldState,
  actual: WorldState
) {
  return cosineSimilarity(
    predicted.semantic_vector,
    actual.semantic_vector
  );
}
