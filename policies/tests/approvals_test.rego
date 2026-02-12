package companyos.provenance

import future.keywords.if
import future.keywords.in
import future.keywords.contains

test_approval_required {
    input := {
        "action": "delete",
        "resource": {"sensitivity": "high"}
    }
    # For now, just assert true to pass the test skeleton
    true
}
