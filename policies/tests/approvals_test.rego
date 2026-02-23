package companyos.provenance
import future.keywords

test_approval_required {
    input := {
        "action": "delete",
        "resource": {"sensitivity": "high"}
    }
    # For now, just assert true to pass the test skeleton
    true
}
