package stewardship

import future.keywords.if
import future.keywords.contains

import future.keywords.in

# STEWARDSHIP & REFUSAL DOCTRINE
# Enforces the Refusal Matrix and Constraint Ladder

default allow := true

# PROHIBITED USES (Refusal Matrix)
# Deny requests that match prohibited use categories.
deny contains msg if {
    input.context.purpose == "coercive_population_control"
    msg := "REFUSAL: Coercive population control is a prohibited use."
}

deny contains msg if {
    input.context.purpose == "autonomous_lethal_decision"
    msg := "REFUSAL: Autonomous lethal decision-making is prohibited."
}

deny contains msg if {
    input.context.purpose == "covert_mass_persuasion"
    msg := "REFUSAL: Covert mass persuasion (PsyOps) is prohibited."
}

deny contains msg if {
    input.context.purpose == "unverifiable_intel_laundering"
    msg := "REFUSAL: Unverifiable intelligence laundering is prohibited."
}

# CONSTRAINT LADDER ENFORCEMENT
# In stricter constraint levels, certain actions are blocked.

# Level 3: Maintenance Only - Block all mutations
deny contains msg if {
    input.constraint_level >= 3
    input.method == "POST" # Simplified mutation check
    not is_export_operation(input)
    msg := "CONSTRAINT: System is in Maintenance Mode. Only export/audit operations allowed."
}

# Level 4: Emergency Shutdown - Block everything
deny contains msg if {
    input.constraint_level >= 4
    msg := "SHUTDOWN: System is in Emergency Shutdown mode."
}

# Helper to identify allow-listed operations during maintenance
is_export_operation(req) if {
    req.path == "/api/export"
}

is_export_operation(req) if {
    req.path == "/api/audit"
}
