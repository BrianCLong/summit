import { TaskDelta, MergeResult, MergeContext, MergePolicy } from '../core/interfaces.js';
import { EvidenceTracker } from '../evidence/tracker.js';

export class RAMPolicy implements MergePolicy {
  name = 'ram';

  merge(deltas: TaskDelta[], context: MergeContext): MergeResult {
    const evidence = new EvidenceTracker();
    const mergedParams: Record<string, number[]> = {};

    // 1. Identify all parameter keys across all deltas
    const allKeys = new Set<string>();
    deltas.forEach(d => Object.keys(d.parameters).forEach(k => allKeys.add(k)));

    // 2. Iterate per parameter (or block)
    for (const key of allKeys) {
      // Collect values for this parameter from all deltas
      // We assume equal length arrays for the same parameter key
      // If a delta is missing the key, it's effectively all zeros (or inactive)

      // First, determine length from the first delta that has it
      const representative = deltas.find(d => d.parameters[key]);
      if (!representative) continue; // Should not happen
      const len = representative.parameters[key].length;

      const mergedValues = new Array(len).fill(0);

      // We process element-wise (this is slow in JS/TS loop, but fine for MVP/Proof)
      // In production, this would be vectorized (e.g. tensorflow.js or ONNX)
      for (let i = 0; i < len; i++) {
        let activeSum = 0;
        let activeCount = 0;
        let activeDeltaIndex = -1;

        // Check each delta
        for (let dIdx = 0; dIdx < deltas.length; dIdx++) {
          const delta = deltas[dIdx];
          const val = delta.parameters[key]?.[i] ?? 0;

          // Thresholding (Mask generation)
          if (Math.abs(val) > context.threshold) {
            activeSum += val;
            activeCount++;
            activeDeltaIndex = dIdx;
          }
        }

        // Apply RAM Logic
        if (activeCount === 0) {
          mergedValues[i] = 0;
        } else if (activeCount === 1) {
          // Unique region
          // Retrieve the value again (or use cached if I optimized)
          const val = deltas[activeDeltaIndex].parameters[key]![i];

          // Rescaling (RAM+ logic placeholder)
          // For now, we preserve magnitude (RAM base).
          // If context.rescale is true, we might apply a factor here based on task statistics.
          // The prompt says: "If unique: preserve full magnitude".
          // Standard averaging would have done val / N. RAM does val / 1.
          // So just taking 'val' implements the "no dilution" core of RAM.
          mergedValues[i] = val;
        } else {
          // Shared region
          // Average among ACTIVE tasks
          mergedValues[i] = activeSum / activeCount;
        }

        // Record stats (sampling first element of block to avoid massive log overhead?)
        // Or accumulating counts.
        // For 'overlapCounts' in evidence, we usually want per-parameter-block stats.
        // Let's aggregate activeCount frequency for this parameter block.
      }

      // Calculate average overlap for this block to store in evidence
      // (Simplified: just counting how many elements were unique vs shared)
      let uniqueElements = 0;
      let sharedElements = 0;
      let totalElements = len;

      for (let i = 0; i < len; i++) {
         let count = 0;
         for (const d of deltas) {
             if (Math.abs((d.parameters[key]?.[i] ?? 0)) > context.threshold) count++;
         }
         if (count === 1) uniqueElements++;
         else if (count > 1) sharedElements++;
      }

      evidence.addGlobalStats(uniqueElements, sharedElements, totalElements);
      // We can also record the average overlap for this key
      evidence.recordParamMetric(key, (uniqueElements + sharedElements) / totalElements);

      mergedParams[key] = mergedValues;
    }

    return {
      mergedDelta: {
        id: 'merged-' + Date.now(),
        parameters: mergedParams
      },
      stats: evidence.getStats()
    };
  }
}
