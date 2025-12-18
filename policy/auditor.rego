package intelgraph.authz

# Auditor Role Policy
# Read-only access to audit logs and compliance reports

allow {
    input.subject.role == "auditor"
    input.action == "read"
    startswith(input.resource.type, "audit_")
}

allow {
    input.subject.role == "auditor"
    input.action == "read"
    input.resource.type == "compliance_report"
}

allow {
    input.subject.role == "auditor"
    input.action == "read"
    input.resource.type == "policy_definition"
}

# Auditors cannot write anything
deny {
    input.subject.role == "auditor"
    input.action != "read"
}
