import future.keywords.in
import future.keywords.if
package summit.regulatory

# Policy-as-code for Regulatory Advantage
# See docs/strategy/REGULATORY_ADVANTAGE.md for full strategy.

# 5. Anticipatory Compliance Architecture Specification
# "Compliance must be Native, Automated, Cheap for us, Structurally expensive for others"

# Deny deployments if "jurisdiction" is not specified (Jurisdictional Toggles)
# This ensures we are always aware of the regulatory regime for any deployment.
deny contains msg if {
    input.kind == "DeploymentConfig"
    not input.config.jurisdiction
    msg := "Regulatory Violation: Missing 'jurisdiction' toggle in deployment configuration. See strategy/REGULATORY_ADVANTAGE.md#5"
}

# Deny sensitive operations if audit logging is disabled (Immutable Audit Logs)
# This ensures "Clean Hands" provability.
deny contains msg if {
    input.operation.sensitivity == "high"
    not input.config.audit_logging_enabled
    msg := "Regulatory Violation: Audit logging must be enabled for high-sensitivity operations. See strategy/REGULATORY_ADVANTAGE.md#5"
}

# Deny regulator interactions that are private without legal clearance (Clean-Hands Policy)
# "No private rule drafting", "No undisclosed relationships"
deny contains msg if {
    input.interaction.type == "regulator_meeting"
    input.interaction.private == true
    not input.interaction.legal_clearance
    msg := "Clean Hands Violation: Private regulator meetings require prior legal clearance. See strategy/REGULATORY_ADVANTAGE.md#2"
}

# Ensure Provenance Graph hook is enabled for new features
# "Provenance graphs" capability
deny contains msg if {
    input.kind == "FeatureDefinition"
    input.feature.provenance_enabled == false
    msg := "Regulatory Violation: Feature definitions must have provenance enabled by default. See strategy/REGULATORY_ADVANTAGE.md#5"
}
