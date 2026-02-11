package policy.obligations

# OPA Obligations for RFA and Step-Up Auth
# Corresponds to audit/policy/rfa_matrix.yaml

default require_rfa := false
default require_step_up := false
default rfa_fields := []
default min_reason_len := 0

# Obligation: Require RFA
require_rfa if {
    input.action == "export"
    input.resource.classification == "restricted"
}

require_rfa if {
    input.action == "impersonate"
}

require_rfa if {
    input.action == "delete"
    input.resource.classification == "restricted"
}

# Obligation: Require Step-Up
require_step_up if {
    input.action == "export"
    input.resource.classification == "restricted"
}

require_step_up if {
    input.action == "impersonate"
    input.actor.roles[_] == "admin"
}

require_step_up if {
    input.action == "delete"
    input.resource.classification == "restricted"
}

# Obligation: RFA Fields
rfa_fields := ["reason", "ticket"] if {
    require_rfa
    input.resource.classification == "restricted"
}

rfa_fields := ["reason"] if {
    require_rfa
    input.resource.classification != "restricted"
}

# Obligation: Reason Length
min_reason_len := 20 if {
    require_rfa
    input.resource.classification == "restricted"
}

min_reason_len := 10 if {
    require_rfa
    input.resource.classification != "restricted"
}
