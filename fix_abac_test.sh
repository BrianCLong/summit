sed -i 's/test_allow_same_tenant if {/test_allow_same_tenant {/g' policy/tests/abac_test.rego
sed -i 's/test_deny_cross_tenant if {/test_deny_cross_tenant {/g' policy/tests/abac_test.rego
sed -i 's/test_deny_residency_mismatch if {/test_deny_residency_mismatch {/g' policy/tests/abac_test.rego
sed -i 's/test_deny_clearance if {/test_deny_clearance {/g' policy/tests/abac_test.rego
sed -i 's/test_least_privilege_violation if {/test_least_privilege_violation {/g' policy/tests/abac_test.rego
sed -i 's/test_requires_step_up_for_secret if {/test_requires_step_up_for_secret {/g' policy/tests/abac_test.rego
sed -i 's/test_step_up_satisfied_with_high_acr if {/test_step_up_satisfied_with_high_acr {/g' policy/tests/abac_test.rego
sed -i 's/test_dual_control_blocks_privileged_action_without_approvals if {/test_dual_control_blocks_privileged_action_without_approvals {/g' policy/tests/abac_test.rego
sed -i 's/test_dual_control_rejects_self_approval_and_requires_two_distinct if {/test_dual_control_rejects_self_approval_and_requires_two_distinct {/g' policy/tests/abac_test.rego
sed -i 's/test_dual_control_allows_privileged_action_with_two_distinct_approvals if {/test_dual_control_allows_privileged_action_with_two_distinct_approvals {/g' policy/tests/abac_test.rego
sed -i 's/decision_for(subject, resource, action) := decision if {/decision_for(subject, resource, action) = decision {/g' policy/tests/abac_test.rego
sed -i 's/allow(decision) if {/allow(decision) {/g' policy/tests/abac_test.rego
