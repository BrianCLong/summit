package entitlements

test_core_tier_restrictions {
    not allow with input.user.tenantId as "tenant_core"
              with input.feature as "sso"
              with data.tenants as {"tenant_core": {"tier": "CORE"}}
}

test_pro_tier_allowed {
    allow with input.user.tenantId as "tenant_pro"
          with input.feature as "sso"
          with data.tenants as {"tenant_pro": {"tier": "PRO"}}
}

test_seat_limit_enforcement {
    not allow with input.user.tenantId as "tenant_core"
              with input.feature as "seat_allocation"
              with input.current_seats as 5
              with data.tenants as {"tenant_core": {"tier": "CORE"}}

    allow with input.user.tenantId as "tenant_core"
          with input.feature as "seat_allocation"
          with input.current_seats as 4
          with data.tenants as {"tenant_core": {"tier": "CORE"}}
}
