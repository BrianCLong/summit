package feature_flags.kill_switch

default active = false
default reason = "not-configured"

# Check if a specific module has a kill switch active
active {
    some module
    input.module == module
    data.kill_switches[module] == true
}

reason = "Administrative kill-switch activated" {
    active
}
