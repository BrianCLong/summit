package feature_flags

import future.keywords.if
import future.keywords.in

default decision = {"enabled": false, "reason": "default_deny", "kill_switch_active": false}

# Main decision rule
decision = result {
    flag_name := input.flag
    context := object.get(input, "context", {})

    # Get flag config from data or default to empty
    # Assuming data.flags is populated from flags.yaml
    flag_config := object.get(data, ["flags", flag_name], {})

    # Check kill switch
    not is_kill_switch_active(flag_name)

    # Evaluate enablement
    is_enabled := check_enabled(flag_config, context)

    result := {
        "enabled": is_enabled,
        "reason": get_reason(is_enabled, flag_config, context),
        "kill_switch_active": false
    }
}

# Kill switch check
is_kill_switch_active(flag) {
    data.kill_switches[flag] == true
}

# Check if enabled based on context
check_enabled(config, context) if {
    # 1. Check strict allowlist (tenants)
    config.allowlist_tenants
    context.tenantId in config.allowlist_tenants
}

check_enabled(config, context) if {
    # 2. Check strict allowlist (users)
    config.allowlist_users
    context.userId in config.allowlist_users
}

check_enabled(config, context) if {
    # 3. Fallback to default
    # If allowlists exist, we implicitly deny if not matched (by not matching above rules).
    # So we only return true here if no allowlists are defined AND default is true.
    not config.allowlist_tenants
    not config.allowlist_users
    config.default == true
}

get_reason(true, config, context) = "tenant_allowlist_match" if {
    context.tenantId in object.get(config, "allowlist_tenants", [])
}
get_reason(true, config, context) = "user_allowlist_match" if {
    context.userId in object.get(config, "allowlist_users", [])
}
get_reason(true, config, _) = "default_true" if {
    not config.allowlist_tenants
    not config.allowlist_users
    config.default == true
}
get_reason(false, _, _) = "disabled"
