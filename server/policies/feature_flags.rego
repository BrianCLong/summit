import future.keywords
package feature_flags

default decision = {
  "enabled": false,
  "reason": "disabled-by-default",
  "kill_switch_active": false,
  "audit": {},
}

default kill_switch = {
  "active": false,
  "reason": "kill-switch-default-off",
}

allowed_flag[flag] {
  flag := input.flag
  input.context.environment == "development"
}

kill_switch_active {
  input.context.module != ""
  input.context.environment == "production"
  input.context.metadata.path == "/dangerous"
}

decision = {
  "enabled": enabled,
  "reason": reason,
  "kill_switch_active": kill_switch_active,
  "audit": {
    "user": input.context.userId,
    "tenant": input.context.tenantId,
    "trace_id": input.context.traceId,
    "evaluation_id": input.evaluation_id,
  },
  "metadata": {
    "environment": input.context.environment,
    "module": input.context.module,
  },
} {
  flag := input.flag
  allowed_flag[flag]
  enabled := true
  reason := "flag-enabled"
  kill_switch_active := kill_switch_active
}

kill_switch = {
  "active": active,
  "reason": reason,
  "audit": {
    "module": input.context.module,
    "trace_id": input.context.traceId,
    "evaluation_id": input.evaluation_id,
  },
} {
  active := kill_switch_active
  reason := "opa-kill-switch"
}
