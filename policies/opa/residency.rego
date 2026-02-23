package composer.residency

import future.keywords.in

# Data residency policy

allowed_regions := input.tenant.allowed_regions

allow {
    input.artifact.region in allowed_regions
}

deny {
    not allow
}
