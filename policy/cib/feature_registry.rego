# Lightweight feature-registry-backed policy skeleton.
# Assumption: your pipeline produces an "input" JSON with:
#   input.signals: array of {id, score, details?}
#   input.policy: {name, thresholds?}
#   input.evidence: {ids: ["EV-..."], ...}
#   input.context: {run_type: "pr"|"main"|"release", ...}

package summit.cib

default allow := false

# -------------------------
# Helpers
# -------------------------

signal_score(id) := s {
  some i
  input.signals[i].id == id
  s := input.signals[i].score
}

has_evidence(ev_id) {
  some i
  input.evidence.ids[i] == ev_id
}

required_evidence_ok {
  # baseline minimums for governance green (tune as needed)
  has_evidence("EV-CIB-001")
  has_evidence("EV-CIB-002")
  has_evidence("EV-CIB-004")
  has_evidence("EV-XPLAT-001")
  has_evidence("EV-EXP-001")
}

# Weighted sum risk score aligned to FEATURE registry (POLICY.CIB_RISK_SCORE)
risk_score := r {
  r := 0.20 * signal_score("CIB.TEMPORAL.SYNC") +
       0.20 * signal_score("CIB.TEXT.REUSE") +
       0.15 * signal_score("CIB.URL.REUSE") +
       0.20 * signal_score("CIB.NETWORK.COHESION") +
       0.10 * signal_score("CIB.ACCOUNT.SIMILARITY") +
       0.15 * signal_score("CIB.CROSSPLATFORM.LINKAGE")
}

# -------------------------
# Decisions
# -------------------------

# Allow if evidence minimums are met and risk is below block threshold.
allow {
  required_evidence_ok
  risk_score < block_threshold
}

# Thresholds can be overridden per run_type.
block_threshold := t {
  t := 0.80
  input.context.run_type == "release"
} else := t {
  t := 0.85
  input.context.run_type == "main"
} else := t {
  t := 0.90
  input.context.run_type == "pr"
}

warn_threshold := t {
  t := 0.65
}

# -------------------------
# Explanations / Outputs
# -------------------------

# OPA convention: emit structured reasons for UI / evidence bundle
deny_reasons[reason] {
  not required_evidence_ok
  reason := {
    "code": "EVIDENCE_MISSING",
    "message": "Required evidence IDs are missing for governance green.",
    "missing": missing_evidence_ids
  }
}

deny_reasons[reason] {
  required_evidence_ok
  risk_score >= block_threshold
  reason := {
    "code": "CIB_RISK_BLOCK",
    "message": "Aggregate CIB risk score exceeds block threshold.",
    "risk_score": risk_score,
    "block_threshold": block_threshold,
    "signal_breakdown": signal_breakdown
  }
}

warn_reasons[reason] {
  required_evidence_ok
  risk_score >= warn_threshold
  risk_score < block_threshold
  reason := {
    "code": "CIB_RISK_WARN",
    "message": "Aggregate CIB risk score exceeds warn threshold.",
    "risk_score": risk_score,
    "warn_threshold": warn_threshold,
    "signal_breakdown": signal_breakdown
  }
}

missing_evidence_ids[ev] {
  required := {"EV-CIB-001", "EV-CIB-002", "EV-CIB-004", "EV-XPLAT-001", "EV-EXP-001"}
  ev := required[_]
  not has_evidence(ev)
}

signal_breakdown := b {
  b := [
    {"id": "CIB.TEMPORAL.SYNC", "score": signal_score("CIB.TEMPORAL.SYNC")},
    {"id": "CIB.TEXT.REUSE", "score": signal_score("CIB.TEXT.REUSE")},
    {"id": "CIB.URL.REUSE", "score": signal_score("CIB.URL.REUSE")},
    {"id": "CIB.NETWORK.COHESION", "score": signal_score("CIB.NETWORK.COHESION")},
    {"id": "CIB.ACCOUNT.SIMILARITY", "score": signal_score("CIB.ACCOUNT.SIMILARITY")},
    {"id": "CIB.CROSSPLATFORM.LINKAGE", "score": signal_score("CIB.CROSSPLATFORM.LINKAGE")}
  ]
}
