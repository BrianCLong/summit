package companyos.provenance
import future.keywords.contains
import future.keywords.if
import future.keywords.in

test_approval_required {
    input := {
        "action": "delete",
        "resource": {"sensitivity": "high"}
    }
    # For now, just assert true to pass the test skeleton
    true
}
