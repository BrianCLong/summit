package intelgraph.authz

import future.keywords.if
import future.keywords.contains

# Auditor Role Policy
# Read-only access to audit logs and compliance reports

allow if {
    input.subject.role == "auditor"
    input.action == "read"
    startswith(input.resource.type, "audit_")
}

allow if {
    input.subject.role == "auditor"
    input.action == "read"
    input.resource.type == "compliance_report"
}

allow if {
    input.subject.role == "auditor"
    input.action == "read"
    input.resource.type == "policy_definition"
}

# Auditors cannot write anything
deny if {
    input.subject.role == "auditor"
    input.action != "read"
}
