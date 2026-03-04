sed -i 's/test_allow_governance_admin if {/test_allow_governance_admin {/g' policy/main_test.rego
sed -i 's/test_allow_governance_bot if {/test_allow_governance_bot {/g' policy/main_test.rego
sed -i 's/test_deny_suspended_tenant if {/test_deny_suspended_tenant {/g' policy/main_test.rego
sed -i 's/test_deny_default if {/test_deny_default {/g' policy/main_test.rego
