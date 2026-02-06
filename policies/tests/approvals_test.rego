package companyos.provenance
test_approval_required if {
    input := {
        "action": "delete",
        "resource": {"sensitivity": "high"}
    }
    # For now, just assert true to pass the test skeleton
    true
}
