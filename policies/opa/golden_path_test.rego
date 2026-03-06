package golden_path_test
import data.golden_path
import future.keywords.if

test_allow_main_passing if {
    golden_path.warn == set() with input as {"branch": "main", "checks": {"Golden Path Supply Chain": "success"}}
}

test_warn_main_failing if {
    count(golden_path.warn) == 1 with input as {"branch": "main", "checks": {"Golden Path Supply Chain": "failure"}}
}

test_allow_other_branch if {
    golden_path.warn == set() with input as {"branch": "feature/123", "checks": {}}
}

test_golden_path_missing_checks {
	res := golden_path.allow with input as {"branch": "main"}
	not res

	warn := golden_path.warn with input as {"branch": "main"}
	warn == {"Golden Path checks must pass for main branch deployments"}
}
