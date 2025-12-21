package compliance.access_test

import data.compliance.access

test_allow_authorized {
    access.allow with input as {"user": {"clearance_level": 2, "jurisdiction": "US"}, "resource": {"required_clearance": 1, "jurisdiction": "US"}}
}

test_deny_unauthorized {
    not access.allow with input as {"user": {"clearance_level": 1, "jurisdiction": "US"}, "resource": {"required_clearance": 2, "jurisdiction": "US"}}
}
