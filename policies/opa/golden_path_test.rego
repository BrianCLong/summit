package golden_path_test

import rego.v1
import data.golden_path

test_allow_main_passing if {
    golden_path.warn == set() with input as {"branch": "main", "checks": {"Golden Path Supply Chain": "success"}}
}

test_warn_main_failing if {
    count(golden_path.warn) == 1 with input as {"branch": "main", "checks": {"Golden Path Supply Chain": "failure"}}
}

test_allow_other_branch if {
    golden_path.warn == set() with input as {"branch": "feature/123", "checks": {}}
}
