
package conductor
import rego.v1

test_allow_known_good if {
    allow with input as {
        "verb": "get",
        "path": ["api", "v1", "entities"],
        "principal": {"roles": ["viewer"]}
    }
}

test_deny_risky_op if {
    not allow with input as {
        "verb": "delete",
        "path": ["database"],
        "principal": {"roles": ["viewer"]}
    }
}
