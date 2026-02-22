
package conductor
import future.keywords.if
import future.keywords.in

test_allow_known_good {
    allow with input as {
        "verb": "get",
        "path": ["api", "v1", "entities"],
        "principal": {"roles": ["viewer"]}
    }
}

test_deny_risky_op {
    not allow with input as {
        "verb": "delete",
        "path": ["database"],
        "principal": {"roles": ["viewer"]}
    }
}
