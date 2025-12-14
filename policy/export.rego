package intelgraph.export

default allow = false

# Allow if user has license and authority, and audience is not blocked
allow {
    input.user.license_id != null
    has_sufficient_authority(input.user.authority, input.data.classification)
    not is_blocked_jurisdiction(input.audience)
}

# Helper: Check if authority level covers data classification
has_sufficient_authority(user_auth, data_class) {
    # Simple integer comparison for MVP
    # 1=Public, 2=Internal, 3=Confidential, 4=Secret
    user_auth >= data_class
}

# Helper: Check for blocked audiences
is_blocked_jurisdiction(audience) {
    blocked_audiences := {"adversary", "banned_state", "embargoed_region"}
    audience == blocked_audiences[_]
}
