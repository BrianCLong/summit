# Tenant bundle simulation fixture
# Validates cross-tenant denial and overlay override behavior.

package tenant.bundle
import future.keywords.if
import future.keywords.in



default decision := {
    "allow": false,
    "reason": "default_deny"
}

overlay_allows_cross_tenant if {
    some overlay in input.overlays_applied
    overlay.id == "mission-exception"
    overlay.effect == "allow_cross_tenant"
}

decision := {
    "allow": false,
    "reason": "cross_tenant_denied"
} if {
    input.subject_tenant != input.resource_tenant
    not overlay_allows_cross_tenant
}

decision := {
    "allow": true,
    "reason": "overlay_override"
} if overlay_allows_cross_tenant
