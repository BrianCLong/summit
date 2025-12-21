package compliance.access

default allow = false

allow {
    input.user.clearance_level >= input.resource.required_clearance
    input.user.jurisdiction == input.resource.jurisdiction
}

deny {
    not allow
}
