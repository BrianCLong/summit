package intelgraph.authz

test_auditor_can_read_audit_logs {
    allow with input as {
        "subject": {"role": "auditor"},
        "action": "read",
        "resource": {"type": "audit_log"}
    }
}

test_auditor_can_read_compliance_report {
    allow with input as {
        "subject": {"role": "auditor"},
        "action": "read",
        "resource": {"type": "compliance_report"}
    }
}

test_auditor_cannot_write_report {
    not allow with input as {
        "subject": {"role": "auditor"},
        "action": "write",
        "resource": {"type": "compliance_report"}
    }
}
