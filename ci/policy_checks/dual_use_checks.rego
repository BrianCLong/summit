package influence_ops.dual_use

import rego.v1

# Default allow to false
default allow := false

# Allow if no violations found
allow if {
    count(violations) == 0
}

# Define prohibited keywords related to offensive operations
prohibited_keywords := {
    "maximize_polarization",
    "incite_violence",
    "erode_trust",
    "suppress_voting",
    "optimize_harm",
    "offensive_campaign",
    "attack_vector_optimization"
}

# Check for prohibited keywords in report summary
violations contains msg if {
    some keyword in prohibited_keywords
    contains(lower(input.report.summary), keyword)
    msg := sprintf("Prohibited keyword found in report summary: %s", [keyword])
}

# Check for prohibited keywords in configuration
violations contains msg if {
    some keyword in prohibited_keywords
    contains(lower(input.config.objective), keyword)
    msg := sprintf("Prohibited keyword found in configuration objective: %s", [keyword])
}

# Check for prohibited segment targeting
violations contains msg if {
    input.segment_targeting.individual_targeting == true
    msg := "Individual targeting is prohibited. Use aggregate segments only."
}

# Check for prohibited optimization goals
violations contains msg if {
    input.optimization.goal == "maximize_harm"
    msg := "Optimization goal 'maximize_harm' is prohibited."
}
