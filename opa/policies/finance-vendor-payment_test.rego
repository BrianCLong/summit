package finance.vendor_payment_test

import rego.v1
import data.finance.vendor_payment.decision

test_admin_under_threshold_allowed if {
    res := decision with input as {
        "user": {"role": "FinanceAdmin"},
        "payment": {"amount": 4000}
    }
    res.action == "allow"
}

test_admin_at_threshold_needs_approval if {
    res := decision with input as {
        "user": {"role": "FinanceAdmin"},
        "payment": {"amount": 5000}
    }
    res.action == "allow_with_approval"
    res.required_approvers == ["FinanceApprover", "FinanceAdmin"]
}

test_approver_needs_approval if {
    res := decision with input as {
        "user": {"role": "FinanceApprover"},
        "payment": {"amount": 1000}
    }
    res.action == "allow_with_approval"
}

test_high_value_payment_needs_admin if {
    res := decision with input as {
        "user": {"role": "FinanceApprover"},
        "payment": {"amount": 15000}
    }
    res.action == "allow_with_approval"
    res.required_approvers == ["FinanceAdmin"]
}

test_random_user_denied if {
    res := decision with input as {
        "user": {"role": "Operator"},
        "payment": {"amount": 1000}
    }
    res.action == "deny"
}

# Scenario 1: Admin different amounts
test_admin_1000 if {
    res := decision with input as {"user": {"role": "FinanceAdmin"}, "payment": {"amount": 1000}}
    res.action == "allow"
}
test_admin_4999 if {
    res := decision with input as {"user": {"role": "FinanceAdmin"}, "payment": {"amount": 4999}}
    res.action == "allow"
}
test_admin_5001 if {
    res := decision with input as {"user": {"role": "FinanceAdmin"}, "payment": {"amount": 5001}}
    res.action == "allow_with_approval"
}
test_admin_20000 if {
    res := decision with input as {"user": {"role": "FinanceAdmin"}, "payment": {"amount": 20000}}
    res.action == "allow_with_approval"
}

# Scenario 2: Approver different amounts
test_approver_100 if {
    res := decision with input as {"user": {"role": "FinanceApprover"}, "payment": {"amount": 100}}
    res.action == "allow_with_approval"
}
test_approver_10000 if {
    res := decision with input as {"user": {"role": "FinanceApprover"}, "payment": {"amount": 10000}}
    res.action == "allow_with_approval"
}
test_approver_10001 if {
    res := decision with input as {"user": {"role": "FinanceApprover"}, "payment": {"amount": 10001}}
    res.action == "allow_with_approval"
}

# Scenario 3: Denied users
test_operator_5000 if {
    res := decision with input as {"user": {"role": "Operator"}, "payment": {"amount": 5000}}
    res.action == "deny"
}
test_guest_100 if {
    res := decision with input as {"user": {"role": "Guest"}, "payment": {"amount": 100}}
    res.action == "deny"
}

# Boundary tests
test_boundary_0 if {
    res := decision with input as {"user": {"role": "FinanceAdmin"}, "payment": {"amount": 0}}
    res.action == "allow"
}
test_boundary_negative if {
    res := decision with input as {"user": {"role": "FinanceAdmin"}, "payment": {"amount": -1}}
    res.action == "allow"
}

# More variations
test_v1 if {
    res := decision with input as {"user": {"role": "FinanceAdmin"}, "payment": {"amount": 2500}}
    res.action == "allow"
}
test_v2 if {
    res := decision with input as {"user": {"role": "FinanceAdmin"}, "payment": {"amount": 7500}}
    res.action == "allow_with_approval"
}
test_v3 if {
    res := decision with input as {"user": {"role": "FinanceApprover"}, "payment": {"amount": 5000}}
    res.action == "allow_with_approval"
}
test_v4 if {
    res := decision with input as {"user": {"role": "FinanceApprover"}, "payment": {"amount": 11000}}
    res.action == "allow_with_approval"
}
test_v5 if {
    res := decision with input as {"user": {"role": "Operator"}, "payment": {"amount": 20000}}
    res.action == "deny"
}
test_v6 if {
    res := decision with input as {"user": {"role": "FinanceAdmin"}, "payment": {"amount": 12000}}
    res.action == "allow_with_approval"
}
test_v7 if {
    res := decision with input as {"user": {"role": "FinanceApprover"}, "payment": {"amount": 9999}}
    res.action == "allow_with_approval"
}
test_v8 if {
    res := decision with input as {"user": {"role": "FinanceAdmin"}, "payment": {"amount": 4999.99}}
    res.action == "allow"
}
test_v9 if {
    res := decision with input as {"user": {"role": "FinanceApprover"}, "payment": {"amount": 10000.01}}
    res.action == "allow_with_approval"
}
test_v10 if {
    res := decision with input as {"user": {"role": "Unknown"}, "payment": {"amount": 100}}
    res.action == "deny"
}
test_v11 if {
    res := decision with input as {"user": {"role": ""}, "payment": {"amount": 100}}
    res.action == "deny"
}
test_v12 if {
    res := decision with input as {"user": {}, "payment": {"amount": 100}}
    res.action == "deny"
}
test_v13 if {
    res := decision with input as {"user": {"role": "FinanceAdmin"}, "payment": {}}
    res.action == "deny"
}
test_v14 if {
    res := decision with input as {"user": {"role": "FinanceAdmin"}, "payment": {"amount": "lots"}}
    res.action == "deny"
}
test_v15 if {
    res := decision with input as {"user": {"role": "FinanceAdmin"}, "payment": {"amount": 1000000}}
    res.action == "allow_with_approval"
}
