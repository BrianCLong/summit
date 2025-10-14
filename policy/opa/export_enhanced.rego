package intelgraph.policy.export.enhanced

import future.keywords.if
import future.keywords.in
import future.keywords.contains

# Default deny for security
default allow := false
default requires_approval := false

# License compatibility matrix
license_compatibility := {
    "MIT": {"commercial": true, "research": true, "export": true},
    "Apache-2.0": {"commercial": true, "research": true, "export": true},
    "GPL-3.0": {"commercial": false, "research": true, "export": true},
    "AGPL-3.0": {"commercial": false, "research": true, "export": false},
    "CC-BY-NC": {"commercial": false, "research": true, "export": true},
    "PROPRIETARY": {"commercial": false, "research": false, "export": false},
    "EMBARGOED": {"commercial": false, "research": false, "export": false},
    "DISALLOW_EXPORT": {"commercial": false, "research": false, "export": false},
    "VIEW_ONLY": {"commercial": false, "research": false, "export": false},
    "SEAL_ONLY": {"commercial": false, "research": false, "export": false},
    "SELF_EDIT_SYNTHETIC": {"commercial": false, "research": true, "export": false}
}

# Risk levels for different export types
export_risk_levels := {
    "analysis": "low",
    "report": "medium",
    "dataset": "high",
    "api": "medium"
}

# Policy violations with detailed reasons
deny contains violation if {
    input.action == "export"
    some i
    source := input.dataset.sources[i]
    not license_allows_export(source.license)
    violation := {
        "code": "LICENSE_VIOLATION",
        "message": sprintf("Export blocked by license %s for source %s", [source.license, source.id]),
        "source": source,
        "appeal_code": generate_appeal_code(source),
        "appeal_url": sprintf("https://compliance.intelgraph.io/appeal/%s", [generate_appeal_code(source)]),
        "severity": "blocking"
    }
}

deny contains violation if {
    input.action == "export"
    input.context.purpose == "commercial"
    some i
    source := input.dataset.sources[i]
    not license_compatibility[source.license]["commercial"]
    violation := {
        "code": "COMMERCIAL_USE_VIOLATION",
        "message": sprintf("Commercial use not permitted for license %s", [source.license]),
        "source": source,
        "appeal_code": "COM001",
        "appeal_url": "https://compliance.intelgraph.io/appeal/COM001",
        "severity": "blocking"
    }
}

deny contains violation if {
    input.action == "export"
    input.context.export_type == "dataset"
    input.context.destination
    contains(input.context.destination, "external")
    some i
    source := input.dataset.sources[i]
    source.classification == "restricted"
    violation := {
        "code": "EXTERNAL_RESTRICTED_DATA",
        "message": "Restricted data cannot be exported to external destinations",
        "source": source,
        "appeal_code": "EXT001",
        "appeal_url": "https://compliance.intelgraph.io/appeal/EXT001",
        "severity": "blocking"
    }
}

# PII/Sensitive data checks
deny contains violation if {
    input.action == "export"
    some i
    source := input.dataset.sources[i]
    contains_pii(source)
    not has_pii_approval(input.context)
    violation := {
        "code": "PII_EXPORT_WITHOUT_APPROVAL",
        "message": "PII data export requires explicit approval",
        "source": source,
        "appeal_code": "PII001",
        "appeal_url": "https://compliance.intelgraph.io/appeal/PII001",
        "severity": "blocking"
    }
}

# Approval requirements for high-risk exports
requires_approval if {
    input.action == "export"
    export_risk_levels[input.context.export_type] == "high"
    count([s | s := input.dataset.sources[_]; s.license in {"GPL-3.0", "AGPL-3.0", "CC-BY-NC"}]) > 0
}

requires_approval if {
    input.action == "export"
    input.context.export_type == "dataset"
    count([s | s := input.dataset.sources[_]; contains_pii(s)]) > 0
}

# Dual control requirements
requires_dual_control if {
    input.action == "export"
    some i
    source := input.dataset.sources[i]
    source.license in {"PROPRIETARY", "EMBARGOED"}
    source.owner != input.context.user_id
}

requires_dual_control if {
    input.action == "export"
    input.context.export_type == "dataset"
    count(input.dataset.sources) > 100  # Large dataset exports
}

# Step-up authentication requirements
requires_step_up if {
    input.action == "export"
    some i
    source := input.dataset.sources[i]
    source.classification in {"confidential", "restricted", "top-secret"}
}

requires_step_up if {
    input.action == "export"
    requires_dual_control
}

# Allow export if all conditions are met
allow if {
    input.action == "export"
    count(deny) == 0
    not requires_step_up
    check_user_permissions
}

allow if {
    input.action == "export"
    count(deny) == 0
    requires_step_up
    input.context.step_up_verified == true
    check_user_permissions
}

# Override allowance with proper approvals
allow if {
    input.action == "export"
    count(blocking_violations) == 0  # Only non-blocking violations
    has_required_approvals
    check_user_permissions
}

# Helper functions
license_allows_export(license) if {
    license_compatibility[license]["export"] == true
}

contains_pii(source) if {
    some field in source.fields
    field.type in {"email", "phone", "ssn", "address", "name", "credit_card"}
}

contains_pii(source) if {
    source.pii_detected == true
}

has_pii_approval(context) if {
    "pii-export" in context.approvals
}

has_pii_approval(context) if {
    context.pii_export_approved == true
}

check_user_permissions if {
    input.context.user_role in {"analyst", "investigator", "admin", "compliance-officer"}
}

check_user_permissions if {
    "export:basic" in input.context.user_scopes
}

has_required_approvals if {
    requires_approval
    "compliance-officer" in input.context.approvals
}

has_required_approvals if {
    requires_dual_control
    count(input.context.approvals) >= 2
    "compliance-officer" in input.context.approvals
}

has_required_approvals if {
    not requires_approval
    not requires_dual_control
}

blocking_violations contains violation if {
    violation := deny[_]
    violation.severity == "blocking"
}

generate_appeal_code(source) := code if {
    source.license == "GPL-3.0"
    code := "LIC001"
} else := code if {
    source.license == "AGPL-3.0"
    code := "LIC002"
} else := code if {
    source.license == "PROPRIETARY"
    code := "LIC003"
} else := "LIC999"

# Risk assessment output
risk_assessment := {
    "level": compute_risk_level,
    "factors": risk_factors,
    "requires_approval": requires_approval,
    "requires_dual_control": requires_dual_control,
    "requires_step_up": requires_step_up
}

compute_risk_level := "high" if {
    count(blocking_violations) > 0
} else := "high" if {
    requires_dual_control
} else := "medium" if {
    requires_approval
} else := "low"

risk_factors contains factor if {
    some i
    source := input.dataset.sources[i]
    source.license in {"GPL-3.0", "AGPL-3.0", "CC-BY-NC"}
    factor := sprintf("Restrictive license: %s", [source.license])
}

risk_factors contains factor if {
    input.context.export_type == "dataset"
    input.context.destination
    contains(input.context.destination, "external")
    factor := "External dataset export"
}

risk_factors contains factor if {
    count([s | s := input.dataset.sources[_]; contains_pii(s)]) > 0
    factor := "Contains PII data"
}

risk_factors contains factor if {
    count(input.dataset.sources) > 50
    factor := "Large number of sources"
}

# Policy decision summary
decision := {
    "action": action_decision,
    "allow": allow,
    "violations": deny,
    "risk_assessment": risk_assessment,
    "required_approvals": required_approvals_list,
    "appeal_available": count(deny) > 0,
    "next_steps": next_steps
}

action_decision := "allow" if {
    allow
} else := "deny" if {
    count(blocking_violations) > 0
} else := "review" if {
    requires_approval
} else := "deny"

required_approvals_list contains approval if {
    requires_approval
    approval := "compliance-officer"
}

required_approvals_list contains approval if {
    requires_dual_control
    approval := "dual-control"
}

required_approvals_list contains approval if {
    some i
    source := input.dataset.sources[i]
    contains_pii(source)
    approval := "pii-export"
}

next_steps contains step if {
    count(deny) > 0
    step := "Submit appeal using provided appeal codes"
}

next_steps contains step if {
    requires_step_up
    not input.context.step_up_verified
    step := "Complete step-up authentication"
}

next_steps contains step if {
    requires_approval
    not has_required_approvals
    step := "Obtain required approvals from compliance officer"
}

next_steps contains step if {
    allow
    step := "Export approved - proceed with download"
}
deny contains violation if {
    input.action == "export"
    some i
    source := input.dataset.sources[i]
    source.license == "SELF_EDIT_SYNTHETIC"
    not input.context.self_edit_reviewed
    violation := {
        "code": "SELF_EDIT_REVIEW_REQUIRED",
        "message": "Self-edit synthetic data requires compliance review before export",
        "source": source,
        "appeal_code": "SEL001",
        "appeal_url": "https://compliance.intelgraph.io/appeal/SEL001",
        "severity": "blocking"
    }
}
