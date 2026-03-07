import { assertToolsAllowed } from "./policyGate.js";
import { stableInputsHash } from "./stamp.js";
import type { ISandboxRuntime, RunSpec, EvidenceBundle } from "./types.js";
import { ObjectStoreStatePersister } from "./objectStoreStatePersister.js";

export class InProcessSandboxRuntime implements ISandboxRuntime {
  constructor(private readonly statePersister: ObjectStoreStatePersister) {}

  async run(spec: RunSpec): Promise<EvidenceBundle> {
    assertToolsAllowed(spec.requestedTools, spec.toolAllowlist);

    const priorState = await this.statePersister.load(spec);
    const nextState = {
      completedSteps: priorState.completedSteps + 1,
      lastTools: [...spec.requestedTools],
    };

    await this.statePersister.save(spec, nextState);

    const inputsHash = stableInputsHash({
      evidenceId: spec.evidenceId,
      modelPolicy: spec.modelPolicy,
      requestedTools: [...spec.requestedTools].sort(),
      toolAllowlist: [...spec.toolAllowlist].sort(),
      persistenceNamespace: spec.persistence.namespace,
      completedSteps: nextState.completedSteps,
    });

    return {
      evidenceId: spec.evidenceId,
      report: {
        status: "ok",
        completedSteps: nextState.completedSteps,
        toolsUsed: nextState.lastTools,
      },
      metrics: {
        policyChecks: spec.requestedTools.length,
        deniedTools: 0,
      },
      stamp: {
        schemaVersion: 1,
        inputsHash,
      },
    };
  }
}
