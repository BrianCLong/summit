# Truth Defense Policy
# Enforces adversarial-resistant decision-making rules

package summit.truth_defense

import future.keywords

# Configuration
default integrity_threshold_high := 0.70
default integrity_threshold_medium := 0.40
default integrity_threshold_low := 0.20
default confidence_threshold := 0.80
default max_temporal_decay_hours := 24

# ==============================================================================
# PILLAR 1: Integrity Scoring Rules
# ==============================================================================

# Information with low integrity must be quarantined
deny[msg] if {
    some claim in input.claims
    claim.integrity_score < integrity_threshold_low
    not claim.quarantined
    msg := sprintf("Claim %v has critically low integrity (%v < %v) and must be quarantined",
        [claim.id, claim.integrity_score, integrity_threshold_low])
}

# High confidence without high integrity triggers escalation
warn[msg] if {
    some claim in input.claims
    claim.confidence > confidence_threshold
    claim.integrity_score < integrity_threshold_medium
    not claim.escalated
    msg := sprintf("Claim %v has high confidence (%v) but medium/low integrity (%v) - escalation required",
        [claim.id, claim.confidence, claim.integrity_score])
}

# Integrity score components must all be present
deny[msg] if {
    some claim in input.claims
    not claim.integrity_breakdown
    msg := sprintf("Claim %v missing integrity score breakdown", [claim.id])
}

deny[msg] if {
    some claim in input.claims
    claim.integrity_breakdown
    required_components := {"source_volatility", "correlation_independence", "historical_adversarial_behavior", "narrative_shift_velocity", "verification_depth"}
    missing := required_components - {k | claim.integrity_breakdown[k]}
    count(missing) > 0
    msg := sprintf("Claim %v integrity breakdown missing components: %v", [claim.id, missing])
}

# ==============================================================================
# PILLAR 2: Narrative Collision Detection Rules
# ==============================================================================

# Premature convergence must be flagged
warn[msg] if {
    some event in input.events
    event.time_since_event_minutes < 30
    event.narrative_metrics.explanatory_diversity == 1
    event.narrative_metrics.unexplained_elements_ratio > 0.30
    not event.premature_convergence_flagged
    msg := sprintf("Event %v shows premature convergence (ED=1, UER=%v) before 30min threshold",
        [event.id, event.narrative_metrics.unexplained_elements_ratio])
}

# Coordinated narrative attack detection
deny[msg] if {
    some event in input.events
    event.narrative_metrics.convergence_velocity > 5.0
    event.narrative_metrics.narrative_diversity_index < 0.20
    not event.coordinated_attack_investigation
    msg := sprintf("Event %v exhibits coordinated narrative attack pattern (CV=%v, NDI=%v) - investigation required",
        [event.id, event.narrative_metrics.convergence_velocity, event.narrative_metrics.narrative_diversity_index])
}

# Mandatory Alternative Hypothesis requirement
deny[msg] if {
    some decision in input.decisions
    decision.criticality == "high"
    decision.based_on_narrative
    decision.narrative.explanatory_diversity < 2
    not decision.mandatory_alternative_hypothesis_satisfied
    msg := sprintf("Critical decision %v based on single narrative without MAH satisfied", [decision.id])
}

# ==============================================================================
# PILLAR 3: Temporal Truth Protection Rules
# ==============================================================================

# Decisions made with degraded temporal value must be flagged
warn[msg] if {
    some decision in input.decisions
    decision.temporal_decision_value < 0.50
    decision.criticality in ["high", "critical"]
    not decision.temporal_degradation_acknowledged
    msg := sprintf("Decision %v has degraded temporal value (%v < 0.50) - acknowledgment required",
        [decision.id, decision.temporal_decision_value])
}

# Information arrival deadline enforcement
deny[msg] if {
    some decision in input.decisions
    decision.information_deadline_defined
    decision.status == "pending"
    decision.deadline_passed
    not decision.forced_decision_executed
    msg := sprintf("Decision %v passed information deadline without forced decision", [decision.id])
}

# Delay attack detection
warn[msg] if {
    some source in input.information_sources
    source.delay_anomaly_score > 3.0
    not source.delay_investigation_active
    msg := sprintf("Source %v shows significant delay anomaly (score=%v) - potential delay attack",
        [source.id, source.delay_anomaly_score])
}

# ==============================================================================
# PILLAR 4: Authority Validation Rules
# ==============================================================================

# Identity verification required for high-impact claims
deny[msg] if {
    some claim in input.claims
    claim.impact == "critical"
    not claim.identity_verified
    msg := sprintf("Critical claim %v lacks identity verification", [claim.id])
}

# Behavioral continuity check
warn[msg] if {
    some source in input.information_sources
    source.behavioral_deviation_score > 3.0
    not source.elevated_scrutiny
    msg := sprintf("Source %v exhibits behavioral deviation (BDS=%v) - elevated scrutiny required",
        [source.id, source.behavioral_deviation_score])
}

deny[msg] if {
    some source in input.information_sources
    source.behavioral_deviation_score > 5.0
    not source.quarantined
    msg := sprintf("Source %v exhibits critical behavioral deviation (BDS=%v) - quarantine required",
        [source.id, source.behavioral_deviation_score])
}

# Sudden source elevation blocking
deny[msg] if {
    some claim in input.claims
    claim.impact in ["high", "critical"]
    claim.source.age_days < 30
    claim.source.authority_score < 0.60
    not claim.emergency_override
    msg := sprintf("Claim %v from new source (age=%v days, authority=%v) attempting high-impact claim without override",
        [claim.id, claim.source.age_days, claim.source.authority_score])
}

# Emergency override logging requirement
deny[msg] if {
    some decision in input.decisions
    decision.authority_override_used
    not decision.override_justification
    msg := sprintf("Decision %v used authority override without justification", [decision.id])
}

deny[msg] if {
    some decision in input.decisions
    decision.authority_override_used
    not decision.secondary_authorization
    msg := sprintf("Decision %v used authority override without secondary authorization", [decision.id])
}

# ==============================================================================
# PILLAR 5: Blast Radius Containment Rules
# ==============================================================================

# Compromised information must trigger dependency freeze
deny[msg] if {
    some claim in input.claims
    claim.integrity_score < integrity_threshold_medium
    claim.has_dependencies
    not claim.dependencies_frozen
    msg := sprintf("Claim %v has medium/low integrity with unfrozen dependencies - containment required", [claim.id])
}

# Containment effectiveness tracking
warn[msg] if {
    some containment in input.containments
    containment.active
    containment.containment_effectiveness < 0.80
    msg := sprintf("Containment %v has low effectiveness (%v < 0.80) - decisions escaping freeze",
        [containment.id, containment.containment_effectiveness])
}

# Reversibility index for critical decisions
warn[msg] if {
    some decision in input.decisions
    decision.criticality == "critical"
    decision.influenced_by_suspect_information
    decision.reversibility_index < 0.50
    not decision.irreversibility_acknowledged
    msg := sprintf("Critical decision %v influenced by suspect info with low reversibility (%v) - acknowledgment required",
        [decision.id, decision.reversibility_index])
}

# ==============================================================================
# PILLAR 6: Strategic Silence Rules
# ==============================================================================

# Strategic silence must be justified and monitored
deny[msg] if {
    some decision in input.decisions
    decision.decision_type == "strategic_silence"
    not decision.silence_justification
    msg := sprintf("Decision %v chose strategic silence without justification", [decision.id])
}

deny[msg] if {
    some decision in input.decisions
    decision.decision_type == "strategic_silence"
    not decision.review_deadline
    msg := sprintf("Strategic silence decision %v lacks review deadline", [decision.id])
}

warn[msg] if {
    some decision in input.decisions
    decision.decision_type == "strategic_silence"
    decision.review_deadline_passed
    not decision.review_completed
    msg := sprintf("Strategic silence decision %v passed review deadline without review", [decision.id])
}

# Silence overuse detection
warn[msg] if {
    silence_rate := count([d | some d in input.decisions; d.decision_type == "strategic_silence"]) / count(input.decisions)
    silence_rate > 0.30
    msg := sprintf("Strategic silence rate (%v) exceeds 30%% threshold - possible decision paralysis", [silence_rate])
}

# ==============================================================================
# Cross-Cutting Rules
# ==============================================================================

# High-integrity information can proceed with normal thresholds
allow_decision[decision.id] if {
    some decision in input.decisions
    decision.information_integrity >= integrity_threshold_high
    decision.confidence >= confidence_threshold
}

# Medium-integrity requires elevated scrutiny
allow_decision_with_scrutiny[decision.id] if {
    some decision in input.decisions
    decision.information_integrity >= integrity_threshold_medium
    decision.information_integrity < integrity_threshold_high
    decision.elevated_scrutiny_applied
}

# Temporal pressure can override some requirements with acknowledgment
allow_temporal_override[decision.id] if {
    some decision in input.decisions
    decision.temporal_pressure_high
    decision.time_remaining_minutes < 15
    decision.temporal_override_acknowledged
    decision.blast_radius_containment_ready
}

# Authority continuity failure escalation
escalate_to_security[source.id] if {
    some source in input.information_sources
    source.authority_continuity_failure
    source.behavioral_deviation_score > 4.0
}

# Comprehensive decision validation
valid_decision[decision] if {
    some decision in input.decisions

    # Must have integrity assessment
    decision.information_integrity

    # If critical, must meet higher standards
    decision.criticality != "critical"
    # OR
    decision.information_integrity >= integrity_threshold_high

    # If narrative-based, must have diversity
    not decision.based_on_narrative
    # OR
    decision.narrative.explanatory_diversity >= 2

    # Must not be based on quarantined information
    not decision.based_on_quarantined_info

    # If silence chosen, must be justified
    decision.decision_type != "strategic_silence"
    # OR
    decision.silence_justification
}

# ==============================================================================
# Metrics and Reporting
# ==============================================================================

# Calculate overall truth defense posture score
truth_defense_posture := score if {
    total_claims := count(input.claims)
    high_integrity_claims := count([c | some c in input.claims; c.integrity_score >= integrity_threshold_high])
    quarantined_low_integrity := count([c | some c in input.claims; c.integrity_score < integrity_threshold_low; c.quarantined])
    low_integrity_total := count([c | some c in input.claims; c.integrity_score < integrity_threshold_low])

    integrity_score := high_integrity_claims / total_claims
    containment_score := quarantined_low_integrity / low_integrity_total if low_integrity_total > 0 else 1.0

    score := (integrity_score + containment_score) / 2
}

# Identify high-risk decisions requiring immediate attention
high_risk_decisions[decision] if {
    some decision in input.decisions
    decision.criticality == "critical"
    decision.information_integrity < integrity_threshold_medium
}

high_risk_decisions[decision] if {
    some decision in input.decisions
    decision.based_on_narrative
    decision.narrative.unexplained_elements_ratio > 0.40
}

high_risk_decisions[decision] if {
    some decision in input.decisions
    decision.temporal_decision_value < 0.30
    decision.criticality in ["high", "critical"]
}

# ==============================================================================
# Output Summary
# ==============================================================================

# Aggregate all policy violations and warnings
violations := {
    "denials": deny,
    "warnings": warn,
    "truth_defense_posture": truth_defense_posture,
    "high_risk_decisions": high_risk_decisions,
    "escalations_to_security": escalate_to_security,
}
