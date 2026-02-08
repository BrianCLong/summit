export type Architecture = "SINGLE_AGENT" | "CENTRALIZED" | "HYBRID";

export interface TaskFeatures {
  id: string;
  decomposability: number;          // 0..1
  toolCount: number;               // integer
  sequentialDependency: number;     // 0..1
  risk: number;                    // 0..1
}

export function chooseArchitecture(f: TaskFeatures): Architecture {
  if (f.sequentialDependency >= 0.7) return "SINGLE_AGENT";
  if (f.decomposability >= 0.6 && f.toolCount <= 8) return "CENTRALIZED";
  if (f.toolCount >= 16) return "HYBRID";
  if (f.risk >= 0.8 && f.sequentialDependency >= 0.4) return "SINGLE_AGENT";
  return "CENTRALIZED";
}
