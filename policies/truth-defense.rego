package truth.operations

default allow_action = false

# Decision input expectations:
# input.context.integrity.score : number (0-100)
# input.context.integrity.authority_continuity : number (0-100)
# input.context.temporal.latency_ms : number
# input.context.temporal.window_ms : number
# input.context.narrative.convergence_velocity : number (0-1)
# input.context.narrative.source_diversity : number (0-1)
# input.context.impact_level : one of ["low", "medium", "high", "critical"]
# input.context.overrides : { strategic_silence: bool, justification: string, expires_at: string }

# Integrity gate: high-impact actions require integrity ≥70 and authority continuity ≥80 unless strategic silence is invoked.
allow_action {
  input.context.impact_level == "critical"
  input.context.integrity.score >= 70
  input.context.integrity.authority_continuity >= 80
  temporal_within_window
  not narrative_consensus_trap
}

allow_action {
  input.context.impact_level == "high"
  input.context.integrity.score >= 60
  input.context.integrity.authority_continuity >= 70
  temporal_within_window
  not narrative_consensus_trap
}

allow_action {
  input.context.impact_level == "medium"
  input.context.integrity.score >= 50
  temporal_within_window
}

allow_action {
  input.context.impact_level == "low"
  input.context.integrity.score >= 40
}

# Strategic silence: permitted only with justification and expiry; action suppressed regardless of allow_action.
strategic_silence_requested {
  input.context.overrides.strategic_silence
}

strategic_silence_enforced {
  strategic_silence_requested
  input.context.overrides.justification != ""
  input.context.overrides.expires_at != ""
}

temporal_within_window {
  # Default to blocked if latency exceeds window.
  input.context.temporal.latency_ms <= input.context.temporal.window_ms
}

narrative_consensus_trap {
  input.context.narrative.convergence_velocity > 0.8
  input.context.narrative.source_diversity < 0.35
}

# Enforcement decision: allow only when not in strategic silence and allow_action is true.
allow {
  allow_action
  not strategic_silence_requested
}

# Containment trigger for audit streams.
containment_required[reason] {
  input.context.integrity.score < 40
  reason := "integrity_below_40"
}

containment_required[reason] {
  input.context.integrity.authority_continuity < 60
  reason := "authority_break"
}

containment_required[reason] {
  not temporal_within_window
  reason := "stale_beyond_window"
}

containment_required[reason] {
  narrative_consensus_trap
  reason := "narrative_convergence_risk"
}

containment_required[reason] {
  strategic_silence_requested
  not strategic_silence_enforced
  reason := "strategic_silence_invalid"
}
