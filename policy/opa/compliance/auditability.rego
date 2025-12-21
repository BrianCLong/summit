package compliance.auditability

# Require audit trail for all sensitive actions
deny[msg] {
    input.action == "write"
    input.sensitivity == "high"
    not input.audit_id
    msg := "High sensitivity write missing audit_id"
}
