import { SdgSnapshot, IntelligenceYieldVector } from "../sdg/schema.js";

export interface JeeControl {
  id: string;
  kind:
    | "FIELD_SPLIT"
    | "PSEUDONYMIZE"
    | "ENCRYPTION_KEY_JURISDICTION"
    | "WORKLOAD_RELOCATION"
    | "PROCESSOR_ROLE_CHANGE"
    | "DATA_MINIMIZATION"
    | "LOGGING_REDUCTION";
  cost_hint: number;          // 0..1
  latency_hint: number;       // 0..1
  compliance_constraints: string[]; // e.g. ["MUST_LOCALIZE:EU", "DSP_RESTRICT:COC"]
}

export interface JeeEquilibrium {
  evidence_id: string;
  baseline_yield: IntelligenceYieldVector;
  residual_yield: IntelligenceYieldVector;
  selected_controls: string[];
  notes: string[]; // “decision support; counsel review required”
}

export function runJee(
  sdg: SdgSnapshot,
  controls: JeeControl[],
  maxIters = 30
): JeeEquilibrium {
  // TODO v0: greedy portfolio minimizing weighted yield under constraints
  return {
    evidence_id: "EVID:sdes-jee:jee:TODO",
    baseline_yield: {
      trade_secret_inference: 1,
      supply_chain_reconstruction: 1,
      sensitive_profile_risk: 1,
      operational_pattern_leak: 1,
    },
    residual_yield: {
      trade_secret_inference: 1,
      supply_chain_reconstruction: 1,
      sensitive_profile_risk: 1,
      operational_pattern_leak: 1,
    },
    selected_controls: [],
    notes: ["Decision support only; not legal advice."],
  };
}
