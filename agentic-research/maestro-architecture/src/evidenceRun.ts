import { chooseArchitecture, TaskFeatures } from "./architectureSelector";
import { errorAmplificationGuard } from "./errorAmplification";
import { writeEvidence } from "../../shared/src/evidence";

export async function runEvidence(evid: string) {
  const features: TaskFeatures = {
    id: "task-1",
    decomposability: 0.8,
    toolCount: 5,
    sequentialDependency: 0.2,
    risk: 0.1,
  };

  const arch = chooseArchitecture(features);

  // Simulate run
  const results = Array.from({ length: 20 }).map((_, i) => ({ ok: i % 10 !== 0 })); // 2 errors

  const guard = errorAmplificationGuard(arch, results);

  writeEvidence(
    evid,
    { features, decision: arch, guard },
    { errorRate: guard.errorRate, recommended: guard.recommended },
    { module: "maestro-architecture", date_utc: new Date().toISOString() }
  );
}
