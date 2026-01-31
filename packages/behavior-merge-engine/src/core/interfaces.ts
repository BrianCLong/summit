/**
 * Represents a parameter delta (Task Vector) for a model.
 * In a real implementation, this would handle tensors (dense or sparse).
 * For this engine, we abstract it to a key-value store of parameter arrays.
 */
export interface TaskDelta {
  id: string;
  // Map of parameter name to its delta values (flattened or structured)
  parameters: Record<string, number[]>;
}

/**
 * Represents the result of a merge operation.
 */
export interface MergeResult {
  mergedDelta: TaskDelta;
  // Stats for evidence
  stats: {
    overlapCounts: Record<string, number>; // param -> count
    uniqueRatio: number;
    sharedRatio: number;
    totalParams: number;
  };
}

/**
 * Configuration context for a merge operation.
 */
export interface MergeContext {
  threshold: number; // For creating masks (RAM)
  rescale: boolean; // Whether to rescale unique regions
}

/**
 * Interface for any behavior merge policy (RAM, TIES, etc.)
 */
export interface MergePolicy {
  name: string;
  merge(deltas: TaskDelta[], context: MergeContext): MergeResult;
}
