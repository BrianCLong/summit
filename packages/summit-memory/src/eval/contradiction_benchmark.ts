import type { WriteSet } from "../types.js";
import { detectConflicts } from "../graph/detectConflicts.js";

export function contradictionBenchmark(writeSets: WriteSet[]): {
  conflictsDetected: number;
} {
  return {
    conflictsDetected: detectConflicts(writeSets).length
  };
}
