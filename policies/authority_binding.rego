# IntelGraph GA-Core Authority Binding Policy
# Addresses Foster & Starkey dissent requirements

package intelgraph.authority

import rego.v1

# Default deny - Committee requirement
default allow := false

# Authority binding validation
allow if {
    input.user.clearance_level >= required_clearance
    input.operation.authority_binding != null
    valid_authority_binding
}

# Foster dissent: Runtime-blocking license enforcement
allow if {
    input.operation.license_check == true
    input.operation.license_status == "ACTIVE"
    input.operation.tos_accepted == true
}

# Starkey dissent: Verifiable export manifests required
allow if {
    input.operation.type == "export"
    input.operation.export_manifest != null
    input.operation.export_manifest.hash != null
    input.operation.disclosure_bundle == "IMMUTABLE"
}

# Required clearance levels by operation type
required_clearance := 5 if input.operation.type == "classified_query"
required_clearance := 3 if input.operation.type == "graph_xai_analysis"
required_clearance := 2 if input.operation.type == "temporal_analysis"
required_clearance := 1 if input.operation.type == "basic_query"

# Authority binding validation logic
valid_authority_binding if {
    input.operation.authority_binding.type in ["WARRANT", "SUBPOENA", "COURT_ORDER", "ADMIN_AUTH"]
    input.operation.authority_binding.jurisdiction != ""
    input.operation.authority_binding.expiry_date > time.now_ns()
}

# Deny if missing required components
deny[reason] if {
    input.operation.type in ["export", "classified_query"]
    input.operation.authority_binding == null
    reason := "Missing authority binding for restricted operation"
}

deny[reason] if {
    input.operation.type == "export"
    input.operation.export_manifest == null
    reason := "Missing export manifest - Starkey dissent requirement"
}

deny[reason] if {
    input.user.license_status != "ACTIVE"
    reason := "Invalid license status - Foster dissent requirement"
}
