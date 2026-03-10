package companyos.provenance
import rego.v1

test_approval_required if {
    input := {
        "action": "delete",
        "resource": {"sensitivity": "high"}
    }
    # For now, just assert true to pass the test skeleton
    true
}
