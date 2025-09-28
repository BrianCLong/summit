package mc.admin.v043

test_residency_enforced {
  not allow with input as {
    "operation": {"name": "quantumSubmit", "variables": {"input": {"regionId": "EU"}}},
    "actor": {"region": "US"},
    "tenant": {"budget": {"minutesUsed": 0, "hardCeiling": 10}}
  }
}

test_budget_violation_blocks {
  not allow with input as {
    "operation": {"name": "quantumSubmit", "variables": {"input": {"payload": {"costMinutes": 9}}}},
    "actor": {"region": "US"},
    "tenant": {"budget": {"minutesUsed": 3, "hardCeiling": 10}}
  }
}