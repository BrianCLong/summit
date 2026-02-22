import future.keywords
package policy_tests

import data.maestro.authz

base_input := {
  "tenantId": "tenant-1",
  "role": "admin",
  "action": "",
  "resource": "maestro_run",
  "resourceAttributes": {
    "runId": "run-123"
  },
  "subjectAttributes": {}
}

test_allow_start_run_admin {
  input := object.union(base_input, {"action": "start_run", "role": "admin"})
  authz.allow with input as input
}

test_allow_cancel_run_operator {
  input := object.union(base_input, {"action": "cancel_run", "role": "operator"})
  authz.allow with input as input
}

test_allow_approve_step_approver {
  input := object.union(base_input, {"action": "approve_step", "role": "approver"})
  authz.allow with input as input
}

test_allow_override_sre {
  input := object.union(base_input, {"action": "override", "role": "sre"})
  authz.allow with input as input
}

test_allow_export_receipts_auditor {
  input := object.union(base_input, {"action": "export_receipts", "role": "auditor"})
  authz.allow with input as input
}

test_allow_delete_run_admin {
  input := object.union(base_input, {"action": "delete_run", "role": "admin"})
  authz.allow with input as input
}

test_deny_start_run_viewer {
  input := object.union(base_input, {"action": "start_run", "role": "viewer"})
  not authz.allow with input as input
}

test_deny_cancel_run_unassigned {
  input := object.union(base_input, {"action": "cancel_run", "role": ""})
  not authz.allow with input as input
}

test_deny_approve_step_operator {
  input := object.union(base_input, {"action": "approve_step", "role": "operator"})
  not authz.allow with input as input
}

test_deny_override_approver {
  input := object.union(base_input, {"action": "override", "role": "approver"})
  not authz.allow with input as input
}

test_deny_export_receipts_operator {
  input := object.union(base_input, {"action": "export_receipts", "role": "operator"})
  not authz.allow with input as input
}

test_deny_delete_run_auditor {
  input := object.union(base_input, {"action": "delete_run", "role": "auditor"})
  not authz.allow with input as input
}
