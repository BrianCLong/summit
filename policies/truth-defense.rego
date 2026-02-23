# Truth Defense Policy
# Enforces adversarial-resistant decision-making rules

package summit.truth_defense

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
deny[msg] {
    claim := input.claims[_]
    claim.integrity_score < integrity_threshold_low
    not claim.quarantined
    msg := sprintf("Claim %v has critically low integrity (%v < %v) and must be quarantined",
        [claim.id, claim.integrity_score, integrity_threshold_low])
}

# High confidence without high integrity triggers escalation
warn[msg] {
    claim := input.claims[_]
    claim.confidence > confidence_threshold
    claim.integrity_score < integrity_threshold_medium
    not claim.escalated
    msg := sprintf("Claim %v has high confidence (%v) but medium/low integrity (%v) - escalation required",
        [claim.id, claim.confidence, claim.integrity_score])
}

# Integrity score components must all be present
deny[msg] {
    claim := input.claims[_]
    not claim.integrity_breakdown
    msg := sprintf("Claim %v missing integrity score breakdown", [claim.id])
}

deny[msg] {
    claim := input.claims[_]
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
warn[msg] {
    event := input.events[_]
    event.time_since_event_minutes < 30
    event.narrative_metrics.explanatory_diversity == 1
    event.narrative_metrics.unexplained_elements_ratio > 0.30
    not event.premature_convergence_flagged
    msg := sprintf("Event %v shows premature convergence (ED=1, UER=%v) before 30min threshold",
        [event.id, event.narrative_metrics.unexplained_elements_ratio])
}

# Coordinated narrative attack detection
deny[msg] {
    event := input.events[_]
    event.narrative_metrics.convergence_velocity > 5.0
    event.narrative_metrics.narrative_diversity_index < 0.20
    not event.coordinated_attack_investigation
    msg := sprintf("Event %v exhibits coordinated narrative attack pattern (CV=%v, NDI=%v) - investigation required",
        [event.id, event.narrative_metrics.convergence_velocity, event.narrative_metrics.narrative_diversity_index])
}

# Mandatory Alternative Hypothesis requirement
deny[msg] {
    decision := input.decisions[_]
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
warn[msg] {
    decision := input.decisions[_]
    decision.temporal_decision_value < 0.50
    is_high_critical(decision.criticality)
    not decision.temporal_degradation_acknowledged
    msg := sprintf("Decision %v has degraded temporal value (%v < 0.50) - acknowledgment required",
        [decision.id, decision.temporal_decision_value])
}

is_high_critical("high")
is_high_critical("critical")

# Information arrival deadline enforcement
deny[msg] {
    decision := input.decisions[_]
    decision.information_deadline_defined
    decision.status == "pending"
    decision.deadline_passed
    not decision.forced_decision_executed
    msg := sprintf("Decision %v passed information deadline without forced decision", [decision.id])
}

# Delay attack detection
warn[msg] {
    source := input.information_sources[_]
    source.delay_anomaly_score > 3.0
    not source.delay_investigation_active
    msg := sprintf("Source %v shows significant delay anomaly (score=%v) - potential delay attack",
        [source.id, source.delay_anomaly_score])
}

# ==============================================================================
# PILLAR 4: Authority Validation Rules
# ==============================================================================

# Identity verification required for high-impact claims
deny[msg] {
    claim := input.claims[_]
    claim.impact == "critical"
    not claim.identity_verified
    msg := sprintf("Critical claim %v lacks identity verification", [claim.id])
}

# Behavioral continuity check
warn[msg] {
    source := input.information_sources[_]
    source.behavioral_deviation_score > 3.0
    not source.elevated_scrutiny
    msg := sprintf("Source %v exhibits behavioral deviation (BDS=%v) - elevated scrutiny required",
        [source.id, source.behavioral_deviation_score])
}

deny[msg] {
    source := input.information_sources[_]
    source.behavioral_deviation_score > 5.0
    not source.quarantined
    msg := sprintf("Source %v exhibits critical behavioral deviation (BDS=%v) - quarantine required",
        [source.id, source.behavioral_deviation_score])
}

# Sudden source elevation blocking
deny[msg] {
    claim := input.claims[_]
    is_high_critical(claim.impact)
    claim.source.age_days < 30
    claim.source.authority_score < 0.60
    not claim.emergency_override
    msg := sprintf("Claim %v from new source (age=%v days, authority=%v) attempting high-impact claim without override",
        [claim.id, claim.source.age_days, claim.source.authority_score])
}

# Emergency override logging requirement
deny[msg] {
    decision := input.decisions[_]
    decision.authority_override_used
    not decision.override_justification
    msg := sprintf("Decision %v used authority override without justification", [decision.id])
}

deny[msg] {
    decision := input.decisions[_]
    decision.authority_override_used
    not decision.secondary_authorization
    msg := sprintf("Decision %v used authority override without secondary authorization", [decision.id])
}

# ==============================================================================
# PILLAR 5: Blast Radius Containment Rules
# ==============================================================================

# Compromised information must trigger dependency freeze
deny[msg] {
    claim := input.claims[_]
    claim.integrity_score < integrity_threshold_medium
    claim.has_dependencies
    not claim.dependencies_frozen
    msg := sprintf("Claim %v has medium/low integrity with unfrozen dependencies - containment required", [claim.id])
}

# Containment effectiveness tracking
warn[msg] {
    containment := input.containments[_]
    containment.active
    containment.containment_effectiveness < 0.80
    msg := sprintf("Containment %v has low effectiveness (%v < 0.80) - decisions escaping freeze",
        [containment.id, containment.containment_effectiveness])
}

# Reversibility index for critical decisions
warn[msg] {
    decision := input.decisions[_]
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
deny[msg] {
    decision := input.decisions[_]
    decision.decision_type == "strategic_silence"
    not decision.silence_justification
    msg := sprintf("Decision %v chose strategic silence without justification", [decision.id])
}

deny[msg] {
    decision := input.decisions[_]
    decision.decision_type == "strategic_silence"
    not decision.review_deadline
    msg := sprintf("Strategic silence decision %v lacks review deadline", [decision.id])
}

warn[msg] {
    decision := input.decisions[_]
    decision.decision_type == "strategic_silence"
    decision.review_deadline_passed
    not decision.review_completed
    msg := sprintf("Strategic silence decision %v passed review deadline without review", [decision.id])
}

# Silence overuse detection
warn[msg] {
    silence_decisions := [d | d := input.decisions[_]; d.decision_type == "strategic_silence"]
    silence_rate := count(silence_decisions) / count(input.decisions)
    silence_rate > 0.30
    msg := sprintf("Strategic silence rate (%v) exceeds 30%% threshold - possible decision paralysis", [silence_rate])
}

# ==============================================================================
# Cross-Cutting Rules
# ==============================================================================

# High-integrity information can proceed with normal thresholds
allow_decision[decision_id] {
    decision := input.decisions[_]
    decision_id := decision.id
    decision.information_integrity >= integrity_threshold_high
    decision.confidence >= confidence_threshold
}

# Medium-integrity requires elevated scrutiny
allow_decision_with_scrutiny[decision_id] {
    decision := input.decisions[_]
    decision_id := decision.id
    decision.information_integrity >= integrity_threshold_medium
    decision.information_integrity < integrity_threshold_high
    decision.elevated_scrutiny_applied
}

# Temporal pressure can override some requirements with acknowledgment
allow_temporal_override[decision_id] {
    decision := input.decisions[_]
    decision_id := decision.id
    decision.temporal_pressure_high
    decision.time_remaining_minutes < 15
    decision.temporal_override_acknowledged
    decision.blast_radius_containment_ready
}

# Authority continuity failure escalation
escalate_to_security[source_id] {
    source := input.information_sources[_]
    source_id := source.id
    source.authority_continuity_failure
    source.behavioral_deviation_score > 4.0
}

# Comprehensive decision validation
valid_decision[decision] {
    decision := input.decisions[_]

    # Must have integrity assessment
    decision.information_integrity

    # If critical, must meet higher standards
    meets_critical_standard(decision)

    # If narrative-based, must have diversity
    meets_narrative_diversity_standard(decision)

    # Must not be based on quarantined information
    not decision.based_on_quarantined_info

    # If silence chosen, must be justified
    meets_silence_justification_standard(decision)
}

meets_critical_standard(d) {
    d.criticality != "critical"
}
meets_critical_standard(d) {
    d.information_integrity >= integrity_threshold_high
}

meets_narrative_diversity_standard(d) {
    not d.based_on_narrative
}
meets_narrative_diversity_standard(d) {
    d.narrative.explanatory_diversity >= 2
}

meets_silence_justification_standard(d) {
    d.decision_type != "strategic_silence"
}
meets_silence_justification_standard(d) {
    d.silence_justification
}

# ==============================================================================
# Metrics and Reporting
# ==============================================================================

# Calculate overall truth defense posture score
truth_defense_posture = score {
    total_claims := count(input.claims)
    high_integrity_claims := count([c | c := input.claims[_]; c.integrity_score >= integrity_threshold_high])
    quarantined_low_integrity := count([c | c := input.claims[_]; c.integrity_score < integrity_threshold_low; c.quarantined])
    low_integrity_total := count([c | c := input.claims[_]; c.integrity_score < integrity_threshold_low])

    integrity_score := high_integrity_claims / total_claims
    cont_score := calculate_containment_score(quarantined_low_integrity, low_integrity_total)

    score := (integrity_score + cont_score) / 2
}

calculate_containment_score(q, total) = score {
    total > 0
    score := q / total
}
else = 1.0

# Identify high-risk decisions requiring immediate attention
high_risk_decisions[decision] {
    decision := input.decisions[_]
    decision.criticality == "critical"
    decision.information_integrity < integrity_threshold_medium
}

high_risk_decisions[decision] {
    decision := input.decisions[_]
    decision.based_on_narrative
    decision.narrative.unexplained_elements_ratio > 0.40
}

high_risk_decisions[decision] {
    decision := input.decisions[_]
    decision.temporal_decision_value < 0.30
    is_high_critical(decision.criticality)
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
