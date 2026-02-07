import future.keywords
package compliance.explainability

default allow = false

# Explainability rules
# High-stakes decisions must have an explanation object
allow if {
    input.decision_type == "high_stakes"
    input.explanation != null
}

# Low-stakes decisions might not need full explanation
allow if {
    input.decision_type == "low_stakes"
}
