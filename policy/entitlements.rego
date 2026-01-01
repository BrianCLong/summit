package entitlements

import data.tenants
import input.user
import input.request

default allow = false

# Tier definitions (mirrors SKU_CAPABILITY_MATRIX)
tiers = {
    "FREE": {
        "max_requests_min": 20,
        "max_seats": 5,
        "sso": false,
        "advanced_graph": false
    },
    "CORE": {
        "max_requests_min": 100,
        "max_seats": 5,
        "sso": false,
        "advanced_graph": false
    },
    "PRO": {
        "max_requests_min": 1000,
        "max_seats": 20,
        "sso": true,
        "advanced_graph": true
    },
    "ENTERPRISE": {
        "max_requests_min": 10000,
        "max_seats": 1000000, # Effectively unlimited
        "sso": true,
        "advanced_graph": true
    }
}

# Helper to get tenant tier
tenant_tier = tier {
    tier := tenants[input.user.tenantId].tier
} else = "FREE"

# Policy: Check if feature is enabled for tenant
allow {
    input.feature == "sso"
    tiers[tenant_tier].sso
}

allow {
    input.feature == "advanced_graph"
    tiers[tenant_tier].advanced_graph
}

# Policy: Check if usage is within limits
allow {
    input.feature == "api_request"
    current_usage := input.current_usage # Passed from application
    limit := tiers[tenant_tier].max_requests_min
    current_usage < limit
}

allow {
    input.feature == "seat_allocation"
    current_seats := input.current_seats
    limit := tiers[tenant_tier].max_seats
    current_seats < limit
}
